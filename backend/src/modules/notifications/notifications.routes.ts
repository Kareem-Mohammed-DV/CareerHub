import { Router } from 'express';
import { prisma } from '../../database/prisma.js';
import { authenticate } from '../../common/auth.middleware.js';
import { asyncHandler } from '../../common/async.js';
import { AppError } from '../../common/errors.js';
export const notificationsRouter = Router();
notificationsRouter.get('/', authenticate, asyncHandler(async (req, res) => { const data = await prisma.notification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 50 }); res.json({ data }); }));
notificationsRouter.patch('/:id/read', authenticate, asyncHandler(async (req, res) => { const item = await prisma.notification.findFirst({ where: { id: String(req.params.id), userId: req.user!.id } }); if (!item) throw new AppError(404, 'Notification not found'); const data = await prisma.notification.update({ where: { id: item.id }, data: { readAt: new Date() } }); res.json({ data }); }));
notificationsRouter.patch('/read-all', authenticate, asyncHandler(async (req, res) => { const result = await prisma.notification.updateMany({ where: { userId: req.user!.id, readAt: null }, data: { readAt: new Date() } }); res.json({ data: { updated: result.count } }); }));
