import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

/**
 * Email is best-effort: if SMTP is not configured the helpers below become
 * no-ops and failures are logged without ever throwing into request handlers.
 */

const from = env.MAIL_FROM ?? 'CareerHub <no-reply@careerhub.local>';
/** Base URL of the web app — set WEB_URL (or WEB_ORIGIN) in .env; never hardcode hosts. */
const webUrl = (env.WEB_URL ?? env.WEB_ORIGIN).replace(/\/+$/, '');

type MailTransporter = ReturnType<typeof nodemailer.createTransport>;

let transporter: MailTransporter | null = null;

function getTransporter(): MailTransporter | null {
  if (!env.SMTP_HOST || !env.SMTP_PORT) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      requireTLS: false,
      ignoreTLS: env.SMTP_PORT !== 465 && !env.SMTP_SECURE,
      auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

export function mailerConfigured(): boolean {
  return getTransporter() !== null;
}

type MailInput = { to: string; subject: string; html: string; text: string };

function send(mail: MailInput): void {
  const tx = getTransporter();
  if (!tx) return;
  void tx.sendMail({ from, to: mail.to, subject: mail.subject, html: mail.html, text: mail.text }).catch((error: unknown) => {
    console.error('[mailer] failed to deliver email:', error instanceof Error ? error.message : error);
  });
}

/* ---- Shared template (light theme: calm blue + mint on soft slate) ---- */

function layout(title: string, bodyHtml: string): { html: string; text: string } {
  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f6f8fb;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8fb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid rgba(15,23,42,0.08);border-radius:18px;box-shadow:0 12px 32px rgba(15,23,42,0.06);">
        <tr><td style="padding:28px 32px 0;">
          <span style="font-weight:800;letter-spacing:0.12em;font-size:15px;color:#0f172a;">CAREER<span style="color:#2e6ef2;">HUB</span></span>
        </td></tr>
        <tr><td style="padding:20px 32px 8px;">
          <h1 style="margin:0 0 10px;font-size:22px;letter-spacing:-0.01em;color:#0f172a;">${escapeHtml(title)}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:8px 32px 28px;">
          <p style="margin:0;font-size:12.5px;line-height:1.7;color:#94a3b8;">
            You received this email because of activity on your CareerHub account.
            If you were not expecting it, you can safely ignore this message.
          </p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} CareerHub — created by Kareem Mohamed Bakr</p>
    </td></tr>
  </table>
</body>
</html>`;
  return { html, text: `${title}\n\n${stripTags(bodyHtml)}\n\n— CareerHub` };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function button(url: string, label: string): string {
  return `<a href="${escapeHtml(url)}" style="display:inline-block;margin:18px 0 6px;padding:12px 26px;background:#2e6ef2;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:600;font-size:14px;">${escapeHtml(label)}</a>`;
}

function highlight(text: string, color = '#2e6ef2'): string {
  return `<span style="color:${color};font-weight:700;">${escapeHtml(text)}</span>`;
}

/* ---- The three transactional emails ---- */

export function sendWelcomeEmail(to: string, role: 'JOB_SEEKER' | 'COMPANY'): void {
  const isCompany = role === 'COMPANY';
  const title = isCompany ? 'Welcome to CareerHub' : 'Your career journey starts here';
  const body = isCompany
    ? `<p style="margin:0 0 10px;font-size:15px;line-height:1.7;color:#334155;">Your company account is ready. Publish your first role, and we will deliver candidates straight to your ${highlight('hiring dashboard')}.</p>`
    : `<p style="margin:0 0 10px;font-size:15px;line-height:1.7;color:#334155;">Your account is ready. Complete your profile and apply to roles with ${highlight('one click')} — we will track every application for you.</p>`;
  const mail = layout(title, `${body}${button(`${webUrl}/login`, 'Sign in to CareerHub')}`);
  send({ to, subject: title, ...mail });
}

export function sendNewApplicationEmail(to: string, candidateEmail: string, jobTitle: string): void {
  const title = 'New application received';
  const body = `<p style="margin:0 0 10px;font-size:15px;line-height:1.7;color:#334155;">${highlight(candidateEmail)} just applied for ${highlight(jobTitle, '#10b981')}. Review the candidate and move them through your pipeline.</p>`;
  const mail = layout(title, `${body}${button(`${webUrl}/company/applicants`, 'Open Applicants')}`);
  send({ to, subject: `${candidateEmail} applied for ${jobTitle}`, ...mail });
}

export function sendApplicationStatusEmail(to: string, jobTitle: string, status: string, note?: string): void {
  const title = 'Your application status changed';
  const positive = status === 'HIRED' || status === 'OFFER' || status === 'INTERVIEW' || status === 'SHORTLISTED';
  const color = status === 'REJECTED' ? '#e11d48' : positive ? '#10b981' : '#2e6ef2';
  const noteHtml = note ? `<div style="margin:14px 0 4px;padding:14px 18px;background:#eef2f8;border-left:3px solid ${color};border-radius:10px;font-size:14px;line-height:1.7;color:#334155;">${escapeHtml(note)}</div>` : '';
  const body = `<p style="margin:0 0 6px;font-size:15px;line-height:1.7;color:#334155;">Your application for ${highlight(jobTitle)} is now ${highlight(status, color)}.</p>${noteHtml}`;
  const mail = layout(title, `${body}${button(`${webUrl}/applications`, 'View my applications')}`);
  send({ to, subject: `Update on your application: ${jobTitle}`, ...mail });
}

/* ---- Billing & subscription emails ---- */

export function sendPaymentConfirmationEmail(to: string, planName: string, amountEgp: number, transactionId: string): void {
  const title = 'Payment confirmed';
  const body = `<p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#334155;">We received your payment of ${highlight(`${amountEgp} EGP`)} for the ${highlight(planName)} plan.</p>
    <p style="margin:0;font-size:14px;line-height:1.7;color:#64748b;">Transaction reference: <code style="font-size:13px;color:#0f172a;">${escapeHtml(transactionId)}</code><br/>Your subscription is active for the next 30 days.</p>`;
  const mail = layout(title, `${body}${button(`${webUrl}/company/billing`, 'Open billing')}`);
  send({ to, subject: `Payment confirmed — CareerHub ${planName}`, ...mail });
}

export function sendSubscriptionStartedEmail(to: string, planName: string, untilIso: string): void {
  const title = 'Your subscription is active';
  const body = `<p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#334155;">Welcome to ${highlight(planName)}! Your plan is active until ${highlight(new Date(untilIso).toLocaleDateString())}.</p>
    <p style="margin:0;font-size:14px;line-height:1.7;color:#64748b;">You can manage or cancel anytime from your billing page — paid features stay on until the period ends.</p>`;
  const mail = layout(title, `${body}${button(`${webUrl}/company/billing`, 'Manage subscription')}`);
  send({ to, subject: `CareerHub ${planName} subscription activated`, ...mail });
}

export function sendPaymentFailedEmail(to: string, planName: string): void {
  const title = 'Payment failed';
  const body = `<p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#334155;">Your payment for the ${highlight(planName)} plan could not be processed, so the upgrade was not applied.</p>
    <p style="margin:0;font-size:14px;line-height:1.7;color:#64748b;">No charge was made. You can retry the upgrade whenever you are ready.</p>`;
  const mail = layout(title, `${body}${button(`${webUrl}/pricing`, 'Retry upgrade')}`);
  send({ to, subject: `Payment failed — CareerHub ${planName}`, ...mail });
}

export function sendRenewalReminderEmail(to: string, planName: string, untilIso: string): void {
  const title = 'Your subscription renews soon';
  const days = Math.max(0, Math.ceil((new Date(untilIso).getTime() - Date.now()) / 86400000));
  const body = `<p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#334155;">Your ${highlight(planName)} plan expires in ${highlight(`${days} day${days === 1 ? '' : 's'}`)} (${new Date(untilIso).toLocaleDateString()}).</p>
    <p style="margin:0;font-size:14px;line-height:1.7;color:#64748b;">Renew to keep your higher job limits and analytics. If it lapses, your account gracefully returns to the Free plan.</p>`;
  const mail = layout(title, `${body}${button(`${webUrl}/company/billing`, 'Renew now')}`);
  send({ to, subject: `CareerHub ${planName} — ${days} day${days === 1 ? '' : 's'} left`, ...mail });
}

export function sendNewMatchingJobsEmail(to: string, jobTitle: string): void {
  const title = 'A new job matches your alert';
  const body = `<p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#334155;">A role was just published that matches one of your job alerts: ${highlight(jobTitle)}.</p>
    <p style="margin:0;font-size:14px;line-height:1.7;color:#64748b;">Apply early — new roles receive the most attention in their first days.</p>`;
  const mail = layout(title, `${body}${button(`${webUrl}/jobs`, 'View open roles')}`);
  send({ to, subject: `New matching job: ${jobTitle}`, ...mail });
}
