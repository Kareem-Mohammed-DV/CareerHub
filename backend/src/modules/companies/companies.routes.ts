import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma.js';
import { authenticate, authorize } from '../../common/auth.middleware.js';
import { asyncHandler } from '../../common/async.js';
import { AppError } from '../../common/errors.js';

export const companiesRouter = Router();
const companyInput = z.object({ name: z.string().min(2).max(150), slug: z.string().regex(/^[a-z0-9-]+$/).max(170), description: z.string().max(10000).optional(), website: z.string().url().optional(), industry: z.string().max(100).optional(), size: z.string().max(50).optional(), location: z.string().max(120).optional(), logoUrl: z.string().url().optional() });
companiesRouter.get('/slug/:slug', asyncHandler(async (req, res) => {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;

    const data = await prisma.company.findUnique({
        where: { slug },
        select: {
            id: true, name: true, slug: true, description: true, website: true,
            industry: true, size: true, location: true, logoUrl: true,
            jobs: {
                where: { status: 'PUBLISHED' },
                orderBy: { publishedAt: 'desc' },
                select: {
                    id: true, title: true, description: true, requirements: true,
                    category: true, location: true, employmentType: true,
                    workplaceType: true, experienceLevel: true, salaryMin: true,
                    salaryMax: true, currency: true, status: true, publishedAt: true,
                    company: { select: { name: true, slug: true, logoUrl: true } }
                }
            }
        }
    });

    if (!data) throw new AppError(404, 'Company not found');
    res.json({ data });
}));
companiesRouter.get('/me', authenticate, authorize('COMPANY'), asyncHandler(async (req, res) => { const data = await prisma.company.findFirst({ where: { OR: [{ ownerId: req.user!.id }, { members: { some: { userId: req.user!.id } } }] }, include: { members: { include: { user: { select: { id: true, email: true, role: true } } } } } }); res.json({ data }); }));
companiesRouter.get('/me/jobs', authenticate, authorize('COMPANY'), asyncHandler(async (req, res) => { const company = await prisma.company.findFirst({ where: { OR: [{ ownerId: req.user!.id }, { members: { some: { userId: req.user!.id } } }] } }); if (!company) throw new AppError(404, 'Company not found'); const [jobs, grouped] = await Promise.all([prisma.job.findMany({ where: { companyId: company.id }, include: { _count: { select: { applications: true } } }, orderBy: { createdAt: 'desc' } }), prisma.application.groupBy({ by: ['jobId', 'status'], where: { job: { companyId: company.id } }, _count: { _all: true } })]); const pipeline = new Map<string, Record<string, number>>(); for (const item of grouped) pipeline.set(item.jobId, { ...(pipeline.get(item.jobId) ?? {}), [item.status]: item._count._all }); const data = jobs.map((job) => ({ ...job, _pipeline: pipeline.get(job.id) ?? {} })); res.json({ data }); }));
companiesRouter.get('/me/applications', authenticate, authorize('COMPANY'), asyncHandler(async (req, res) => { const company = await prisma.company.findFirst({ where: { OR: [{ ownerId: req.user!.id }, { members: { some: { userId: req.user!.id } } }] } }); if (!company) throw new AppError(404, 'Company not found'); const data = await prisma.application.findMany({ where: { job: { companyId: company.id } }, include: { user: { select: { id: true, email: true, profile: true } }, job: { select: { id: true, title: true } }, history: { orderBy: { createdAt: 'asc' } } }, orderBy: { appliedAt: 'desc' } }); res.json({ data }); }));
companiesRouter.post('/', authenticate, authorize('COMPANY'), asyncHandler(async (req, res) => { const input = companyInput.parse(req.body); const existing = await prisma.company.findFirst({ where: { ownerId: req.user!.id } }); if (existing) throw new AppError(409, 'You already own a company'); const data = await prisma.company.create({ data: { ...input, ownerId: req.user!.id, members: { create: { userId: req.user!.id, memberRole: 'OWNER' } } } }); res.status(201).json({ data }); }));
companiesRouter.patch('/me', authenticate, authorize('COMPANY'), asyncHandler(async (req, res) => { const input = companyInput.partial().parse(req.body); const company = await prisma.company.findFirst({ where: { ownerId: req.user!.id } }); if (!company) throw new AppError(404, 'Company not found'); const data = await prisma.company.update({ where: { id: company.id }, data: input }); res.json({ data }); }));

// ---- Analytics (company-scoped) ----
const DEFAULT_DAYS = 30;
const MAX_DAYS = 180;

companiesRouter.get('/me/analytics', authenticate, authorize('COMPANY', 'ADMIN'), asyncHandler(async (req, res) => {
    const company = await prisma.company.findFirst({ where: { OR: [{ ownerId: req.user!.id }, { members: { some: { userId: req.user!.id } } }] } });
    if (!company) throw new AppError(404, 'Company not found');
    const parsedDays = z.coerce.number().int().min(7).max(MAX_DAYS).safeParse(req.query.days);
    const days = parsedDays.success ? parsedDays.data : DEFAULT_DAYS;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totals, activeJobs, perJob, statusGroups, timelineRaw, sources] = await Promise.all([
        prisma.job.aggregate({ where: { companyId: company.id }, _sum: { viewCount: true } }),
        prisma.job.count({ where: { companyId: company.id, status: 'PUBLISHED' } }),
        prisma.job.findMany({
            where: { companyId: company.id },
            orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
            take: 8,
            select: { id: true, title: true, status: true, viewCount: true, _count: { select: { applications: true, savedBy: true } } }
        }),
        prisma.application.groupBy({ by: ['status'], where: { job: { companyId: company.id } }, _count: { _all: true } }),
        prisma.$queryRaw<{ day: Date; views: bigint; applications: bigint }[]>`
            SELECT d::date AS day,
                   (SELECT COALESCE(SUM(v.count), 0)::bigint FROM job_view_daily v
                     JOIN jobs j ON j.id = v.job_id
                    WHERE j.company_id = ${company.id}::uuid AND v.day = d::date) AS views,
                   (SELECT COUNT(*)::bigint FROM applications a
                     JOIN jobs j2 ON j2.id = a.job_id
                    WHERE j2.company_id = ${company.id}::uuid AND a.applied_at::date = d::date) AS applications
            FROM generate_series(${since}::date, CURRENT_DATE, interval '1 day') d
            ORDER BY d;
        `,
        prisma.application.groupBy({ by: ['source'], where: { job: { companyId: company.id }, source: { not: null } }, _count: { _all: true } })
    ]);

    const totalViews = Number(totals._sum.viewCount ?? 0);
    const totalApplications = statusGroups.reduce((sum, g) => sum + g._count._all, 0);
    const byDay = timelineRaw.map((row) => ({ day: row.day.toISOString().slice(0, 10), views: Number(row.views), applications: Number(row.applications) }));

    res.json({
        data: {
            range: { days, since: since.toISOString() },
            totals: {
                views: totalViews,
                applications: totalApplications,
                activeJobs,
                conversionRate: totalViews > 0 ? Math.round((totalApplications / totalViews) * 1000) / 10 : 0
            },
            timeline: byDay,
            topJobs: perJob.map((job) => ({ id: job.id, title: job.title, status: job.status, views: job.viewCount, applications: job._count.applications, saved: job._count.savedBy })),
            pipeline: Object.fromEntries(statusGroups.map((group) => [group.status, group._count._all])),
            sources: Object.fromEntries(sources.map((group) => [group.source ?? 'direct', group._count._all]))
        }
    });
}));
