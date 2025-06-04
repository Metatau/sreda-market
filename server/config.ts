
import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default(5000),
  DATABASE_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  SESSION_SECRET: z.string().default('dev-session-secret'),
});

export const config = configSchema.parse(process.env);

export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
