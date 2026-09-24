import { api } from './client';
import type { Job } from './jobs';
export type PublicCompany = { id: string; name: string; slug: string; description: string | null; website: string | null; industry: string | null; size: string | null; location: string | null; logoUrl: string | null; jobs: Job[] };
export const getCompanyBySlug = (slug: string) => api<PublicCompany>(`/companies/slug/${encodeURIComponent(slug)}`);
