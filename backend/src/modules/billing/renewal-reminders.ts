/**
 * Renewal reminders: run shortly after each day starts. Emails companies whose
 * paid subscription expires within 3 days (once per day). Uses the mailer,
 * which is a no-op when SMTP is not configured.
 */
import { prisma } from '../../database/prisma.js';
import { sendRenewalReminderEmail } from '../../common/mailer.js';

let lastRunDay = '';

export async function runRenewalReminders(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  if (lastRunDay === today) return;
  lastRunDay = today;

  try {
    const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const subs = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        plan: { not: 'FREE' },
        currentPeriodEnd: { not: null, lte: inThreeDays, gt: new Date() },
      },
      include: { company: { include: { owner: { select: { email: true } } } } },
    });
    for (const sub of subs) {
      if (!sub.currentPeriodEnd) continue;
      sendRenewalReminderEmail(sub.company.owner.email, sub.plan, sub.currentPeriodEnd.toISOString());
    }
    if (subs.length > 0) console.log(`[billing] sent ${subs.length} renewal reminder(s)`);
  } catch (error) {
    console.error('[billing] renewal reminders failed:', error instanceof Error ? error.message : error);
  }
}
