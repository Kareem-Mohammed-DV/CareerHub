import { api, apiEnvelope } from './client';

export type ApplicationStatus =
    | 'SUBMITTED'
    | 'REVIEWING'
    | 'SHORTLISTED'
    | 'INTERVIEW'
    | 'OFFER'
    | 'REJECTED'
    | 'HIRED'
    | 'WITHDRAWN';

export type Application = {
    id: string;
    jobId: string;
    userId: string;
    resumeId?: string | null;
    coverLetter?: string | null;
    status: ApplicationStatus;
    appliedAt: string;
    updatedAt: string;

    job: {
        id: string;
        title: string;
        location?: string | null;

        company: {
            name: string;
            slug: string;
        };
    };
};

export type ApplicationsResponse = {
    data: Application[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
};

export type ApplicationSummary = { total: number; saved: number; byStatus: Partial<Record<ApplicationStatus, number>> };
export const getMyApplicationSummary = () => api<ApplicationSummary>('/applications/me/summary');

export async function getMyApplications(
    page = 1,
    limit = 10
): Promise<ApplicationsResponse> {
    return apiEnvelope<Application[]>(
        `/applications/me?page=${page}&limit=${limit}`
    ).then(({ data, meta }) => ({ data, meta: meta ?? { page, limit, total: data.length, totalPages: 1 } }));
}
