import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchPlans, fetchSubscription, startCheckout, cancelSubscription, type PlanDefinition, type PlanTier, type Subscription } from '../api/billing.js';
import { useAuth } from '../auth/AuthContext.js';
import { usePageTitle } from '../hooks/usePageTitle';

const TIER_ORDER: PlanTier[] = ['FREE', 'GROWTH', 'SCALE'];
const TIER_ACCENT: Record<PlanTier, string> = { FREE: '#64748b', GROWTH: '#2e6ef2', SCALE: '#10b981' };

export default function Pricing() {
    usePageTitle("Pricing");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [busy, setBusy] = useState<PlanTier | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCompany = user?.role === 'COMPANY';

  useEffect(() => {
    fetchPlans().then(setPlans).catch(() => setError('Could not load plans.'));
    if (isCompany) fetchSubscription().then(setSub).catch(() => undefined);
  }, [isCompany]);

  const currentTier = sub?.effectivePlan ?? null;

  const choose = async (tier: PlanTier) => {
    if (!user) return navigate('/login', { state: { from: '/pricing' } });
    if (!isCompany) return navigate('/forbidden');
    if (tier === currentTier || tier === 'FREE') return;
    setBusy(tier);
    setError(null);
    try {
      const result = await startCheckout(tier);
      if (result.mode === 'paymob') {
        window.location.href = result.iframeUrl;
        return;
      }
      // Dev mode: activated immediately.
      setSub(await fetchSubscription());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed.');
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    setBusy(currentTier);
    try {
      await cancelSubscription();
      setSub(await fetchSubscription());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cancel failed.');
    } finally {
      setBusy(null);
    }
  };

  const cards = useMemo(() => TIER_ORDER.map((tier) => plans.find((p) => p.tier === tier)).filter((p): p is PlanDefinition => Boolean(p)), [plans]);
  const list = cards.length > 0 ? cards : Object.values(TIER_ORDER).map((tier) => ({ tier, name: tier, priceEgp: tier === 'FREE' ? 0 : tier === 'GROWTH' ? 750 : 2000, maxActiveJobs: 0, maxApplicationsPerMonth: 0, featured: false, analytics: false, support: '', tagline: '', features: [] as string[] }));

  return (
    <main className="pricing-page">
      <header className="pricing-head">
        <p className="eyebrow">PRICING</p>
        <h1>Simple plans that scale with your hiring.</h1>
        <p className="pricing-sub">Start free. Upgrade when you need more roles, better reach, and real analytics.</p>
      </header>

      {error ? <p className="empty-note" style={{ textAlign: 'center' }}>{error}</p> : null}

      <section className="pricing-grid">
        {list.map((plan) => {
          const isCurrent = currentTier === plan.tier;
          const accent = TIER_ACCENT[plan.tier];
          return (
            <article key={plan.tier} className={`pricing-card${plan.tier === 'GROWTH' ? ' featured-card' : ''}${isCurrent ? ' current-card' : ''}`}>
              {plan.tier === 'GROWTH' ? <span className="pricing-badge">Most popular</span> : null}
              {isCurrent ? <span className="pricing-badge current-badge">Your plan</span> : null}
              <h2 style={{ color: accent }}>{plan.name}</h2>
              <div className="pricing-price">
                {plan.priceEgp === 0 ? 'Free' : <>{plan.priceEgp.toLocaleString()} <small>EGP/mo</small></>}
              </div>
              <p className="pricing-tagline">{plan.tagline}</p>
              <ul className="pricing-features">
                {(plan.features.length > 0 ? plan.features : [`${plan.maxActiveJobs} active jobs`, `${plan.maxApplicationsPerMonth} applicants/month`]).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {isCompany ? (
                isCurrent && plan.tier !== 'FREE' ? (
                  <button type="button" className="secondary-button" onClick={cancel} disabled={busy !== null}>Cancel plan</button>
                ) : (
                  <button type="button" className="primary-button" disabled={busy !== null || isCurrent || plan.tier === 'FREE'} onClick={() => choose(plan.tier)}>
                    {busy === plan.tier ? 'Redirecting…' : plan.tier === 'FREE' ? 'Included' : `Upgrade to ${plan.name}`}
                  </button>
                )
              ) : (
                <Link className="primary-button" to={user ? '/company/dashboard' : '/register'}>{user ? 'Go to dashboard' : 'Create company account'}</Link>
              )}
            </article>
          );
        })}
      </section>

      <p className="pricing-note">Payments are processed securely by <strong>Paymob</strong>. Cancel anytime — you keep your plan until the end of the billing period.</p>
    </main>
  );
}
