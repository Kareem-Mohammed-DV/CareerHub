import type { PlanTier } from '@prisma/client';

export type PlanDefinition = {
  tier: PlanTier;
  name: string;
  priceEgp: number;
  /** Max concurrently PUBLISHED jobs. */
  maxActiveJobs: number;
  /** Max applications received per month across all jobs (soft metering). */
  maxApplicationsPerMonth: number;
  featured: boolean;
  analytics: boolean;
  support: string;
  tagline: string;
  features: string[];
};

export const PLANS: Record<PlanTier, PlanDefinition> = {
  FREE: {
    tier: 'FREE',
    name: 'Free',
    priceEgp: 0,
    maxActiveJobs: 1,
    maxApplicationsPerMonth: 25,
    featured: false,
    analytics: false,
    support: 'Community',
    tagline: 'Get started — one active role at a time.',
    features: ['1 active job', 'Up to 25 applicants/month', 'Basic company profile', 'Candidate messaging'],
  },
  GROWTH: {
    tier: 'GROWTH',
    name: 'Growth',
    priceEgp: 750,
    maxActiveJobs: 10,
    maxApplicationsPerMonth: 250,
    featured: true,
    analytics: true,
    support: 'Priority email',
    tagline: 'For teams hiring continuously.',
    features: ['10 active jobs', 'Up to 250 applicants/month', 'Search boost', 'Hiring analytics', 'Priority support'],
  },
  SCALE: {
    tier: 'SCALE',
    name: 'Scale',
    priceEgp: 2000,
    maxActiveJobs: 100,
    maxApplicationsPerMonth: 2_000,
    featured: true,
    analytics: true,
    support: 'Dedicated manager',
    tagline: 'Unlimited ambition for larger orgs.',
    features: ['100 active jobs', 'Up to 2,000 applicants/month', 'Highest search boost', 'Full analytics', 'Dedicated account manager'],
  },
};

export const PAID_TIERS: PlanTier[] = ['GROWTH', 'SCALE'];

export function planDef(tier: PlanTier): PlanDefinition {
  return PLANS[tier];
}
