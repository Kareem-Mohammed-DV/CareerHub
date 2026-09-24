import { api } from './client';

export type Job = {
    id: string;
    title: string;
    description: string;
    requirements?: string | null;
    category: string;
    location?: string | null;

    employmentType:
    | 'FULL_TIME'
    | 'PART_TIME'
    | 'CONTRACT'
    | 'INTERNSHIP'
    | 'FREELANCE';

    workplaceType:
    | 'ONSITE'
    | 'HYBRID'
    | 'REMOTE';

    experienceLevel:
    | 'ENTRY'
    | 'JUNIOR'
    | 'MID'
    | 'SENIOR'
    | 'LEAD'
    | 'EXECUTIVE';

    salaryMin?: number | null;
    salaryMax?: number | null;
    currency: string;

    status: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';

    isFeatured?: boolean;

    publishedAt?: string | null;

    company: {
        name: string;
        slug: string;
        logoUrl?: string | null;
    };
};

export type JobsResponse = {
    data: Job[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
};

export async function getJobs(
    params: {
        q?: string;
        category?: string;
        location?: string;
        experienceLevel?: string;
        salaryMin?: string;
        page?: number;
        limit?: number;
    } = {}
): Promise<JobsResponse> {
    const searchParams = new URLSearchParams();

    if (params.q) {
        searchParams.set('q', params.q);
    }

    if (params.category) {
        searchParams.set('category', params.category);
    }

    if (params.location) {
        searchParams.set('location', params.location);
    }

    if (params.experienceLevel) {
        searchParams.set(
            'experienceLevel',
            params.experienceLevel
        );
    }

    if (params.salaryMin) {
        searchParams.set(
            'salaryMin',
            params.salaryMin
        );
    }

    searchParams.set(
        'page',
        String(params.page ?? 1)
    );

    searchParams.set(
        'limit',
        String(params.limit ?? 12)
    );

    const query = searchParams.toString();

    const API_URL =
        import.meta.env.VITE_API_URL ??
        'http://localhost:4000/api/v1';

    const response = await fetch(
        `${API_URL}/jobs?${query}`,
        {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
        }
    );

    const body = await response.json();

    if (!response.ok) {
        throw new Error(
            body.error?.message ?? 'Failed to load jobs'
        );
    }

    return body as JobsResponse;
}

export async function getJob(id: string): Promise<Job> {
    return api<Job>(`/jobs/${id}`);
}
export type CreateJobInput = {
    title: string;
    description: string;
    requirements?: string;
    category: string;
    location?: string;
    employmentType:
    | 'FULL_TIME'
    | 'PART_TIME'
    | 'CONTRACT'
    | 'INTERNSHIP'
    | 'FREELANCE';
    workplaceType:
    | 'ONSITE'
    | 'HYBRID'
    | 'REMOTE';
    experienceLevel:
    | 'ENTRY'
    | 'JUNIOR'
    | 'MID'
    | 'SENIOR'
    | 'LEAD'
    | 'EXECUTIVE';
    salaryMin?: number;
    salaryMax?: number;
    currency: string;
    status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
};

export async function createJob(
    data: CreateJobInput
): Promise<Job> {
    return api<Job>('/jobs', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateJob(id: string, data: Partial<CreateJobInput>): Promise<Job> {
    return api<Job>(`/jobs/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export type ManagedJob = Job & { _count: { applications: number }; _pipeline: Record<string, number>; createdAt: string };
export const getMyCompanyJobs = () => api<ManagedJob[]>('/companies/me/jobs');
export type ApplyJobInput = {
    resumeId?: string;
    coverLetter?: string;
};

export async function applyToJob(
    jobId: string,
    data: ApplyJobInput = {}
) {
    return api(`/jobs/${jobId}/applications`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}
