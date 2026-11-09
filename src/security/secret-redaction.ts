const SECRET_PATTERNS = [
  { pattern: /wamp_[a-zA-Z0-9_-]{6,}/g, label: 'WA_MCP_KEY' },
  { pattern: /[a-fA-F0-9]{64}/g, label: 'HEX_SECRET' },
  { pattern: /[A-Za-z0-9+/]{16,}={0,2}/g, label: 'BASE64_SECRET' },
  { pattern: /sk-[a-zA-Z0-9]{20,}/g, label: 'OPENAI_KEY' },
  { pattern: /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/g, label: 'BEARER_TOKEN' },
  { pattern: /password["\s:=]+["']?(?!\[REDACTED_)[^"'\s]+/gi, label: 'PASSWORD' },
  { pattern: /secret["\s:=]+["']?(?!\[REDACTED_)[^"'\s]+/gi, label: 'SECRET' },
  { pattern: /api[_-]?key["\s:=]+["']?(?!\[REDACTED_)[^"'\s]+/gi, label: 'API_KEY' },
  { pattern: /token["\s:=]+["']?(?!\[REDACTED_)[^"'\s]+/gi, label: 'TOKEN' },
];

export function redactSecrets(input: string): string {
  return SECRET_PATTERNS.reduce(
    (result, { pattern, label }) => result.replace(pattern, '[REDACTED_' + label + ']'),
    input
  );
}

const SENSITIVE_KEY_PATTERN = /password|secret|token|api[_-]?key|authorization/i;

export function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      redacted[key] = '[REDACTED_SECRET]';
    } else if (typeof value === 'string') {
      redacted[key] = redactSecrets(value);
    } else if (Array.isArray(value)) {
      redacted[key] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? redactObject(item as Record<string, unknown>)
          : typeof item === 'string'
            ? redactSecrets(item)
            : item
      );
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactObject(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

export function sanitizeForLog(data: unknown): unknown {
  if (typeof data === 'string') return redactSecrets(data);
  if (Array.isArray(data)) return data.map(sanitizeForLog);
  if (typeof data === 'object' && data !== null) {
    return redactObject(data as Record<string, unknown>);
  }
  return data;
}
