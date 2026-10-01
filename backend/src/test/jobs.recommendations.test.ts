import './helpers/test-env.js';

import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import jwt from 'jsonwebtoken';

import { app } from '../app.js';
import { env } from '../config/env.js';
import { prisma } from '../database/prisma.js';

const marker = `chrec${Date.now()}`;
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);

let server: Server;
let baseUrl: string;
let companyId = '';
let ownerId = '';
let seekerId = '';
let seekerToken = '';
let companyToken = '';

const jobs: Record<'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'D1' | 'E1', string> = {
  A1: '', A2: '', B1: '', B2: '', C1: '', D1: '', E1: '',
};

type JobCard = { id: string; status: string; isFeatured?: boolean };
type MeResponse = { data: JobCard[]; meta: { reason?: string } };

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function getMe(query: string, token?: string): Promise<{ status: number; body: MeResponse | null }> {
  const response = await fetch(`${baseUrl}/job-recommendations/me${query}`, { headers: authHeaders(token) });
  return { status: response.status, body: response.status === 204 ? null : await response.json() as MeResponse };
}

async function applyToJob(jobId: string): Promise<number> {
  const response = await fetch(`${baseUrl}/jobs/${jobId}/applications`, {
    method: 'POST',
    headers: { ...authHeaders(seekerToken), 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  return response.status;
}

async function saveJob(jobId: string): Promise<number> {
  const response = await fetch(`${baseUrl}/jobs/${jobId}/saved`, { method: 'POST', headers: authHeaders(seekerToken) });
  return response.status;
}

async function seedJob(
  key: keyof typeof jobs,
  options: { category: string; title: string; publishedAt: Date; location?: string | null; isFeatured?: boolean },
): Promise<void> {
  const job = await prisma.job.create({
    data: {
      companyId,
      title: options.title,
      description: `${marker} automated fixture role used by the recommendations integration tests.`,
      category: options.category,
      location: options.location ?? null,
      employmentType: 'FULL_TIME',
      workplaceType: options.location ? 'ONSITE' : 'REMOTE',
      experienceLevel: 'MID',
      status: 'PUBLISHED',
      isFeatured: options.isFeatured ?? false,
      publishedAt: options.publishedAt,
    },
  });
  jobs[key] = job.id;
}

before(async () => {
  server = app.listen(0);
  await new Promise<void>((resolve) => { server.once('listening', () => resolve()); });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;

  const owner = await prisma.user.create({
    data: {
      email: `${marker}-owner@test.careerhub.dev`,
      passwordHash: 'test-only-not-a-real-hash',
      role: 'COMPANY',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      ownedCompanies: { create: { name: `RecCo ${marker}`, slug: marker, verificationStatus: 'VERIFIED' } },
    },
  });
  ownerId = owner.id;
  companyId = (await prisma.company.findUniqueOrThrow({ where: { slug: marker } })).id;

  const seeker = await prisma.user.create({
    data: {
      email: `${marker}-seeker@test.careerhub.dev`,
      passwordHash: 'test-only-not-a-real-hash',
      role: 'JOB_SEEKER',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      profile: { create: { firstName: 'Test', lastName: 'Seeker', location: 'Cairo, Egypt', skills: ['Orbit'] } },
    },
  });
  seekerId = seeker.id;

  seekerToken = jwt.sign({ sub: seekerId, role: 'JOB_SEEKER' }, env.JWT_ACCESS_SECRET);
  companyToken = jwt.sign({ sub: ownerId, role: 'COMPANY' }, env.JWT_ACCESS_SECRET);

  await seedJob('A1', { category: `${marker}-x`, title: `${marker} Orbit Backend Engineer`, publishedAt: minutesAgo(60), isFeatured: true });
  await seedJob('A2', { category: `${marker}-x`, title: `${marker} Orbit Frontend Engineer`, publishedAt: minutesAgo(50) });
  await seedJob('B1', { category: `${marker}-y`, title: `${marker} Data Analyst`, publishedAt: minutesAgo(40) });
  await seedJob('B2', { category: `${marker}-y`, title: `${marker} Data Analyst II`, publishedAt: minutesAgo(30) });
  await seedJob('C1', { category: `${marker}-z`, title: `${marker} Orbit Platform Engineer`, publishedAt: minutesAgo(20), location: 'Cairo, Egypt' });
  await seedJob('D1', { category: `${marker}-w`, title: `${marker} Sales Lead`, publishedAt: minutesAgo(10), location: 'Cairo, Egypt' });
  await seedJob('E1', { category: `${marker}-v`, title: `${marker} Mystery Role`, publishedAt: minutesAgo(5) });
});

after(async () => {
  await prisma.savedJob.deleteMany({ where: { userId: seekerId } });
  await prisma.application.deleteMany({ where: { userId: seekerId } });
  await prisma.job.deleteMany({ where: { companyId } });
  await prisma.company.deleteMany({ where: { id: companyId } });
  await prisma.user.deleteMany({ where: { id: { in: [ownerId, seekerId].filter(Boolean) } } });
  await prisma.$disconnect();
  server.close();
});

describe('job recommendations module', () => {
  it('requires authentication for /me', async () => {
    const { status } = await getMe('');
    assert.equal(status, 401);
  });

  it('rejects non-seeker roles for /me', async () => {
    const { status } = await getMe('', companyToken);
    assert.equal(status, 403);
  });

  it('recommends from profile skills and location signals', async () => {
    // High limit: the database is shared (dev data can also match signals),
    // so assert that all four seeded signal jobs surface rather than exact equality.
    const { status, body } = await getMe('?limit=10', seekerToken);
    assert.equal(status, 200);
    assert.ok(body);
    const ids = body.data.map((job) => job.id);
    for (const expected of [jobs.A1, jobs.A2, jobs.C1, jobs.D1]) {
      assert.ok(ids.includes(expected), `signal job ${expected} must be recommended`);
    }
    assert.ok(body.meta.reason);
    for (const job of body.data) assert.equal(job.status, 'PUBLISHED');
  });

  it('uses applied categories as a signal and never recommends applied jobs', async () => {
    assert.equal(await applyToJob(jobs.B1), 201);
    const { body } = await getMe('?limit=6', seekerToken);
    assert.ok(body);
    const ids = body.data.map((job) => job.id);
    assert.ok(!ids.includes(jobs.B1), 'applied job must be excluded');
    assert.ok(ids.includes(jobs.B2), 'sibling of applied job must be recommended');
  });

  it('uses saved jobs as a signal and never recommends saved jobs', async () => {
    assert.equal(await saveJob(jobs.A2), 204);
    const { body } = await getMe('?limit=6', seekerToken);
    assert.ok(body);
    const ids = body.data.map((job) => job.id);
    assert.ok(!ids.includes(jobs.A2), 'saved job must be excluded');
    assert.ok(ids.includes(jobs.A1), 'sibling of saved job must be recommended');
  });

  it('puts the featured match first under a tight limit', async () => {
    const { body } = await getMe('?limit=1', seekerToken);
    assert.ok(body);
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].id, jobs.A1);
    assert.equal(body.data[0].isFeatured, true);
  });

  it('tops up with the newest published jobs so the shelf is never empty', async () => {
    for (const jobId of [jobs.A1, jobs.C1, jobs.D1]) {
      const status = await applyToJob(jobId);
      assert.ok([201, 409].includes(status), `expected 201 or 409 for ${jobId}, got ${status}`);
    }
    const { body } = await getMe('?limit=4', seekerToken);
    assert.ok(body);
    const ids = body.data.map((job) => job.id);
    assert.ok(ids.includes(jobs.B2), 'remaining category signal must surface');
    assert.ok(ids.includes(jobs.E1), 'newest published job must fill the shelf');
  });

  it('returns similar jobs by category and location, excluding the source job', async () => {
    const response = await fetch(`${baseUrl}/job-recommendations/similar/${jobs.C1}`);
    assert.equal(response.status, 200);
    const body = await response.json() as { data: JobCard[] };
    const ids = body.data.map((job) => job.id);
    assert.ok(!ids.includes(jobs.C1), 'source job must be excluded');
    assert.ok(ids.includes(jobs.D1), 'same-location job must be similar');
    assert.ok(!ids.includes(jobs.B1), 'unrelated job must not be similar');
  });

  it('404s for unknown or malformed ids on /similar', async () => {
    const unknown = await fetch(`${baseUrl}/job-recommendations/similar/00000000-0000-4000-8000-000000000000`);
    assert.equal(unknown.status, 404);
    const malformed = await fetch(`${baseUrl}/job-recommendations/similar/not-a-uuid`);
    assert.equal(malformed.status, 404);
  });
});
