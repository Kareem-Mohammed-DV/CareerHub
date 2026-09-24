import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './errors.js';
import { prisma } from '../database/prisma.js';

type TokenPayload = { sub: string; role: Role };

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return next(new AppError(401, 'Authentication required'));
  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
  } catch {
    return next(new AppError(401, 'Invalid or expired access token'));
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, email: true, role: true, status: true } });
    if (!user) return next(new AppError(401, 'Invalid or expired access token'));
    if (user.status === 'BANNED') return next(new AppError(403, 'This account has been suspended'));
    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch (error) { next(error); }
}

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return next(new AppError(403, 'Insufficient permissions'));
    next();
  };
}
