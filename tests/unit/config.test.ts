import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getConfig, resetConfig } from '../../src/config/env.js';

describe('Config', () => {
  beforeEach(() => {
    resetConfig();
    vi.resetModules();
  });

  afterEach(() => {
    resetConfig();
  });

  it('should load default config', () => {
    const config = getConfig();
    expect(config.APP_NAME).toBe('WA-MCP-Pro');
    expect(config.APP_VERSION).toBe('1.0.0');
    expect(config.PORT).toBe(3000);
    expect(config.MCP_TRANSPORT).toBe('stdio');
  });

  it('should validate required fields', () => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
    process.env.API_KEY = 'b'.repeat(64);

    const config = getConfig();
    expect(config.ENCRYPTION_KEY).toBeDefined();
    expect(config.API_KEY).toBeDefined();
  });

  it('should reject invalid ENCRYPTION_KEY length', () => {
    process.env.ENCRYPTION_KEY = 'short';
    expect(() => getConfig()).toThrow();
  });
});