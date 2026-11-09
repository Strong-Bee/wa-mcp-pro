import { getLogger } from '../core/logger.js';

const logger = getLogger().child({ component: 'SecretRedaction' });

const SECRET_PATTERNS = [
  // Specific patterns first (with prefixes) to avoid being caught by broad BASE64 pattern
  { pattern: /sk-[a-zA-Z0-9]{48}/g, label: 'OPENAI_KEY' },
  { pattern: /wamp_[a-zA-Z0-9]{64}/g, label: 'WA_MCP_KEY' },
  { pattern: /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/g, label: 'BEARER_TOKEN' },
  // Key-value patterns
  { pattern: /password["\s:=]+["']?[^"'\s]+/gi, label: 'PASSWORD' },
  { pattern: /secret["\s:=]+["']?[^"'\s]+/gi, label: 'SECRET' },
  { pattern: /api[_-]?key["\s:=]+["']?[^"'\s]+/gi, label: 'API_KEY' },
  { pattern: /token["\s:=]+["']?[^"'\s]+/gi, label: 'TOKEN' },
  // Broad patterns last
  { pattern: /[a-fA-F0-9]{64}/g, label: 'HEX_SECRET' },
  { pattern: /[a-zA-Z0-9+/]{32,}/g, label: 'BASE64_SECRET' },
];

export function redactSecrets(input: string): string {
  let result = input;

  for (const { pattern, label } of SECRET_PATTERNS) {
    result = result.replace(pattern, `[REDACTED_${label}]`);
  }

  return result;
}

export function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = { ...obj };

  for (const key of Object.keys(redacted)) {
    const value = redacted[key];

    if (typeof value === 'string') {
      redacted[key] = redactSecrets(value);
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactObject(value as Record<string, unknown>);
    }
  }

  return redacted;
}

export function sanitizeForLog(data: unknown): unknown {
  if (typeof data === 'string') {
    return redactSecrets(data);
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeForLog);
  }

  if (typeof data === 'object' && data !== null) {
    return redactObject(data as Record<string, unknown>);
  }

  return data;
}