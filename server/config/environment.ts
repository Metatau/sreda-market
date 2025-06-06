/**
 * Centralized environment configuration
 */
import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string(),
  
  // API Keys
  OPENAI_API_KEY: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  
  // ADS API Configuration
  ADS_API_BASE_URL: z.string().optional(),
  ADS_API_ACCESS_TOKEN: z.string().optional(),
  ADS_API_LOGIN: z.string().optional(),
  
  // Payment Configuration
  STRIPE_SECRET_KEY: z.string().optional(),
  BLANK_BANK_API_KEY: z.string().optional(),
  
  // Security
  SESSION_SECRET: z.string().optional(),
  JWT_SECRET: z.string().optional(),
});

export type Environment = z.infer<typeof environmentSchema>;

let environment: Environment;

try {
  environment = environmentSchema.parse(process.env);
} catch (error) {
  console.error('Environment validation failed:', error);
  process.exit(1);
}

export { environment };

export const isDevelopment = environment.NODE_ENV === 'development';
export const isProduction = environment.NODE_ENV === 'production';
export const isTest = environment.NODE_ENV === 'test';