import 'dotenv/config';
import { z } from 'zod';

// Environment schema with validation
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5101),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),

  // Add FliHub-specific environment variables here
  // Example:
  // WATCH_DIRECTORY: z.string().optional(),
  // PROJECT_DIRECTORY: z.string().optional(),
});

// Parse and validate environment variables
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  throw new Error('Invalid environment variables');
}

// Export validated environment with helper flags
export const env = {
  ...parsedEnv.data,
  isDevelopment: parsedEnv.data.NODE_ENV === 'development',
  isProduction: parsedEnv.data.NODE_ENV === 'production',
  isTest: parsedEnv.data.NODE_ENV === 'test',
};

// Type-safe environment variables
export type Env = typeof env;
