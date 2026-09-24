import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authenticate } from '../../common/auth.middleware.js';

export const authRouter = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Create a job seeker or company account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 12
 *                 example: Password12345
 *               role:
 *                 type: string
 *                 enum:
 *                   - JOB_SEEKER
 *                   - COMPANY
 *                 example: JOB_SEEKER
 *     responses:
 *       '201':
 *         description: Account created
 *
 * /auth/login:
 *   post:
 *     summary: Authenticate and receive an access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: Password12345
 *     responses:
 *       '200':
 *         description: Logged in
 */
authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', authenticate, authController.logout);
authRouter.post('/forgot-password', authController.forgotPassword);
authRouter.post('/reset-password', authController.resetPassword);
authRouter.get('/verify-email/:token', authController.verifyEmail);