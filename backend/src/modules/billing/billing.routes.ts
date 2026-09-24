import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../../database/prisma.js';
import { authenticate, authorize } from '../../common/auth.middleware.js';
import { asyncHandler } from '../../common/async.js';
import { AppError } from '../../common/errors.js';
import { env } from '../../config/env.js';
import { PLANS, PAID_TIERS, planDef } from './plans.js';
import { sendPaymentConfirmationEmail, sendSubscriptionStartedEmail, sendPaymentFailedEmail } from '../../common/mailer.js';

export const billingRouter = Router();

type CompanyContext = { companyId: string };

async function companyOf(userId: string): Promise<CompanyContext> {
  const company = await prisma.company.findFirst({
    where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
    select: { id: true },
  });
  if (!company) throw new AppError(404, 'Company not found');
  return { companyId: company.id };
}

async function subscriptionOf(companyId: string) {
  const existing = await prisma.subscription.findUnique({ where: { companyId } });
  if (existing) return existing;
  return prisma.subscription.create({ data: { companyId, plan: 'FREE', status: 'ACTIVE' } });
}

function effectivePlan(sub: { plan: 'FREE' | 'GROWTH' | 'SCALE'; status: string; currentPeriodEnd: Date | null }) {
  if (sub.status === 'ACTIVE' && sub.plan !== 'FREE') {
    // A paid plan expires gracefully at period end -> falls back to FREE limits.
    if (!sub.currentPeriodEnd || sub.currentPeriodEnd > new Date()) return sub.plan;
  }
  return 'FREE' as const;
}

/* ---------- Public: plan catalog ---------- */

billingRouter.get('/plans', (_req, res) => {
  res.json({ data: Object.values(PLANS) });
});

/* ---------- Company: my subscription ---------- */

billingRouter.get('/billing/payments', authenticate, authorize('COMPANY'), asyncHandler(async (req, res) => {
  const { companyId } = await companyOf(req.user!.id);
  const sub = await subscriptionOf(companyId);
  const data = await prisma.payment.findMany({ where: { subscriptionId: sub.id }, orderBy: { createdAt: 'desc' }, take: 50 });
  res.json({ data });
}));

billingRouter.get('/billing/subscription', authenticate, authorize('COMPANY'), asyncHandler(async (req, res) => {
  const { companyId } = await companyOf(req.user!.id);
  const sub = await subscriptionOf(companyId);
  const tier = effectivePlan(sub);
  const data = {
    plan: sub.plan,
    effectivePlan: tier,
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd,
    limits: planDef(tier),
  };
  res.json({ data });
}));

/* ---------- Company: Paymob checkout ---------- */

type PaymobAuthResponse = { token: string };
type PaymobOrderResponse = { id: number };
type PaymobPaymentKeyResponse = { payment_key?: string; token?: string };

billingRouter.post('/billing/checkout', authenticate, authorize('COMPANY'), asyncHandler(async (req, res) => {
  const body = z.object({ plan: z.enum(['GROWTH', 'SCALE']) }).parse(req.body);
  const { companyId } = await companyOf(req.user!.id);
  const plan = planDef(body.plan);

  const company = await prisma.company.findUnique({ where: { id: companyId }, include: { owner: { select: { email: true } } } });
  if (!company) throw new AppError(404, 'Company not found');

  await subscriptionOf(companyId);

  // Sandbox / dry-run mode: no Paymob credentials configured.
  const configured = Boolean(env.PAYMOB_API_KEY && env.PAYMOB_INTEGRATION_ID && env.PAYMOB_IFRAME_ID);
  if (!configured) {
    // Dev shortcut: activate immediately for 30 days so the flow is testable end-to-end.
    const sub = await prisma.subscription.update({
      where: { companyId },
      data: { plan: body.plan, status: 'ACTIVE', currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });
    await prisma.payment.create({
      data: { subscriptionId: sub.id, amount: plan.priceEgp, status: 'SUCCEEDED', paymobTransactionId: `dev_${Date.now()}` },
    });
    sendPaymentConfirmationEmail(company.owner.email, plan.name, plan.priceEgp, 'sandbox');
    sendSubscriptionStartedEmail(company.owner.email, plan.name, (sub.currentPeriodEnd ?? new Date()).toISOString());
    return res.json({ data: { mode: 'dev', plan: body.plan, activatedUntil: sub.currentPeriodEnd } });
  }

  try {
    const base = env.PAYMOB_BASE_URL;
    const auth = await fetch(`${base}/api/auth/tokens`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: env.PAYMOB_API_KEY }),
    });
    if (!auth.ok) throw new Error(`auth failed (${auth.status})`);
    const { token } = await auth.json() as PaymobAuthResponse;

    const order = await fetch(`${base}/api/ecommerce/orders`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        delivery_needed: false,
        amount_cents: plan.priceEgp * 100,
        currency: 'EGP',
        merchant_order_id: `${companyId.slice(0, 8)}-${body.plan}-${Date.now()}`,
        items: [{ name: `CareerHub ${plan.name}`, amount_cents: plan.priceEgp * 100, quantity: 1 }],
      }),
    });
    if (!order.ok) throw new Error(`order failed (${order.status})`);
    const orderData = await order.json() as PaymobOrderResponse;

    const key = await fetch(`${base}/api/acceptance/payment_keys`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        source: { identifier: 'INTEGRATION_ID' },
        payment_token: env.PAYMOB_INTEGRATION_ID,
        amount_cents: plan.priceEgp * 100,
        currency: 'EGP',
        order_id: orderData.id,
        billing_data: {
          first_name: company.name.slice(0, 32), last_name: '—', email: company.owner.email,
          phone_number: '+201000000000', country: 'EG', city: 'Cairo', street: '—', building: '—', floor: '—',
          apartment: '—', state: '—', postal_code: '—',
        },
      }),
    });
    if (!key.ok) throw new Error(`payment key failed (${key.status})`);
    const keyData = await key.json() as PaymobPaymentKeyResponse;
    const paymentKey = keyData.payment_key ?? keyData.token;
    if (!paymentKey) throw new Error('no payment key in response');

    await prisma.subscription.update({ where: { companyId }, data: { paymobOrderId: String(orderData.id), plan: body.plan, status: 'PAST_DUE' } });

    return res.json({ data: { mode: 'paymob', iframeUrl: `https://accept.paymob.com/api/acceptance/iframes/${env.PAYMOB_IFRAME_ID}?payment_token=${paymentKey}` } });
  } catch (error) {
    console.error('[billing] paymob checkout failed:', error instanceof Error ? error.message : error);
    throw new AppError(502, 'Payment provider unavailable, try again later');
  }
}));

/* ---------- Paymob webhook (transaction processed callback) ---------- */

// HMAC over the concatenation defined by Paymob docs, using amount_cents etc.
const HMAC_ORDER_FIELDS = [
  'amount_cents', 'created_at', 'currency', 'error_occured', 'has_parent_transaction', 'id',
  'integration_id', 'is_3d_secure', 'is_auth', 'is_capture', 'is_refunded', 'is_standalone_payment',
  'is_voided', 'order.id', 'owner', 'pending', 'source_data.pan', 'source_data.sub_type',
  'source_data.type', 'success',
];

function computeHmac(obj: unknown, keys: string[], secret: string): string {
  const concat = keys.map((key) => {
    let value: unknown = obj;
    for (const part of key.split('.')) {
      value = (value as Record<string, unknown> | null)?.[part];
    }
    // Paymob renders null/undefined as an empty string in the concatenation.
    return value == null ? '' : String(value);
  }).join('');
  return crypto.createHmac('sha512', secret).update(concat).digest('hex');
}

billingRouter.post('/billing/paymob/webhook', asyncHandler(async (req, res) => {
  const body = req.body as { hmac?: string; obj?: Record<string, unknown> };
  const txn = body.obj ?? {};
  // Paymob appends the hmac to the callback URL as a query parameter.
  const providedHmac = (req.query.hmac as string | undefined) ?? body.hmac;
  if (!env.PAYMOB_HMAC_SECRET || !providedHmac) {
    return res.status(400).json({ error: { message: 'Missing HMAC' } });
  }
  const expected = computeHmac(txn, HMAC_ORDER_FIELDS, env.PAYMOB_HMAC_SECRET);
  const provided = String(providedHmac);
  const valid = expected.length === provided.length
    && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  if (!valid) return res.status(403).json({ error: { message: 'Invalid HMAC' } });

  const success = txn.success === true;
  const orderId = String((txn.order as { id?: number } | undefined)?.id ?? '');
  const amountCents = Number(txn.amount_cents ?? 0);
  const transactionId = String(txn.id ?? '');

  const sub = await prisma.subscription.findFirst({ where: { paymobOrderId: orderId }, include: { company: { include: { owner: { select: { email: true } } } } } });
  if (!sub) return res.json({ data: { ignored: true } });
  const planName = PLANS[sub.plan]?.name ?? sub.plan;

  await prisma.payment.create({
    data: {
      subscriptionId: sub.id,
      amount: Math.round(amountCents / 100),
      status: success ? 'SUCCEEDED' : 'FAILED',
      paymobTransactionId: transactionId,
      rawPayload: txn as object,
    },
  });

  if (success) {
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'ACTIVE', currentPeriodEnd: periodEnd },
    });
    sendPaymentConfirmationEmail(sub.company.owner.email, planName, Math.round(amountCents / 100), transactionId || 'paymob');
    sendSubscriptionStartedEmail(sub.company.owner.email, planName, periodEnd.toISOString());
  } else {
    sendPaymentFailedEmail(sub.company.owner.email, planName);
  }

  res.json({ data: { received: true } });
}));

/* ---------- Admin: all payments ---------- */

billingRouter.get('/billing/admin/payments', authenticate, authorize('ADMIN'), asyncHandler(async (req, res) => {
  const [payments, agg] = await Promise.all([
    prisma.payment.findMany({ include: { subscription: { include: { company: { select: { name: true, slug: true } } } } }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.payment.aggregate({ where: { status: 'SUCCEEDED' }, _sum: { amount: true } }),
  ]);
  const data = payments.map((p) => ({ id: p.id, company: p.subscription.company.name, plan: p.subscription.plan, amount: p.amount, currency: p.currency, status: p.status, transactionId: p.paymobTransactionId, createdAt: p.createdAt }));
  res.json({ data, meta: { totalRevenueEgp: agg._sum.amount ?? 0 } });
}));

/* ---------- Company: cancel (downgrade at period end) ---------- */

billingRouter.post('/billing/cancel', authenticate, authorize('COMPANY'), asyncHandler(async (req, res) => {
  const { companyId } = await companyOf(req.user!.id);
  const sub = await subscriptionOf(companyId);
  if (sub.plan === 'FREE') return res.json({ data: { plan: 'FREE', status: sub.status } });
  // Keep paid features until currentPeriodEnd, then effectivePlan() returns FREE.
  await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'CANCELED' } });
  res.json({ data: { plan: sub.plan, status: 'CANCELED', activeUntil: sub.currentPeriodEnd } });
}));

export const BILLING_PAID_TIERS = PAID_TIERS;
