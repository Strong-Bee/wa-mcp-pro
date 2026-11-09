import { describe, it, expect } from 'vitest';
import {
  normalizeJid,
  normalizeGroupJid,
  isGroupJid,
  isUserJid,
  formatPhoneNumber,
  isValidPhoneNumber,
  jidToPhoneNumber,
  phoneNumberToJid,
} from '../../src/utils/jid.js';
import { sanitizeFilename, sanitizePath, truncate, stripAnsi, escapeMarkdown } from '../../src/utils/sanitize.js';
import { formatTimestamp, formatDuration, getRelativeTime } from '../../src/utils/date.js';
import { sleep, retry, CircuitBreaker } from '../../src/utils/retry.js';

describe('JID Utils', () => {
  it('should normalize phone number to JID', () => {
    expect(normalizeJid('1234567890')).toBe('1234567890@s.whatsapp.net');
    expect(normalizeJid('+1234567890')).toBe('1234567890@s.whatsapp.net');
  });

  it('should normalize group JID', () => {
    expect(normalizeGroupJid('1234567890')).toBe('1234567890@g.us');
  });

  it('should detect group JID', () => {
    expect(isGroupJid('1234567890@g.us')).toBe(true);
    expect(isGroupJid('1234567890@s.whatsapp.net')).toBe(false);
  });

  it('should detect user JID', () => {
    expect(isUserJid('1234567890@s.whatsapp.net')).toBe(true);
    expect(isUserJid('1234567890@lid')).toBe(true);
    expect(isUserJid('1234567890@g.us')).toBe(false);
  });

  it('should format phone number', () => {
    expect(formatPhoneNumber('1234567890')).toBe('+1234567890');
    expect(formatPhoneNumber('+1234567890')).toBe('+1234567890');
  });

  it('should validate phone number', () => {
    expect(isValidPhoneNumber('1234567890')).toBe(true);
    expect(isValidPhoneNumber('123')).toBe(false);
    expect(isValidPhoneNumber('1234567890123456')).toBe(false);
  });

  it('should convert JID to phone', () => {
    expect(jidToPhoneNumber('1234567890@s.whatsapp.net')).toBe('+1234567890');
  });

  it('should convert phone to JID', () => {
    expect(phoneNumberToJid('+1234567890')).toBe('1234567890@s.whatsapp.net');
  });
});

describe('Sanitize Utils', () => {
  it('should sanitize filename', () => {
    expect(sanitizeFilename('test file.txt')).toBe('test_file.txt');
    // path.basename extracts just the filename, so '../../../etc/passwd' -> 'passwd'
    expect(sanitizeFilename('../../../etc/passwd')).toBe('passwd');
  });

  it('should prevent path traversal', () => {
    expect(() => sanitizePath('../../../etc/passwd', '/app')).toThrow();
    // On Windows, path.resolve uses Windows path format
    const result = sanitizePath('subdir/file.txt', '/app');
    expect(result).toContain('subdir');
    expect(result).toContain('file.txt');
  });

  it('should truncate string', () => {
    expect(truncate('hello world', 8)).toBe('hello...');
    expect(truncate('hi', 10)).toBe('hi');
  });

  it('should strip ANSI codes', () => {
    expect(stripAnsi('\x1b[31mred\x1b[0m')).toBe('red');
  });

  it('should escape markdown', () => {
    expect(escapeMarkdown('*bold*')).toBe('\\*bold\\*');
  });
});

describe('Date Utils', () => {
  it('should format timestamp', () => {
    const date = new Date('2024-01-01T00:00:00Z');
    expect(formatTimestamp(date)).toBe('2024-01-01T00:00:00.000Z');
  });

  it('should format duration', () => {
    expect(formatDuration(500)).toBe('500ms');
    expect(formatDuration(5000)).toBe('5.0s');
    expect(formatDuration(60000)).toBe('1.0m');
    expect(formatDuration(3600000)).toBe('1.0h');
  });

  it('should get relative time', () => {
    const now = new Date();
    const past = new Date(now.getTime() - 30000);
    // 30 seconds is under 60 seconds, so returns 'just now'
    expect(getRelativeTime(past, now)).toBe('just now');
  });

  it('should get relative time for minutes', () => {
    const now = new Date();
    const past = new Date(now.getTime() - 120000); // 2 minutes ago
    expect(getRelativeTime(past, now)).toBe('2m ago');
  });
});

describe('Retry Utils', () => {
  it('should sleep', async () => {
    const start = Date.now();
    await sleep(50);
    expect(Date.now() - start).toBeGreaterThanOrEqual(40);
  });

  it('should retry on failure', async () => {
    let attempts = 0;
    const result = await retry(async () => {
      attempts++;
      if (attempts < 3) throw new Error('fail');
      return 'success';
    }, { maxAttempts: 3, baseDelay: 10 });
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should fail after max attempts', async () => {
    await expect(retry(async () => { throw new Error('fail'); }, { maxAttempts: 2, baseDelay: 10 }))
      .rejects.toThrow('fail');
  });

  it('should circuit break', async () => {
    const breaker = new CircuitBreaker(2, 1000);
    await expect(breaker.execute(async () => { throw new Error('fail'); })).rejects.toThrow();
    await expect(breaker.execute(async () => { throw new Error('fail'); })).rejects.toThrow();
    expect(breaker.getState()).toBe('open');
  });
});