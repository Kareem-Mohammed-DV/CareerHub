import { api } from './client.js';

export type PlanTier = 'FREE' | 'GROWTH' | 'SCALE';

export type PlanDefinition = {
  tier: PlanTier;
  name: string;
  priceEgp: number;
  maxActiveJobs: number;
  maxApplicationsPerMonth: number;
  featured: boolean;
  analytics: boolean;
  support: string;
  tagline: string;
  features: string[];
};

export type Subscription = {
  plan: PlanTier;
  effectivePlan: PlanTier;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  currentPeriodEnd: string | null;
  limits: PlanDefinition;
};

export type CheckoutResult =
  | { mode: 'dev'; plan: PlanTier; activatedUntil: string | null }
  | { mode: 'paymob'; iframeUrl: string };

export function fetchPlans(): Promise<PlanDefinition[]> {
  return api<PlanDefinition[]>('/plans');
}

export function fetchSubscription(): Promise<Subscription> {
  return api<Subscription>('/billing/subscription');
}

export function startCheckout(plan: PlanTier): Promise<CheckoutResult> {
  return api<CheckoutResult>('/billing/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }) });
}

export function cancelSubscription(): Promise<{ plan: PlanTier; status: string; activeUntil?: string | null }> {
  return api<{ plan: PlanTier; status: string; activeUntil?: string | null }>('/billing/cancel', { method: 'POST' });
}
