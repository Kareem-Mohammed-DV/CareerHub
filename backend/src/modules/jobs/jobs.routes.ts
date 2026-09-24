import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma.js';
import { authenticate, authorize } from '../../common/auth.middleware.js';
import { asyncHandler } from '../../common/async.js';
import { AppError } from '../../common/errors.js';
import { pageMeta, paginationSchema } from '../../common/pagination.js';
import { planDef } from '../billing/plans.js';
import { audit } from '../../common/audit.js';
import { sendNewMatchingJobsEmail } from '../../common/mailer.js';

async function notifyMatchingAlerts(job: { id: string; title: string; category: string; location: string | null; employmentType: string; workplaceType: string; experienceLevel: string; companyId: string }): Promise<void> {
  try {
    const alertOwners = await prisma.jobAlert.findMany({
      where: {
        active: true,
        user: { role: 'JOB_SEEKER', status: { not: 'BANNED' } },
      },
      select: {
        id: true, userId: true, keyword: true, location: true, category: true, frequency: true,
        experienceLevel: true, employmentType: true, workplaceType: true, user: { select: { email: true } },
      },
    });
    const title = job.title.toLowerCase();
    let matched = 0;
    for (const alert of alertOwners) {
      if (alert.category && alert.category.toLowerCase() !== job.category.toLowerCase()) continue;
      if (alert.location && !(job.location ?? '').toLowerCase().includes(alert.location.toLowerCase())) continue;
      if (alert.experienceLevel && alert.experienceLevel !== job.experienceLevel) continue;
      if (alert.employmentType && alert.employmentType !== job.employmentType) continue;
      if (alert.workplaceType && alert.workplaceType !== job.workplaceType) continue;
      if (alert.keyword && !title.includes(alert.keyword.toLowerCase())) continue;
      matched += 1;
      await prisma.$transaction([
        prisma.notification.create({ data: { userId: alert.userId, type: 'NEW_MATCHING_JOB', title: 'New matching job', body: `A new job matches your alert: ${job.title}`, data: { jobId: job.id } } }),
        prisma.jobAlert.update({ where: { id: alert.id }, data: { lastRunAt: new Date() } }),
      ]);
      if (alert.frequency === 'INSTANT') sendNewMatchingJobsEmail(alert.user.email, job.title);
    }
    if (matched > 0) console.log(`[alerts] job ${job.id} matched ${matched} alert(s)`);
  } catch (error) {
    console.error('[alerts] matching failed:', error instanceof Error ? error.message : error);
  }
}

export const jobsRouter = Router();
const jobBase = z.object({ title: z.string().min(3).max(180), description: z.string().min(30), requirements: z.string().max(10000).optional(), category: z.string().min(2).max(100), location: z.string().max(120).optional(), employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE']), workplaceType: z.enum(['ONSITE', 'HYBRID', 'REMOTE']), experienceLevel: z.enum(['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE']), salaryMin: z.number().int().nonnegative().optional(), salaryMax: z.number().int().nonnegative().optional(), currency: z.string().length(3).default('EGP'), status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED']).default('DRAFT'), expiresAt: z.coerce.date().optional() });
const jobInput = jobBase.refine(v => !v.salaryMin || !v.salaryMax || v.salaryMin <= v.salaryMax, { message: 'salaryMin must be no greater than salaryMax' });
async function employer(userId: string) { const company = await prisma.company.findFirst({ where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] } }); if (!company) throw new AppError(403, 'A company profile is required'); return company; }
async function activeJobCount(companyId: string) { return prisma.job.count({ where: { companyId, status: { in: ['PUBLISHED', 'DRAFT'] } } }); }
async function activePlan(companyId: string): Promise<'FREE' | 'GROWTH' | 'SCALE'> { const sub = await prisma.subscription.findUnique({ where: { companyId } }); if (!sub || sub.plan === 'FREE' || sub.status !== 'ACTIVE') return 'FREE'; if (sub.currentPeriodEnd && sub.currentPeriodEnd <= new Date()) return 'FREE'; return sub.plan; }

jobsRouter.get('/', asyncHandler(async (req, res) => { const { page, limit } = paginationSchema.parse(req.query); const q = z.string().optional().parse(req.query.q); const salaryMin = req.query.salaryMin ? z.coerce.number().nonnegative().parse(req.query.salaryMin) : undefined; const employmentType = req.query.employmentType ? z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE']).parse(req.query.employmentType) : undefined; const workplaceType = req.query.workplaceType ? z.enum(['ONSITE', 'HYBRID', 'REMOTE']).parse(req.query.workplaceType) : undefined; const datePosted = req.query.datePosted ? z.enum(['24h', '7d', '30d']).parse(req.query.datePosted) : undefined; const sort = req.query.sort ? z.enum(['recent', 'salary_desc', 'salary_asc']).parse(req.query.sort) : 'recent'; const publishedAfter = datePosted ? new Date(Date.now() - (datePosted === '24h' ? 1 : datePosted === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000) : undefined; const where = { status: 'PUBLISHED' as const, ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' as const } }, { description: { contains: q, mode: 'insensitive' as const } }] } : {}), ...(req.query.category ? { category: String(req.query.category) } : {}), ...(req.query.location ? { location: { contains: String(req.query.location), mode: 'insensitive' as const } } : {}), ...(req.query.experienceLevel ? { experienceLevel: String(req.query.experienceLevel) as never } : {}), ...(employmentType ? { employmentType } : {}), ...(workplaceType ? { workplaceType } : {}), ...(salaryMin !== undefined ? { salaryMax: { gte: salaryMin } } : {}), ...(publishedAfter ? { publishedAt: { gte: publishedAfter } } : {}) }; const [data, total] = await prisma.$transaction([prisma.job.findMany({ where, include: { company: { select: { name: true, slug: true, logoUrl: true } } }, orderBy: [{ isFeatured: 'desc' as const }, sort === 'recent' ? { publishedAt: 'desc' as const } : sort === 'salary_desc' ? { salaryMax: 'desc' as const } : { salaryMin: 'asc' as const }], skip: (page - 1) * limit, take: limit }), prisma.job.count({ where })]); res.json({ data, meta: pageMeta(page, limit, total) }); }));
jobsRouter.get('/featured', asyncHandler(async (_req, res) => { const data = await prisma.job.findMany({ where: { status: 'PUBLISHED', isFeatured: true }, include: { company: { select: { name: true, slug: true, logoUrl: true } } }, orderBy: { publishedAt: 'desc' }, take: 6 }); res.json({ data }); }));
jobsRouter.get('/saved/me', authenticate, authorize('JOB_SEEKER'), asyncHandler(async (req, res) => {
    const data = await prisma.savedJob.findMany({ where: { userId: req.user!.id }, include: { job: { include: { company: { select: { name: true, slug: true, logoUrl: true } } } } }, orderBy: { createdAt: 'desc' } });
    res.json({ data });
}));

jobsRouter.get('/:id', asyncHandler(async (req, res) => { const job = await prisma.job.findFirst({ where: { id: String(req.params.id), status: 'PUBLISHED' }, include: { company: { select: { name: true, slug: true, description: true, logoUrl: true, website: true } } } }); if (!job) throw new AppError(404, 'Job not found'); prisma.job.update({ where: { id: job.id }, data: { viewCount: { increment: 1 } } }).catch(() => undefined); prisma.jobViewDaily.upsert({ where: { jobId_day: { jobId: job.id, day: new Date() } }, create: { jobId: job.id, day: new Date(), count: 1 }, update: { count: { increment: 1 } } }).catch(() => undefined); res.json({ data: job }); }));
jobsRouter.post('/', authenticate, authorize('COMPANY', 'ADMIN'), asyncHandler(async (req, res) => { const input = jobInput.parse(req.body); const company = await employer(req.user!.id); if (company.verificationStatus !== 'VERIFIED') throw new AppError(403, 'Your company is awaiting verification. An admin must approve it before publishing jobs.'); const plan = await activePlan(company.id); const limit = planDef(plan).maxActiveJobs; const used = await activeJobCount(company.id); if (used >= limit) throw new AppError(402, `Your ${plan} plan allows ${limit} active job${limit === 1 ? '' : 's'}. Upgrade your plan to publish more.`); const data = await prisma.job.create({ data: { ...input, companyId: company.id, publishedAt: input.status === 'PUBLISHED' ? new Date() : undefined } }); if (data.status === 'PUBLISHED') void notifyMatchingAlerts({ ...data, companyId: company.id }); res.status(201).json({ data }); }));
jobsRouter.patch('/:id', authenticate, authorize('COMPANY', 'ADMIN'), asyncHandler(async (req, res) => { const company = req.user!.role === 'ADMIN' ? null : await employer(req.user!.id); const input = jobBase.partial().parse(req.body); const job = await prisma.job.findFirst({ where: { id: String(req.params.id), ...(company ? { companyId: company.id } : {}) } }); if (!job) throw new AppError(404, 'Job not found'); const data = await prisma.job.update({ where: { id: job.id }, data: { ...input, isFeatured: input.status === 'PUBLISHED' ? job.isFeatured : false, publishedAt: input.status === 'PUBLISHED' && !job.publishedAt ? new Date() : undefined } }); if (input.status === 'PUBLISHED' && job.status !== 'PUBLISHED') void notifyMatchingAlerts({ ...data, companyId: job.companyId }); res.json({ data }); }));
jobsRouter.delete('/:id', authenticate, authorize('COMPANY', 'ADMIN'), asyncHandler(async (req, res) => { const company = req.user!.role === 'ADMIN' ? null : await employer(req.user!.id); const job = await prisma.job.findFirst({ where: { id: String(req.params.id), ...(company ? { companyId: company.id } : {}) } }); if (!job) throw new AppError(404, 'Job not found'); await prisma.job.delete({ where: { id: job.id } }); res.status(204).send(); }));

jobsRouter.get('/:id/applications', authenticate, authorize('COMPANY', 'ADMIN'), asyncHandler(async (req, res) => {
    const company = req.user!.role === 'ADMIN' ? null : await employer(req.user!.id);
    const job = await prisma.job.findFirst({ where: { id: String(req.params.id), ...(company ? { companyId: company.id } : {}) } });
    if (!job) throw new AppError(404, 'Job not found');
    const data = await prisma.application.findMany({ where: { jobId: job.id }, include: { user: { select: { id: true, email: true, profile: true } }, resume: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true } }, history: { orderBy: { createdAt: 'asc' } } }, orderBy: { appliedAt: 'desc' } });
    res.json({ data });
}));

jobsRouter.patch('/:id/feature', authenticate, authorize('COMPANY', 'ADMIN'), asyncHandler(async (req, res) => {
    const company = req.user!.role === 'ADMIN' ? null : await employer(req.user!.id);
    const body = z.object({ featured: z.boolean() }).parse(req.body);
    const job = await prisma.job.findFirst({ where: { id: String(req.params.id), ...(company ? { companyId: company.id } : {}) } });
    if (!job) throw new AppError(404, 'Job not found');
    if (body.featured) {
        const plan = req.user!.role === 'ADMIN' ? 'SCALE' : await activePlan((company as { id: string }).id);
        if (!planDef(plan).featured) throw new AppError(402, 'Featuring jobs is available on the Growth and Scale plans. Upgrade to boost your listings.');
    }
    const data = await prisma.job.update({ where: { id: job.id }, data: { isFeatured: body.featured } });
    res.json({ data: { id: data.id, isFeatured: data.isFeatured } });
}));

jobsRouter.post('/:id/saved', authenticate, authorize('JOB_SEEKER'), asyncHandler(async (req, res) => {
    const jobId = String(req.params.id);
    const job = await prisma.job.findFirst({ where: { id: jobId, status: 'PUBLISHED' } });
    if (!job) throw new AppError(404, 'Job not found');
    await prisma.savedJob.upsert({ where: { userId_jobId: { userId: req.user!.id, jobId } }, create: { userId: req.user!.id, jobId }, update: {} });
    res.status(204).send();
}));

jobsRouter.get('/:id/saved', authenticate, authorize('JOB_SEEKER'), asyncHandler(async (req, res) => {
    const data = await prisma.savedJob.findUnique({ where: { userId_jobId: { userId: req.user!.id, jobId: String(req.params.id) } }, select: { jobId: true } });
    res.json({ data: { saved: Boolean(data) } });
}));

jobsRouter.delete('/:id/saved', authenticate, authorize('JOB_SEEKER'), asyncHandler(async (req, res) => {
    await prisma.savedJob.deleteMany({ where: { userId: req.user!.id, jobId: String(req.params.id) } });
    res.status(204).send();
}));

