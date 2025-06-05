
import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('5000'),
  DATABASE_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  JWT_SECRET: z.string().default('dev-jwt-secret-change-in-production'),
  SESSION_SECRET: z.string().default('dev-session-secret'),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
});

export const config = configSchema.parse(process.env);

export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
