import type { NextFunction, Request, Response } from 'express';
import { authService } from './auth.service.js';
import { loginSchema, registerSchema, resetPasswordSchema } from './auth.schemas.js';
import { AppError } from '../../common/errors.js';

const cookieOptions = { httpOnly: true, sameSite: 'strict' as const, secure: process.env.NODE_ENV === 'production', path: '/api/v1/auth' };

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const body = registerSchema.parse(req.body);
      const user = await authService.register(body.email, body.password, body.role);
      res.status(201).json({ data: { user } });
    } catch (error) { next(error); }
  },
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const body = loginSchema.parse(req.body);
      const result = await authService.login(body.email, body.password);
      res.cookie('refreshToken', result.refreshToken, cookieOptions).json({ data: { user: result.user, accessToken: result.accessToken } });
    } catch (error) { next(error); }
  },
  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies.refreshToken as string | undefined;
      if (!token) throw new AppError(401, 'Refresh token is required');
      const result = await authService.refresh(token);
      res.cookie('refreshToken', result.refreshToken, cookieOptions).json({ data: { accessToken: result.accessToken } });
    } catch (error) { next(error); }
  },
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user) await authService.logout(req.user.id);
      res.clearCookie('refreshToken', { path: '/api/v1/auth' }).status(204).send();
    } catch (error) { next(error); }
  },
  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const email = loginSchema.shape.email.parse(req.body.email);
      await authService.issuePasswordReset(email);
      res.status(202).json({ data: { message: 'If an account exists, a reset email will be sent.' } });
    } catch (error) { next(error); }
  },
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try { const body = resetPasswordSchema.parse(req.body); await authService.resetPassword(body.token, body.password); res.status(204).send(); } catch (error) { next(error); }
  },
  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try { await authService.verifyEmail(String(req.params.token)); res.status(204).send(); } catch (error) { next(error); }
  }
};
