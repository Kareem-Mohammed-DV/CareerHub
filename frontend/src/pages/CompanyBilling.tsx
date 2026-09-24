import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { fetchSubscription, startCheckout, cancelSubscription, type PlanTier, type Subscription, type PlanDefinition } from '../api/billing.js';
import { usePageTitle } from '../hooks/usePageTitle';

type JobRow = { id: string; status: string };

const TIER_ACCENT: Record<PlanTier, string> = { FREE: '#64748b', GROWTH: '#2e6ef2', SCALE: '#10b981' };

function fmtDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CompanyBilling() {
    usePageTitle("Billing");
  const [sub, setSub] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<{ id: string; amount: number; status: string; createdAt: string; paymobTransactionId: string | null }[]>([]);
  const [activeJobs, setActiveJobs] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscription().then(setSub).catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
    api<{ id: string; amount: number; status: string; createdAt: string; paymobTransactionId: string | null }[]>('/billing/payments').then(setPayments).catch(() => undefined);
    api<JobRow[]>('/companies/me/jobs').then((jobs) => setActiveJobs(jobs.filter((j) => j.status === 'PUBLISHED' || j.status === 'DRAFT').length)).catch(() => undefined);
  }, []);

  const upgrade = async (tier: PlanTier) => {
    setBusy(tier);
    setError(null);
    try {
      const result = await startCheckout(tier);
      if (result.mode === 'paymob') { window.location.href = result.iframeUrl; return; }
      setSub(await fetchSubscription());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed.');
    } finally { setBusy(null); }
  };

  const cancel = async () => {
    setBusy('cancel');
    try {
      await cancelSubscription();
      setSub(await fetchSubscription());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cancel failed.');
    } finally { setBusy(null); }
  };

  const limits: PlanDefinition | undefined = sub?.limits;
  const pct = limits ? Math.min(100, Math.round((activeJobs / limits.maxActiveJobs) * 100)) : 0;

  return (
    <main className="billing-page">
      <header className="pricing-head">
        <p className="eyebrow">BILLING</p>
        <h1>Plan &amp; billing</h1>
        <p className="pricing-sub">Manage your subscription, track usage, and review payments.</p>
      </header>

      {error ? <p className="empty-note" style={{ textAlign: 'center' }}>{error}</p> : null}

      <section className="billing-panel">
        <div className="billing-current">
          <div>
            <div className="stat-label">Current plan</div>
            <div className="billing-plan-name" style={{ color: sub ? TIER_ACCENT[sub.effectivePlan] : undefined }}>
              {sub?.limits.name ?? '…'}
            </div>
            {sub && sub.effectivePlan !== 'FREE' ? (
              <p className="billing-renews">Renews {fmtDate(sub.currentPeriodEnd)}{sub.status === 'CANCELED' ? ' · canceled, active until then' : ''}</p>
            ) : <p className="billing-renews">Free forever</p>}
          </div>
          <div className="billing-actions">
            {sub?.effectivePlan !== 'SCALE' ? (
              <button type="button" className="primary-button" onClick={() => upgrade('SCALE')} disabled={busy !== null}>
                {busy === 'SCALE' ? 'Redirecting…' : 'Upgrade to Scale'}
              </button>
            ) : null}
            {sub?.effectivePlan === 'FREE' ? (
              <button type="button" className="secondary-button" onClick={() => upgrade('GROWTH')} disabled={busy !== null}>
                {busy === 'GROWTH' ? 'Redirecting…' : 'Upgrade to Growth'}
              </button>
            ) : null}
            {sub && sub.effectivePlan !== 'FREE' && sub.status !== 'CANCELED' ? (
              <button type="button" className="secondary-button" onClick={cancel} disabled={busy !== null}>
                {busy === 'cancel' ? 'Canceling…' : 'Cancel plan'}
              </button>
            ) : null}
            <Link className="text-link" to="/pricing">Compare plans →</Link>
          </div>
        </div>

        {limits ? (
          <div className="billing-usage">
            <div className="stat-label">Active jobs — {activeJobs} of {limits.maxActiveJobs}</div>
            <div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
            <p className="billing-renews">Applicant limit: {limits.maxApplicationsPerMonth}/month · {limits.support}</p>
          </div>
        ) : null}
      </section>

      <section className="billing-panel">
        <h2>Payment history</h2>
        {payments.length === 0 ? (
          <p className="empty-note">No payments yet — you are on the free plan.</p>
        ) : (
          <div className="analytics-table-wrap">
            <table className="analytics-table">
              <thead><tr><th>Date</th><th>Amount</th><th>Status</th><th>Transaction</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{fmtDate(p.createdAt)}</td>
                    <td>{p.amount.toLocaleString()} EGP</td>
                    <td>{p.status}</td>
                    <td className="cell-title">{p.paymobTransactionId ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
