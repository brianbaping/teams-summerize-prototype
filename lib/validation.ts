/**
 * Input validation schemas using Zod
 * Validates data at system boundaries (user input, API requests)
 */

import { z } from 'zod';

/**
 * Schema for chat selection payload
 */
export const chatSelectionSchema = z.object({
  chatId: z.string().min(1, 'Chat ID is required'),
  chatName: z.string().optional(),
  chatType: z.string().optional(),
  status: z.enum(['active', 'ignored']).optional(),
});

export type ChatSelection = z.infer<typeof chatSelectionSchema>;

/**
 * Schema for date range parameters
 */
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

export type DateRange = z.infer<typeof dateRangeSchema>;

/**
 * Schema for summary generation request
 */
export const summaryRequestSchema = z.object({
  chatId: z.string().min(1, 'Chat ID is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
});

export type SummaryRequest = z.infer<typeof summaryRequestSchema>;

/**
 * Schema for message fetching parameters
 */
export const messageFetchSchema = z.object({
  chatId: z.string().min(1, 'Chat ID is required'),
  since: z.string().datetime().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type MessageFetch = z.infer<typeof messageFetchSchema>;

/**
 * Schema for environment variables validation (all variables as optional first)
 */
export const envSchema = z.object({
  AZURE_AD_CLIENT_ID: z.string().min(1, 'Azure AD Client ID is required'),
  AZURE_AD_CLIENT_SECRET: z.string().min(1, 'Azure AD Client Secret is required'),
  AZURE_AD_TENANT_ID: z.string().min(1, 'Azure AD Tenant ID is required'),
  NEXTAUTH_URL: z.string().url('NextAuth URL must be a valid URL'),
  NEXTAUTH_SECRET: z.string().min(32, 'NextAuth secret must be at least 32 characters'),
  AI_PROVIDER: z.enum(['ollama', 'claude']).optional().default('ollama'),
  OLLAMA_BASE_URL: z.string().url('Ollama base URL must be a valid URL').optional(),
  OLLAMA_MODEL: z.string().min(1, 'Ollama model is required').optional(),
  ANTHROPIC_API_KEY: z.string().min(1, 'Anthropic API key is required').optional(),
  CLAUDE_MODEL: z.string().min(1, 'Claude model name is required').optional(),
  DATABASE_PATH: z.string().min(1, 'Database path is required'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validate environment variables on startup
 * Throws if any required variables are missing or invalid
 * Conditional validation based on AI_PROVIDER
 */
export function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`Environment variable validation failed:\n${errors.join('\n')}`);
  }

  const config = result.data;
  const provider = config.AI_PROVIDER || 'ollama';

  // Validate provider-specific required variables
  if (provider === 'ollama') {
    if (!config.OLLAMA_BASE_URL) {
      throw new Error('OLLAMA_BASE_URL is required when AI_PROVIDER=ollama');
    }
    if (!config.OLLAMA_MODEL) {
      throw new Error('OLLAMA_MODEL is required when AI_PROVIDER=ollama');
    }
  } else if (provider === 'claude') {
    if (!config.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is required when AI_PROVIDER=claude');
    }
  }

  return config;
}
