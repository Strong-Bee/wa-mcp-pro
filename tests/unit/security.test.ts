import { describe, it, expect } from 'vitest';
import { hashApiKey, verifyApiKey, generateApiKey, hasPermission } from '../../src/security/api-key.js';
import { encrypt, decrypt } from '../../src/security/encryption.js';
import { redactSecrets, sanitizeForLog } from '../../src/security/secret-redaction.js';

describe('Security', () => {
  describe('API Key', () => {
    it('should hash and verify API key', async () => {
      const key = generateApiKey();
      const hash = await hashApiKey(key);
      const valid = await verifyApiKey(key, hash);
      expect(valid).toBe(true);
    });

    it('should reject invalid API key', async () => {
      const key = generateApiKey();
      const hash = await hashApiKey(key);
      const valid = await verifyApiKey('invalid_key', hash);
      expect(valid).toBe(false);
    });

    it('should check permissions', () => {
      const perms = ['accounts:read', 'messages:send'];
      expect(hasPermission(perms, 'accounts:read')).toBe(true);
      expect(hasPermission(perms, 'accounts:manage')).toBe(false);
      expect(hasPermission(['*'], 'anything')).toBe(true);
    });
  });

  describe('Encryption', () => {
    it('should encrypt and decrypt', async () => {
      process.env.ENCRYPTION_KEY = 'a'.repeat(64);

      const data = 'test secret data';
      const encrypted = await encrypt(data);
      const decrypted = await decrypt(encrypted);
      expect(decrypted).toBe(data);
    });

    it('should produce different ciphertext for same input', async () => {
      process.env.ENCRYPTION_KEY = 'a'.repeat(64);

      const data = 'test';
      const enc1 = await encrypt(data);
      const enc2 = await encrypt(data);
      expect(enc1).not.toBe(enc2);
    });
  });

  describe('Secret Redaction', () => {
    it('should redact base64 secrets', () => {
      const input = 'key: dGhpcyBpcyBhIHNlY3JldA==';
      const result = redactSecrets(input);
      expect(result).toContain('[REDACTED_BASE64_SECRET]');
    });

    it('should redact hex secrets', () => {
      const input = 'secret: a'.repeat(64);
      const result = redactSecrets(input);
      expect(result).toContain('[REDACTED_HEX_SECRET]');
    });

    it('should redact API keys', () => {
      const input = 'api_key: wamp_abc123';
      const result = redactSecrets(input);
      expect(result).toContain('[REDACTED_WA_MCP_KEY]');
    });

    it('should sanitize objects', () => {
      const obj = {
        password: 'secret123',
        nested: {
          apiKey: 'wamp_xyz789',
        },
      };
      const result = sanitizeForLog(obj);
      expect(result.password).toContain('[REDACTED');
      expect(result.nested.apiKey).toContain('[REDACTED');
    });
  });
});