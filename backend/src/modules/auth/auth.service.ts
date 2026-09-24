import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Role, User } from '@prisma/client';
import { env } from '../../config/env.js';
import { prisma } from '../../database/prisma.js';
import { AppError } from '../../common/errors.js';
import { sendWelcomeEmail } from '../../common/mailer.js';

type PublicUser = Pick<User, 'id' | 'email' | 'role' | 'status' | 'createdAt'>;
const userSelect = { id: true, email: true, role: true, status: true, createdAt: true } as const;

function accessToken(user: { id: string; role: Role }) {
  return jwt.sign({ role: user.role }, env.JWT_ACCESS_SECRET, { subject: user.id, expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'] });
}
function refreshToken(user: { id: string; role: Role }) {
  return jwt.sign({ role: user.role }, env.JWT_REFRESH_SECRET, { subject: user.id, expiresIn: env.REFRESH_TOKEN_TTL as jwt.SignOptions['expiresIn'] });
}

export const authService = {
  async register(email: string, password: string, role: Exclude<Role, 'ADMIN'>) {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw new AppError(409, 'An account with this email already exists');
    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const user = await prisma.user.create({ data: { email, passwordHash, role, verificationToken, ...(role === 'JOB_SEEKER' ? { profile: { create: {} } } : {}) }, select: userSelect });
    if (role === 'JOB_SEEKER' || role === 'COMPANY') sendWelcomeEmail(user.email, role);
    return user;
  },

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new AppError(401, 'Invalid email or password');
    if (user.status === 'BANNED') throw new AppError(403, 'This account has been suspended');
    const token = refreshToken(user);
    await prisma.user.update({ where: { id: user.id }, data: { refreshTokenHash: await bcrypt.hash(token, 12) } });
    const publicUser: PublicUser = { id: user.id, email: user.email, role: user.role, status: user.status, createdAt: user.createdAt };
    return { user: publicUser, accessToken: accessToken(user), refreshToken: token };
  },

  async refresh(token: string) {
    try {
      const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;
      if (!payload.sub) throw new Error();
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.refreshTokenHash || !(await bcrypt.compare(token, user.refreshTokenHash))) throw new Error();
      const nextRefresh = refreshToken(user);
      await prisma.user.update({ where: { id: user.id }, data: { refreshTokenHash: await bcrypt.hash(nextRefresh, 12) } });
      return { accessToken: accessToken(user), refreshToken: nextRefresh };
    } catch {
      throw new AppError(401, 'Invalid or expired refresh token');
    }
  },

  async logout(userId: string) {
    await prisma.user.update({ where: { id: userId }, data: { refreshTokenHash: null } });
  },

  async issuePasswordReset(email: string) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await prisma.user.updateMany({ where: { email }, data: { passwordResetToken: tokenHash, passwordResetExpiry: new Date(Date.now() + 3600000) } });
    return token; // Send only through an email provider in the next milestone.
  },

  async resetPassword(token: string, password: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await prisma.user.findFirst({ where: { passwordResetToken: tokenHash, passwordResetExpiry: { gt: new Date() } } });
    if (!user) throw new AppError(400, 'Invalid or expired reset token');
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 12), passwordResetToken: null, passwordResetExpiry: null, refreshTokenHash: null } });
  },

  async verifyEmail(token: string) {
    const user = await prisma.user.findUnique({ where: { verificationToken: token } });
    if (!user) throw new AppError(400, 'Invalid verification token');
    await prisma.user.update({ where: { id: user.id }, data: { verificationToken: null, emailVerifiedAt: new Date(), status: 'ACTIVE' } });
  }
};
