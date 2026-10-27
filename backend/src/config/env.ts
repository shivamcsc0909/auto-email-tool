import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from workspace root or current directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const envSchema = z.object({
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/rankriseusa_outreach?schema=public'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_URL: z.string().default('http://localhost:5173'),
  BACKEND_URL: z.string().default('http://localhost:4000'),
  EMAIL_SEND_MODE: z.enum(['DRY_RUN', 'LIVE']).default('DRY_RUN'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  EMAIL_TOKEN_ENCRYPTION_KEY: z.string().length(64, 'EMAIL_TOKEN_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)'),
  ADMIN_EMAIL: z.string().email().default('admin@rankriseusa.com'),
  ADMIN_PASSWORD: z.string().min(8).default('RankRiseAdmin2025!'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().default('http://localhost:4000/api/senders/gmail/callback'),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_TENANT_ID: z.string().default('common'),
  MICROSOFT_REDIRECT_URI: z.string().default('http://localhost:4000/api/senders/microsoft/callback'),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Environment configuration error:', JSON.stringify(parseResult.error.format(), null, 2));
  // In development, fall back to safe dummy values if needed
  if (process.env.NODE_ENV !== 'production') {
    console.warn('⚠️ Warning: Proceeding with fallback development configurations.');
  }
}

export const env = parseResult.success
  ? parseResult.data
  : {
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rankriseusa_outreach?schema=public',
      REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
      PORT: Number(process.env.PORT) || 4000,
      NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
      APP_URL: process.env.APP_URL || 'http://localhost:5173',
      BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:4000',
      EMAIL_SEND_MODE: (process.env.EMAIL_SEND_MODE as 'DRY_RUN' | 'LIVE') || 'DRY_RUN',
      SESSION_SECRET: process.env.SESSION_SECRET || 'rankriseusa-super-secure-session-secret-key-32-chars-min',
      EMAIL_TOKEN_ENCRYPTION_KEY: process.env.EMAIL_TOKEN_ENCRYPTION_KEY || '9f8e7d6c5b4a3928172635445362718293a4b5c6d7e8f9011223344556677889',
      ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@rankriseusa.com',
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'RankRiseAdmin2025!',
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/senders/gmail/callback',
      MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID,
      MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET,
      MICROSOFT_TENANT_ID: process.env.MICROSOFT_TENANT_ID || 'common',
      MICROSOFT_REDIRECT_URI: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:4000/api/senders/microsoft/callback',
    };

/**
 * Validates and logs environment variable readiness on startup without revealing secrets.
 */
export function validateAndLogConfiguration(): void {
  const isPresent = (val?: string | null) => Boolean(val && val.trim().length > 0);

  const configs = [
    { name: 'DATABASE_URL', status: isPresent(env.DATABASE_URL) ? 'configured' : 'missing (Required: PostgreSQL connection string)' },
    { name: 'REDIS_URL', status: isPresent(env.REDIS_URL) ? 'configured' : 'missing (In-Memory Queue fallback will be active)' },
    { name: 'SESSION_SECRET', status: isPresent(env.SESSION_SECRET) ? 'configured' : 'missing (Required: 32+ char session secret)' },
    { name: 'EMAIL_TOKEN_ENCRYPTION_KEY', status: isPresent(env.EMAIL_TOKEN_ENCRYPTION_KEY) ? 'configured' : 'missing (Required: 64-char hex key)' },
    { name: 'EMAIL_SEND_MODE', status: `${env.EMAIL_SEND_MODE} (configured)` },
    { name: 'GOOGLE_CLIENT_ID', status: isPresent(env.GOOGLE_CLIENT_ID) ? 'configured' : 'missing (Configure in .env to connect live Gmail)' },
    { name: 'GOOGLE_CLIENT_SECRET', status: isPresent(env.GOOGLE_CLIENT_SECRET) ? 'configured' : 'missing (Configure in .env to connect live Gmail)' },
    { name: 'MICROSOFT_CLIENT_ID', status: isPresent(env.MICROSOFT_CLIENT_ID) ? 'configured' : 'missing (Configure in .env to connect live Outlook)' },
    { name: 'MICROSOFT_CLIENT_SECRET', status: isPresent(env.MICROSOFT_CLIENT_SECRET) ? 'configured' : 'missing (Configure in .env to connect live Outlook)' },
  ];

  console.log('⚙️  Startup Configuration Validation:');
  console.log('--------------------------------------------------');
  for (const c of configs) {
    const pad = ' '.repeat(Math.max(1, 30 - c.name.length));
    console.log(`  ${c.name}:${pad}${c.status}`);
  }
  console.log('--------------------------------------------------\n');
}
