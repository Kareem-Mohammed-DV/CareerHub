import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma.js';
import { authenticate, authorize } from '../../common/auth.middleware.js';
import { asyncHandler } from '../../common/async.js';
import { sendNewApplicationEmail, sendApplicationStatusEmail } from '../../common/mailer.js';
import { AppError } from '../../common/errors.js';
import { pageMeta, paginationSchema } from '../../common/pagination.js';

export const applicationsRouter = Router();
applicationsRouter.get('/applications/me/summary', authenticate, authorize('JOB_SEEKER'), asyncHandler(async (req, res) => { const [groups, saved, total] = await Promise.all([prisma.application.groupBy({ by: ['status'], where: { userId: req.user!.id }, _count: { _all: true } }), prisma.savedJob.count({ where: { userId: req.user!.id } }), prisma.application.count({ where: { userId: req.user!.id } })]); res.json({ data: { total, saved, byStatus: Object.fromEntries(groups.map((group) => [group.status, group._count._all])) } }); }));
applicationsRouter.post('/jobs/:jobId/applications', authenticate, authorize('JOB_SEEKER'), asyncHandler(async (req, res) => {
    const body = z.object({ resumeId: z.string().uuid().optional(), coverLetter: z.string().max(5000).optional(), source: z.string().max(50).optional() }).parse(req.body); const jobId = String(req.params.jobId);
    const job = await prisma.job.findFirst({
        where: {
            id: jobId,
            status: 'PUBLISHED'
        },
        include: {
            company: {
                include: {
                    owner: { select: { email: true } }
                }
            }
        }
    }); if (!job) throw new AppError(404, 'Job not found'); if (body.resumeId) { const resume = await prisma.resume.findFirst({ where: { id: body.resumeId, userId: req.user!.id } }); if (!resume) throw new AppError(400, 'Invalid resume'); }
    const ownerEmail = job.company.owner.email;    try { const application = await prisma.$transaction(async tx => { const item = await tx.application.create({ data: { ...body, jobId: job.id, userId: req.user!.id } }); await tx.applicationStatusHistory.create({ data: { applicationId: item.id, status: 'SUBMITTED', changedById: req.user!.id } }); await tx.notification.create({ data: { userId: job.company.ownerId, type: 'NEW_APPLICATION', title: 'New application', body: `A candidate applied for ${job.title}`, data: { applicationId: item.id } } }); return item; }); sendNewApplicationEmail(ownerEmail, req.user!.email, job.title); res.status(201).json({ data: application }); } catch (error) { if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') throw new AppError(409, 'You have already applied for this job'); throw error; }
}));
applicationsRouter.get('/applications/me', authenticate, authorize('JOB_SEEKER'), asyncHandler(async (req, res) => { const { page, limit } = paginationSchema.parse(req.query); const where = { userId: req.user!.id }; const [data, total] = await prisma.$transaction([prisma.application.findMany({ where, include: { job: { include: { company: { select: { name: true, slug: true } } } } }, orderBy: { appliedAt: 'desc' }, skip: (page - 1) * limit, take: limit }), prisma.application.count({ where })]); res.json({ data, meta: pageMeta(page, limit, total) }); }));
applicationsRouter.patch('/applications/:id/status', authenticate, authorize('COMPANY', 'ADMIN'), asyncHandler(async (req, res) => {
    const body = z.object({ status: z.enum(['REVIEWING', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'REJECTED', 'HIRED']), note: z.string().max(2000).optional() }).parse(req.body); const applicationId = String(req.params.id);

    const app = await prisma.application.findUnique({
        where: {
            id: applicationId
        },
        include: {
            user: { select: { email: true } },
            job: {
                include: {
                    company: {
                        include: {
                            members: true
                        }
                    }
                }
            }
        }
    }); if (!app) throw new AppError(404, 'Application not found'); const permitted = app.job.company.ownerId === req.user!.id || app.job.company.members.some(m => m.userId === req.user!.id); if (!permitted && req.user!.role !== 'ADMIN') throw new AppError(403, 'Insufficient permissions'); const data = await prisma.$transaction(async tx => { const item = await tx.application.update({ where: { id: app.id }, data: { status: body.status } }); await tx.applicationStatusHistory.create({ data: { applicationId: app.id, previousStatus: app.status, status: body.status, note: body.note, changedById: req.user!.id } }); await tx.notification.create({ data: { userId: app.userId, type: 'APPLICATION_STATUS', title: 'Application updated', body: `Your application status is now ${body.status}`, data: { applicationId: app.id } } }); return item; }); sendApplicationStatusEmail(app.user.email, app.job.title, body.status, body.note); res.json({ data });
}));

applicationsRouter.get('/applications/:id/history', authenticate, asyncHandler(async (req, res) => {
    const application = await prisma.application.findUnique({ where: { id: String(req.params.id) }, include: { job: { include: { company: { include: { members: true } } } } } });
    if (!application) throw new AppError(404, 'Application not found');
    const company = application.job.company;
    const permitted = application.userId === req.user!.id || company.ownerId === req.user!.id || company.members.some((member) => member.userId === req.user!.id) || req.user!.role === 'ADMIN';
    if (!permitted) throw new AppError(403, 'Insufficient permissions');
    const data = await prisma.applicationStatusHistory.findMany({ where: { applicationId: application.id }, orderBy: { createdAt: 'asc' } });
    res.json({ data });
}));
