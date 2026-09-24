import { api } from './client.js';

export type Analytics = {
  range: { days: number; since: string };
  totals: { views: number; applications: number; activeJobs: number; conversionRate: number };
  timeline: { day: string; views: number; applications: number }[];
  topJobs: { id: string; title: string; status: string; views: number; applications: number; saved: number }[];
  pipeline: Record<string, number>;
  sources: Record<string, number>;
};

export function fetchCompanyAnalytics(days = 30): Promise<Analytics> {
  return api<Analytics>(`/companies/me/analytics?days=${days}`);
}
