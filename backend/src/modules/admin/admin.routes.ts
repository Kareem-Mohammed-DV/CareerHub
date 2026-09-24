import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma.js';
import { authenticate, authorize } from '../../common/auth.middleware.js';
import { asyncHandler } from '../../common/async.js';
import { AppError } from '../../common/errors.js';
import { pageMeta, paginationSchema } from '../../common/pagination.js';
import { audit } from '../../common/audit.js';
import { PLANS } from '../billing/plans.js';

export const adminRouter = Router();
adminRouter.use(authenticate, authorize('ADMIN'));

function csv(rows: Record<string, unknown>[], columns: [string, string][]): string {
  const escape = (value: unknown): string => {
    const text = value == null ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const header = columns.map(([, label]) => label).join(',');
  const lines = rows.map((row) => columns.map(([key]) => escape(row[key])).join(','));
  return [header, ...lines].join('\n');
}

function csvReply(res: import('express').Response, filename: string, body: string): void {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(body);
}

adminRouter.get('/dashboard', asyncHandler(async (_req, res) => {
  const [users, companies, jobs, applications, pendingCompanies, activeSubscriptions, revenueAgg] = await Promise.all([
    prisma.user.count(),
    prisma.company.count(),
    prisma.job.count(),
    prisma.application.count(),
    prisma.company.count({ where: { verificationStatus: 'PENDING' } }),
    prisma.subscription.count({ where: { status: 'ACTIVE', plan: { not: 'FREE' } } }),
    prisma.payment.aggregate({ where: { status: 'SUCCEEDED' }, _sum: { amount: true } }),
  ]);
  res.json({ data: { users, companies, jobs, applications, pendingCompanies, activeSubscriptions, totalRevenueEgp: revenueAgg._sum.amount ?? 0 } });
}));

adminRouter.get('/users', asyncHandler(async (req, res) => { const { page, limit } = paginationSchema.parse(req.query); const where = req.query.role ? { role: String(req.query.role) as never } : {}; const [data, total] = await prisma.$transaction([prisma.user.findMany({ where, select: { id: true, email: true, role: true, status: true, createdAt: true }, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }), prisma.user.count({ where })]); res.json({ data, meta: pageMeta(page, limit, total) }); }));
adminRouter.get('/users/export', asyncHandler(async (_req, res) => {
  const data = await prisma.user.findMany({ select: { id: true, email: true, role: true, status: true, createdAt: true }, orderBy: { createdAt: 'desc' } });
  csvReply(res, 'careerhub_users.csv', csv(data.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })), [['id', 'ID'], ['email', 'Email'], ['role', 'Role'], ['status', 'Status'], ['createdAt', 'Created at']]));
}));
adminRouter.patch('/users/:id/status', asyncHandler(async (req, res) => {
  const body = z.object({ status: z.enum(['ACTIVE', 'BANNED', 'PENDING_VERIFICATION']) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
  if (!user) throw new AppError(404, 'User not found');
  const data = await prisma.user.update({ where: { id: user.id }, data: body, select: { id: true, email: true, role: true, status: true } });
  await audit(req.user!, 'user.status_changed', `user:${user.id}`, { email: user.email, from: user.status, to: body.status });
  res.json({ data });
}));

adminRouter.get('/companies', asyncHandler(async (req, res) => { const { page, limit } = paginationSchema.parse(req.query); const where = req.query.verificationStatus ? { verificationStatus: String(req.query.verificationStatus) as never } : {}; const [data, total] = await prisma.$transaction([prisma.company.findMany({ where, include: { owner: { select: { email: true } }, _count: { select: { jobs: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }), prisma.company.count({ where })]); res.json({ data, meta: pageMeta(page, limit, total) }); }));
adminRouter.get('/companies/export', asyncHandler(async (_req, res) => {
  const data = await prisma.company.findMany({ include: { owner: { select: { email: true } } }, orderBy: { createdAt: 'desc' } });
  csvReply(res, 'careerhub_companies.csv', csv(data.map((c) => ({ id: c.id, name: c.name, slug: c.slug, owner: c.owner.email, industry: c.industry ?? '', location: c.location ?? '', verificationStatus: c.verificationStatus, createdAt: c.createdAt.toISOString() })), [['id', 'ID'], ['name', 'Company'], ['slug', 'Slug'], ['owner', 'Owner'], ['industry', 'Industry'], ['location', 'Location'], ['verificationStatus', 'Verification'], ['createdAt', 'Created at']]));
}));
adminRouter.patch('/companies/:id/verification', asyncHandler(async (req, res) => {
  const body = z.object({ verificationStatus: z.enum(['PENDING', 'VERIFIED', 'REJECTED']) }).parse(req.body);
  const company = await prisma.company.findUnique({ where: { id: String(req.params.id) } });
  if (!company) throw new AppError(404, 'Company not found');
  const data = await prisma.company.update({ where: { id: company.id }, data: body });
  await audit(req.user!, body.verificationStatus === 'VERIFIED' ? 'company.approved' : body.verificationStatus === 'REJECTED' ? 'company.rejected' : 'company.reset', `company:${company.id}`, { name: company.name, from: company.verificationStatus, to: body.verificationStatus });
  res.json({ data });
}));

adminRouter.get('/jobs', asyncHandler(async (req, res) => { const { page, limit } = paginationSchema.parse(req.query); const [data, total] = await prisma.$transaction([prisma.job.findMany({ include: { company: { select: { name: true, slug: true } }, _count: { select: { applications: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }), prisma.job.count()]); res.json({ data, meta: pageMeta(page, limit, total) }); }));
adminRouter.get('/jobs/export', asyncHandler(async (_req, res) => {
  const data = await prisma.job.findMany({ include: { company: { select: { name: true } }, _count: { select: { applications: true } } }, orderBy: { createdAt: 'desc' } });
  csvReply(res, 'careerhub_jobs.csv', csv(data.map((j) => ({ id: j.id, title: j.title, company: j.company.name, category: j.category, location: j.location ?? '', status: j.status, isFeatured: j.isFeatured, viewCount: j.viewCount, applications: j._count.applications, createdAt: j.createdAt.toISOString() })), [['id', 'ID'], ['title', 'Title'], ['company', 'Company'], ['category', 'Category'], ['location', 'Location'], ['status', 'Status'], ['isFeatured', 'Featured'], ['viewCount', 'Views'], ['applications', 'Applications'], ['createdAt', 'Created at']]));
}));
adminRouter.patch('/jobs/:id/status', asyncHandler(async (req, res) => {
  const body = z.object({ status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED']) }).parse(req.body);
  const current = await prisma.job.findUnique({ where: { id: String(req.params.id) } });
  if (!current) throw new AppError(404, 'Job not found');
  const data = await prisma.job.update({ where: { id: current.id }, data: { status: body.status, publishedAt: body.status === 'PUBLISHED' && !current.publishedAt ? new Date() : undefined } });
  await audit(req.user!, 'job.status_changed', `job:${current.id}`, { title: current.title, from: current.status, to: body.status });
  res.json({ data });
}));

adminRouter.get('/applications', asyncHandler(async (req, res) => { const { page, limit } = paginationSchema.parse(req.query); const [data, total] = await prisma.$transaction([prisma.application.findMany({ include: { user: { select: { id: true, email: true } }, job: { include: { company: { select: { id: true, name: true, slug: true } } } } }, orderBy: { appliedAt: 'desc' }, skip: (page - 1) * limit, take: limit }), prisma.application.count()]); res.json({ data, meta: pageMeta(page, limit, total) }); }));
adminRouter.get('/applications/export', asyncHandler(async (_req, res) => {
  const data = await prisma.application.findMany({ include: { user: { select: { email: true } }, job: { select: { title: true } } }, orderBy: { appliedAt: 'desc' } });
  csvReply(res, 'careerhub_applications.csv', csv(data.map((a) => ({ id: a.id, applicant: a.user.email, job: a.job.title, status: a.status, appliedAt: a.appliedAt.toISOString() })), [['id', 'ID'], ['applicant', 'Applicant'], ['job', 'Job'], ['status', 'Status'], ['appliedAt', 'Applied at']]));
}));
adminRouter.patch('/applications/:id/status', asyncHandler(async (req, res) => {
  const body = z.object({ status: z.enum(['SUBMITTED', 'REVIEWING', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN', 'HIRED']), note: z.string().max(2000).optional() }).parse(req.body);
  const current = await prisma.application.findUnique({ where: { id: String(req.params.id) } });
  if (!current) throw new AppError(404, 'Application not found');
  const data = await prisma.$transaction(async (tx) => {
    const updated = await tx.application.update({ where: { id: current.id }, data: { status: body.status } });
    await tx.applicationStatusHistory.create({ data: { applicationId: current.id, previousStatus: current.status, status: body.status, note: body.note, changedById: req.user!.id } });
    await tx.notification.create({ data: { userId: current.userId, type: 'APPLICATION_STATUS', title: 'Application updated', body: `Your application status is now ${body.status}`, data: { applicationId: current.id } } });
    return updated;
  });
  await audit(req.user!, 'application.status_changed', `application:${current.id}`, { from: current.status, to: body.status });
  res.json({ data });
}));

/* ---------- Revenue & subscriptions ---------- */

adminRouter.get('/payments', asyncHandler(async (_req, res) => {
  const [data, succeeded] = await Promise.all([
    prisma.payment.findMany({ include: { subscription: { include: { company: { select: { name: true, slug: true } } } } }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.payment.aggregate({ where: { status: 'SUCCEEDED' }, _sum: { amount: true }, _count: true }),
  ]);
  res.json({ data: data.map((p) => ({ id: p.id, company: p.subscription.company.name, companySlug: p.subscription.company.slug, plan: p.subscription.plan, amount: p.amount, currency: p.currency, status: p.status, transactionId: p.paymobTransactionId, createdAt: p.createdAt })), meta: { totalRevenueEgp: succeeded._sum.amount ?? 0, successfulPayments: succeeded._count } });
}));

adminRouter.get('/subscriptions', asyncHandler(async (_req, res) => {
  const subs = await prisma.subscription.findMany({ include: { company: { select: { name: true, slug: true } }, payments: { where: { status: 'SUCCEEDED' }, orderBy: { createdAt: 'desc' }, take: 1 } }, orderBy: { updatedAt: 'desc' } });
  const planCounts = { FREE: 0, GROWTH: 0, SCALE: 0 } as Record<string, number>;
  let mrr = 0;
  for (const sub of subs) {
    const effective = sub.status === 'ACTIVE' && sub.plan !== 'FREE' && (!sub.currentPeriodEnd || sub.currentPeriodEnd > new Date()) ? sub.plan : 'FREE';
    planCounts[effective] += 1;
    mrr += PLANS[effective].priceEgp;
  }
  res.json({ data: subs.map((sub) => ({ id: sub.id, company: sub.company.name, companySlug: sub.company.slug, plan: sub.plan, status: sub.status, currentPeriodEnd: sub.currentPeriodEnd, lastPayment: sub.payments[0] ? { amount: sub.payments[0].amount, at: sub.payments[0].createdAt } : null })), meta: { mrrEgp: mrr, planDistribution: planCounts, total: subs.length } });
}));

adminRouter.get('/audit-logs', asyncHandler(async (req, res) => {
  const { page, limit } = paginationSchema.parse(req.query);
  const where = req.query.action ? { action: String(req.query.action) } : {};
  const [data, total] = await prisma.$transaction([
    prisma.auditLog.findMany({ where, include: { actor: { select: { email: true, role: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.auditLog.count({ where }),
  ]);
  res.json({ data: data.map((entry) => ({ id: entry.id, actor: entry.actor.email, role: entry.actor.role, action: entry.action, target: entry.target, metadata: entry.metadata, createdAt: entry.createdAt })), meta: pageMeta(page, limit, total) });
}));

adminRouter.get('/revenue/timeline', asyncHandler(async (_req, res) => {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const rows = await prisma.$queryRaw<{ month: Date; revenue: bigint; payments: bigint }[]>`
    SELECT date_trunc('month', created_at) AS month,
           COALESCE(SUM(amount), 0)::bigint AS revenue,
           COUNT(*)::bigint AS payments
    FROM payments
    WHERE status = 'SUCCEEDED' AND created_at >= ${since}
    GROUP BY 1
    ORDER BY 1;`;
  res.json({ data: rows.map((row) => ({ month: row.month.toISOString().slice(0, 7), revenue: Number(row.revenue), payments: Number(row.payments) })) });
}));
