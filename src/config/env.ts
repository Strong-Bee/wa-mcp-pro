import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_NAME: z.string().default('WA-MCP-Pro'),
  APP_VERSION: z.string().default('1.0.0'),

  HOST: z.string().ip().default('127.0.0.1'),
  PORT: z.coerce.number().int().positive().default(3000),

  MCP_TRANSPORT: z.enum(['stdio', 'http', 'hybrid']).default('stdio'),
  MCP_HTTP_ENABLED: z.coerce.boolean().default(false),
  MCP_HTTP_PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.string().default('./storage/wa-mcp.db'),

  SESSION_DIRECTORY: z.string().default('./storage/sessions'),
  MEDIA_DIRECTORY: z.string().default('./storage/media'),
  LOG_DIRECTORY: z.string().default('./storage/logs'),

  ENCRYPTION_KEY: z.string().min(64).optional(),
  API_KEY: z.string().min(64).optional(),

  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW: z.coerce.number().int().positive().default(60000),

  MAX_MEDIA_SIZE_MB: z.coerce.number().int().positive().default(50),

  WHATSAPP_AUTO_RECONNECT: z.coerce.boolean().default(true),
  WHATSAPP_RECONNECT_MAX_ATTEMPTS: z.coerce.number().int().positive().default(10),
  WHATSAPP_MESSAGE_HISTORY_LIMIT: z.coerce.number().int().positive().default(10000),
});

export type EnvConfig = z.infer<typeof envSchema>;

let cachedConfig: EnvConfig | null = null;

export function getConfig(): EnvConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
      .join('\n');
    throw new Error(`Configuration validation failed:\n${errorMessages}`);
  }

  cachedConfig = parsed.data;
  return cachedConfig;
}

export function resetConfig(): void {
  cachedConfig = null;
}