import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma.js';
import { authenticate } from '../../common/auth.middleware.js';
import { asyncHandler } from '../../common/async.js';
import { AppError } from '../../common/errors.js';

export const messagesRouter = Router();

async function canAccess(userId: string, conversationId: string) {
  const item = await prisma.conversation.findUnique({ where: { id: conversationId }, include: { company: { include: { members: true } } } });
  if (!item) throw new AppError(404, 'Conversation not found');
  const permitted = item.jobSeekerId === userId || item.company.ownerId === userId || item.company.members.some((member) => member.userId === userId);
  if (!permitted) throw new AppError(403, 'Insufficient permissions');
  return item;
}

messagesRouter.get('/', authenticate, asyncHandler(async (req, res) => {
  const data = await prisma.conversation.findMany({
    where: { OR: [{ jobSeekerId: req.user!.id }, { company: { OR: [{ ownerId: req.user!.id }, { members: { some: { userId: req.user!.id } } }] } }] },
    include: {
      company: { select: { name: true, logoUrl: true } },
      jobSeeker: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true, headline: true } } } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
  });
  res.json({ data });
}));

messagesRouter.post('/', authenticate, asyncHandler(async (req, res) => {
  const body = z.object({ companyId: z.string().uuid(), jobSeekerId: z.string().uuid(), applicationId: z.string().uuid().optional(), body: z.string().trim().min(1).max(5000) }).parse(req.body);
  const company = await prisma.company.findUnique({ where: { id: body.companyId }, include: { members: true } });
  if (!company) throw new AppError(404, 'Company not found');
  const isCompanyMember = company.ownerId === req.user!.id || company.members.some((member) => member.userId === req.user!.id);
  if (!isCompanyMember && body.jobSeekerId !== req.user!.id) throw new AppError(403, 'Insufficient permissions');
  if (isCompanyMember && !body.applicationId) throw new AppError(400, 'A related application is required to contact a candidate');
  if (body.applicationId) {
    const application = await prisma.application.findFirst({ where: { id: body.applicationId, userId: body.jobSeekerId, job: { companyId: company.id } } });
    if (!application) throw new AppError(404, 'Application not found');
  }
  const recipientId = isCompanyMember ? body.jobSeekerId : company.ownerId;
  const data = await prisma.$transaction(async (tx) => {
    const existing = await tx.conversation.findFirst({ where: { companyId: company.id, jobSeekerId: body.jobSeekerId, applicationId: body.applicationId ?? null } });
    const conversation = existing
      ? await tx.conversation.update({ where: { id: existing.id }, data: { updatedAt: new Date() } })
      : await tx.conversation.create({ data: { companyId: company.id, jobSeekerId: body.jobSeekerId, applicationId: body.applicationId } });
    const message = await tx.message.create({ data: { conversationId: conversation.id, senderId: req.user!.id, body: body.body } });
    await tx.notification.create({ data: { userId: recipientId, type: 'MESSAGE', title: 'New message', body: `You have a new message from ${isCompanyMember ? company.name : 'a candidate'}`, data: { conversationId: conversation.id } } });
    return { ...conversation, messages: [message] };
  });
  res.status(201).json({ data });
}));

messagesRouter.get('/:id/messages', authenticate, asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const conversation = await canAccess(req.user!.id, id);
  await prisma.message.updateMany({ where: { conversationId: id, senderId: { not: req.user!.id }, readAt: null }, data: { readAt: new Date() } });
  const data = await prisma.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: 'asc' } });
  res.json({ data, meta: { companyId: conversation.companyId, jobSeekerId: conversation.jobSeekerId } });
}));

messagesRouter.post('/:id/messages', authenticate, asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const conversation = await canAccess(req.user!.id, id);
  const body = z.object({ body: z.string().trim().min(1).max(5000) }).parse(req.body);
  const recipientId = conversation.jobSeekerId === req.user!.id ? conversation.company.ownerId : conversation.jobSeekerId;
  const data = await prisma.$transaction(async (tx) => {
    const message = await tx.message.create({ data: { conversationId: id, senderId: req.user!.id, body: body.body } });
    await tx.conversation.update({ where: { id }, data: { updatedAt: new Date() } });
    await tx.notification.create({ data: { userId: recipientId, type: 'MESSAGE', title: 'New message', body: 'You have a new message in CareerHub', data: { conversationId: id } } });
    return message;
  });
  res.status(201).json({ data });
}));
