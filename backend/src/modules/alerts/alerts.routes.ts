import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma.js';
import { authenticate, authorize } from '../../common/auth.middleware.js';
import { asyncHandler } from '../../common/async.js';
import { AppError } from '../../common/errors.js';

export const alertsRouter = Router();

const alertInput = z.object({
  keyword: z.string().max(120).optional(),
  location: z.string().max(120).optional(),
  category: z.string().max(100).optional(),
  experienceLevel: z.enum(['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE']).optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE']).optional(),
  workplaceType: z.enum(['ONSITE', 'HYBRID', 'REMOTE']).optional(),
  frequency: z.enum(['INSTANT', 'DAILY', 'WEEKLY']).default('DAILY'),
}).refine((value) => Object.values(value).some((v) => v !== undefined && v !== ''), { message: 'At least one criterion is required' });

alertsRouter.get('/', authenticate, authorize('JOB_SEEKER'), asyncHandler(async (req, res) => {
  const data = await prisma.jobAlert.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' } });
  res.json({ data });
}));

alertsRouter.post('/', authenticate, authorize('JOB_SEEKER'), asyncHandler(async (req, res) => {
  const input = alertInput.parse(req.body);
  const count = await prisma.jobAlert.count({ where: { userId: req.user!.id, active: true } });
  if (count >= 10) throw new AppError(402, 'You can have up to 10 active job alerts');
  const data = await prisma.jobAlert.create({ data: { ...input, userId: req.user!.id } });
  res.status(201).json({ data });
}));

alertsRouter.patch('/:id', authenticate, authorize('JOB_SEEKER'), asyncHandler(async (req, res) => {
  const body = z.object({ active: z.boolean() }).parse(req.body);
  const existing = await prisma.jobAlert.findFirst({ where: { id: String(req.params.id), userId: req.user!.id } });
  if (!existing) throw new AppError(404, 'Alert not found');
  const data = await prisma.jobAlert.update({ where: { id: existing.id }, data: { active: body.active } });
  res.json({ data });
}));

alertsRouter.delete('/:id', authenticate, authorize('JOB_SEEKER'), asyncHandler(async (req, res) => {
  const deleted = await prisma.jobAlert.deleteMany({ where: { id: String(req.params.id), userId: req.user!.id } });
  if (deleted.count === 0) throw new AppError(404, 'Alert not found');
  res.status(204).send();
}));
