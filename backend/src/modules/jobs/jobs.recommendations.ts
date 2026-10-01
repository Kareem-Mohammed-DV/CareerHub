import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma.js';
import { authenticate, authorize } from '../../common/auth.middleware.js';
import { asyncHandler } from '../../common/async.js';
import { AppError } from '../../common/errors.js';
import { paginationSchema } from '../../common/pagination.js';

export const recommendationsRouter = Router();

const jobCardInclude = { company: { select: { name: true, slug: true, logoUrl: true } } } as const;

function profileSkills(skills: unknown): string[] {
  if (!Array.isArray(skills)) return [];
  return skills.filter((skill): skill is string => typeof skill === 'string' && skill.trim().length > 0).slice(0, 8);
}

/**
 * Personalized recommendations for the signed-in job seeker.
 * Signal sources, in order: recent applications and saved jobs (their job
 * categories), profile skills (title keyword match), profile location (same
 * city), then the newest published jobs as fallback so the shelf is never
 * empty. Jobs already applied to or saved are always excluded.
 */
recommendationsRouter.get('/me', authenticate, authorize('JOB_SEEKER'), asyncHandler(async (req, res) => {
  const { limit } = paginationSchema.parse({ limit: req.query.limit ?? 6 });
  const profile = await prisma.jobSeekerProfile.findUnique({ where: { userId: req.user!.id }, select: { location: true, skills: true } });
  const [recentApplications, savedJobs] = await Promise.all([
    prisma.application.findMany({
      where: { userId: req.user!.id },
      select: { jobId: true, job: { select: { category: true } } },
      orderBy: { appliedAt: 'desc' },
      take: 50,
    }),
    prisma.savedJob.findMany({
      where: { userId: req.user!.id },
      select: { jobId: true, job: { select: { category: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  const excludedJobIds = [...new Set([...recentApplications.map((application) => application.jobId), ...savedJobs.map((saved) => saved.jobId)])];
  const recentCategories = [...new Set([...recentApplications.map((application) => application.job.category), ...savedJobs.map((saved) => saved.job.category)])];
  const skills = profileSkills(profile?.skills);
  const matchers: Array<Record<string, unknown>> = [];
  if (recentCategories.length > 0) matchers.push({ category: { in: recentCategories } });
  for (const skill of skills) matchers.push({ title: { contains: skill, mode: 'insensitive' as const } });
  if (profile?.location) matchers.push({ location: { contains: profile.location, mode: 'insensitive' as const } });

  const hasSignals = matchers.length > 0;
  let reason = hasSignals ? 'Because of your activity and profile' : 'Fresh opportunities for you';
  let where: Record<string, unknown> = { status: 'PUBLISHED' as const };
  if (hasSignals) where = { ...where, OR: matchers };
  if (excludedJobIds.length > 0) where = { ...where, id: { notIn: excludedJobIds } };

  let data = await prisma.job.findMany({ where, include: jobCardInclude, orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }], take: limit });
  if (data.length < limit) {
    // Top up with the newest published jobs so the shelf never runs dry.
    reason = hasSignals ? 'Recommended for you' : reason;
    const seen = new Set([...excludedJobIds, ...data.map((job) => job.id)]);
    const fallbackWhere: Record<string, unknown> = { status: 'PUBLISHED' as const, ...(seen.size > 0 ? { id: { notIn: [...seen] } } : {}) };
    const fillers = await prisma.job.findMany({ where: fallbackWhere, include: jobCardInclude, orderBy: { publishedAt: 'desc' }, take: limit - data.length });
    data = [...data, ...fillers];
  }

  res.json({ data, meta: { reason } });
}));

/**
 * Similar jobs for the public job details page.
 * Matches on category first, then location.
 */
recommendationsRouter.get('/similar/:jobId', asyncHandler(async (req, res) => {
  const jobId = z.string().uuid().safeParse(req.params.jobId);
  if (!jobId.success) throw new AppError(404, 'Job not found');
  const { limit } = paginationSchema.parse({ limit: req.query.limit ?? 4 });
  const job = await prisma.job.findUnique({ where: { id: jobId.data }, select: { id: true, category: true, location: true } });
  if (!job) throw new AppError(404, 'Job not found');

  const data = await prisma.job.findMany({
    where: {
      status: 'PUBLISHED' as const,
      id: { not: job.id },
      OR: [
        { category: job.category },
        ...(job.location ? [{ location: { contains: job.location, mode: 'insensitive' as const } }] : []),
      ],
    },
    include: jobCardInclude,
    orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
    take: limit,
  });

  res.json({ data, meta: { category: job.category } });
}));
