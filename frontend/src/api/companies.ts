import { api } from './client';

export type Company = {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    website?: string | null;
    industry?: string | null;
    size?: string | null;
    location?: string | null;
    logoUrl?: string | null;
    ownerId: string;
};

export async function getMyCompany(): Promise<Company | null> {
    return api<Company | null>('/companies/me');
}

export async function createCompany(
    data: {
        name: string;
        slug: string;
        description?: string;
        website?: string;
        industry?: string;
        size?: string;
        location?: string;
        logoUrl?: string;
    }
): Promise<Company> {
    return api<Company>('/companies', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateMyCompany(
    data: Partial<{
        name: string;
        slug: string;
        description: string;
        website: string;
        industry: string;
        size: string;
        location: string;
        logoUrl: string;
    }>
): Promise<Company> {
    return api<Company>('/companies/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}