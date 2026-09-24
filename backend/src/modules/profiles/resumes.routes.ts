import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { prisma } from '../../database/prisma.js';
import { authenticate, authorize } from '../../common/auth.middleware.js';
import { asyncHandler } from '../../common/async.js';
import { AppError } from '../../common/errors.js';
import { env } from '../../config/env.js';
import fs from 'node:fs/promises';
import path from 'node:path';

export const resumesRouter = Router();

const MAX_BYTES = 5_000_000; // 5 MB
const ALLOWED_MIME = new Map([
  ['application/pdf', '.pdf'],
  ['application/msword', '.doc'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx'],
]);

function storageDir(): string {
  return env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads', 'resumes');
}

resumesRouter.get('/resumes', authenticate, authorize('JOB_SEEKER'), asyncHandler(async (req, res) => {
  const data = await prisma.resume.findMany({ where: { userId: req.user!.id }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
  res.json({ data });
}));

resumesRouter.post('/resumes', authenticate, authorize('JOB_SEEKER'), asyncHandler(async (req, res) => {
  const input = z.object({
    fileName: z.string().min(1).max(255),
    mimeType: z.string(),
    sizeBytes: z.number().int().positive(),
    dataBase64: z.string().min(10),
    isDefault: z.boolean().optional(),
  }).parse(req.body);

  const ext = ALLOWED_MIME.get(input.mimeType);
  if (!ext) throw new AppError(415, 'Only PDF, DOC and DOCX files are accepted');
  if (input.sizeBytes > MAX_BYTES) throw new AppError(413, 'File is too large — the limit is 5 MB');
  const buffer = Buffer.from(input.dataBase64, 'base64');
  if (buffer.length === 0 || buffer.length > MAX_BYTES) throw new AppError(413, 'File is too large — the limit is 5 MB');
  // Magic-byte sniffing: never trust the client-provided MIME type alone.
  const isPdf = buffer.subarray(0, 4).toString('hex') === '25504446'; // %PDF
  const isZip = buffer.subarray(0, 2).toString('hex') === '504b'; // PK (docx) or OLE2 fallback accepted via mime
  const isOle = buffer.subarray(0, 8).toString('hex') === 'd0cf11e0a1b11ae1'; // legacy .doc
  if (!isPdf && !isZip && !isOle) throw new AppError(415, 'File content does not look like a valid document');

  await fs.mkdir(storageDir(), { recursive: true });
  const storageKey = `${req.user!.id}/${crypto.randomUUID()}${ext}`;
  const filePath = path.join(storageDir(), ...storageKey.split('/'));
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);

  if (input.isDefault !== false) {
    await prisma.resume.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
  }
  const data = await prisma.resume.create({
    data: { userId: req.user!.id, fileName: input.fileName, storageKey, mimeType: input.mimeType, sizeBytes: buffer.length, isDefault: input.isDefault !== false },
  });
  res.status(201).json({ data });
}));

async function ownedResume(userId: string, id: string) {
  const item = await prisma.resume.findFirst({ where: { id, userId } });
  if (!item) throw new AppError(404, 'Resume not found');
  return item;
}

resumesRouter.get('/resumes/:id/download', authenticate, authorize('JOB_SEEKER', 'COMPANY', 'ADMIN'), asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  const item = await prisma.resume.findUnique({ where: { id } });
  if (!item) throw new AppError(404, 'Resume not found');
  if (req.user!.role === 'JOB_SEEKER') {
    if (item.userId !== req.user!.id) throw new AppError(403, 'Insufficient permissions');
  } else if (req.user!.role === 'COMPANY') {
    const company = await prisma.company.findFirst({ where: { OR: [{ ownerId: req.user!.id }, { members: { some: { userId: req.user!.id } } }] }, select: { id: true } });
    const shared = company ? await prisma.application.findFirst({ where: { resumeId: item.id, job: { companyId: company.id } }, select: { id: true } }) : null;
    if (!shared) throw new AppError(403, 'You can only download resumes of candidates who applied to your jobs');
  }
  const filePath = path.join(storageDir(), ...item.storageKey.split('/'));
  await fs.readFile(filePath).then((buffer) => {
    res.setHeader('Content-Type', item.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(item.fileName)}"`);
    res.send(buffer);
  }).catch(() => { throw new AppError(410, 'The stored file is no longer available'); });
}));

resumesRouter.patch('/resumes/:id/default', authenticate, authorize('JOB_SEEKER'), asyncHandler(async (req, res) => {
  const item = await ownedResume(req.user!.id, String(req.params.id));
  await prisma.$transaction([
    prisma.resume.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } }),
    prisma.resume.update({ where: { id: item.id }, data: { isDefault: true } }),
  ]);
  res.json({ data: { id: item.id, isDefault: true } });
}));

resumesRouter.delete('/resumes/:id', authenticate, authorize('JOB_SEEKER'), asyncHandler(async (req, res) => {
  const item = await ownedResume(req.user!.id, String(req.params.id));
  await prisma.resume.delete({ where: { id: item.id } });
  await fs.rm(path.join(storageDir(), ...item.storageKey.split('/')), { force: true }).catch(() => undefined);
  res.status(204).send();
}));
