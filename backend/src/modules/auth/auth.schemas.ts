import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email().max(255).transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(72),
  role: z.enum(['JOB_SEEKER', 'COMPANY'])
});

export const loginSchema = registerSchema.pick({ email: true, password: true });
export const resetPasswordSchema = z.object({ token: z.string().min(32), password: z.string().min(12).max(72) });
