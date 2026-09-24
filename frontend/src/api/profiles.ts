import { api } from './client';

export type JobSeekerProfile = {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    headline?: string | null;
    bio?: string | null;
    phone?: string | null;
    location?: string | null;
    yearsOfExperience?: number | null;
    skills?: string[] | null;
    experience?: unknown[] | null;
    education?: unknown[] | null;
    createdAt?: string;
    updatedAt?: string;
};

export async function getMyProfile(): Promise<JobSeekerProfile | null> {
    return api<JobSeekerProfile | null>('/profile');
}

export async function updateMyProfile(
    data: Partial<JobSeekerProfile>
): Promise<JobSeekerProfile> {
    return api<JobSeekerProfile>('/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}