import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, 'Resource not found'));
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: { message: 'Validation failed', details: error.flatten().fieldErrors } });
  }
  const prismaError = error as { code?: string };
  if (prismaError.code === 'P2002') return res.status(409).json({ error: { message: 'A record with this value already exists' } });
  if (prismaError.code === 'P2023') return res.status(404).json({ error: { message: 'Resource not found' } });
  if (prismaError.code === 'P2025') return res.status(404).json({ error: { message: 'Resource not found' } });
  const appError = error instanceof AppError ? error : new AppError(500, 'Internal server error');
  if (!(error instanceof AppError)) console.error(error);
  res.status(appError.statusCode).json({ error: { message: appError.message } });
}
