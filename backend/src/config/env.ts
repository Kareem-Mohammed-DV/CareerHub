import 'dotenv/config';
import { z } from 'zod';

const environment = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('7d'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  SMTP_HOST: z.string().min(1).optional().or(z.literal('')),
  SMTP_PORT: z.union([z.coerce.number().int().positive(), z.literal('')]).optional(),
  SMTP_SECURE: z.union([z.coerce.boolean(), z.literal(''), z.literal('false'), z.literal('true')]).transform((v) => v === true || v === 'true').default(false),
  SMTP_USER: z.union([z.string().min(1), z.literal('')]).optional(),
  SMTP_PASS: z.union([z.string().min(1), z.literal('')]).optional(),
  MAIL_FROM: z.union([z.string().min(3), z.literal('')]).optional(),
  PAYMOB_API_KEY: z.union([z.string().min(1), z.literal('')]).optional(),
  PAYMOB_INTEGRATION_ID: z.union([z.string().min(1), z.literal('')]).optional(),
  PAYMOB_IFRAME_ID: z.union([z.string().min(1), z.literal('')]).optional(),
  PAYMOB_HMAC_SECRET: z.union([z.string().min(1), z.literal('')]).optional(),
  PAYMOB_BASE_URL: z.string().url().default('https://accept.paymob.com'),
  UPLOAD_DIR: z.string().min(1).optional(),
  /** Public web app URL used in email links. Falls back to WEB_ORIGIN when unset. */
  WEB_URL: z.string().url().optional()
});

export const env = environment.parse(process.env);

