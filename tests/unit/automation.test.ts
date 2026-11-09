import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the database module at the top level (vi.mock is hoisted)
vi.mock('../../src/database/client.js', () => ({
  getDatabase: vi.fn(),
}));

vi.mock('../../src/database/schema/messages.js', () => ({
  messages: {
    accountId: 'accountId',
    chatJid: 'chatJid',
    direction: 'direction',
    messageContent: 'messageContent',
    timestamp: 'timestamp',
  },
}));

import { getDatabase } from '../../src/database/client.js';

describe('Automation Rules', () => {
  // Import inside to avoid hoisting issues with vi.mock
  let matchTrigger: any;
  let checkConditions: any;

  beforeEach(async () => {
    const engine = await import('../../src/automation/engine.js');
    const rules = await import('../../src/automation/rules.js');
    matchTrigger = engine.matchTrigger;
    checkConditions = rules.checkConditions;
  });

  describe('matchTrigger', () => {
    it('should match exact match', () => {
      const rule = { triggerType: 'exact_match' as const, triggerValue: 'hello' };
      expect(matchTrigger(rule, 'hello')).toBe(true);
      expect(matchTrigger(rule, 'hello world')).toBe(false);
    });

    it('should match keyword', () => {
      const rule = { triggerType: 'keyword' as const, triggerValue: 'help' };
      expect(matchTrigger(rule, 'I need help')).toBe(true);
      expect(matchTrigger(rule, 'helper')).toBe(true);
      expect(matchTrigger(rule, 'no match')).toBe(false);
    });

    it('should match command', () => {
      const rule = { triggerType: 'command' as const, triggerValue: 'start' };
      expect(matchTrigger(rule, '/start')).toBe(true);
      expect(matchTrigger(rule, '/start param')).toBe(true);
      expect(matchTrigger(rule, 'start')).toBe(false);
    });

    it('should match regex', () => {
      const rule = { triggerType: 'regex' as const, triggerValue: '^order\\s+\\d+$' };
      expect(matchTrigger(rule, 'order 123')).toBe(true);
      expect(matchTrigger(rule, 'order abc')).toBe(false);
    });

    it('should be case insensitive', () => {
      const rule = { triggerType: 'keyword' as const, triggerValue: 'HELLO' };
      expect(matchTrigger(rule, 'hello')).toBe(true);
      expect(matchTrigger(rule, 'Hello')).toBe(true);
    });
  });

  describe('checkConditions', () => {
    it('should pass when no conditions', () => {
      const rule = { conditions: undefined };
      const context = { fromJid: '1@s.whatsapp.net', chatJid: '2@s.whatsapp.net', isGroup: false, messageType: 'text', timestamp: new Date() };
      expect(checkConditions(rule, context)).toBe(true);
    });

    it('should check fromContacts', () => {
      const rule = { conditions: { fromContacts: ['1@s.whatsapp.net'] } };
      const context = { fromJid: '1@s.whatsapp.net', chatJid: '2@s.whatsapp.net', isGroup: false, messageType: 'text', timestamp: new Date() };
      expect(checkConditions(rule, context)).toBe(true);

      context.fromJid = '2@s.whatsapp.net';
      expect(checkConditions(rule, context)).toBe(false);
    });

    it('should check excludeContacts', () => {
      const rule = { conditions: { excludeContacts: ['1@s.whatsapp.net'] } };
      const context = { fromJid: '1@s.whatsapp.net', chatJid: '2@s.whatsapp.net', isGroup: false, messageType: 'text', timestamp: new Date() };
      expect(checkConditions(rule, context)).toBe(false);
    });
  });
});

describe('Automation Guards', () => {
  let checkRateLimit: any;
  let checkOptOut: any;
  let checkLoopPrevention: any;
  let validateAutomationExecution: any;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    const guards = await import('../../src/automation/guards.js');
    checkRateLimit = guards.checkRateLimit;
    checkOptOut = guards.checkOptOut;
    checkLoopPrevention = guards.checkLoopPrevention;
    validateAutomationExecution = guards.validateAutomationExecution;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should check rate limit', async () => {
    const allowed = await checkRateLimit('acc1', 'user1', 2, 60000);
    expect(allowed).toBe(true);

    await checkRateLimit('acc1', 'user1', 2, 60000);
    const denied = await checkRateLimit('acc1', 'user1', 2, 60000);
    expect(denied).toBe(false);
  });

  it('should reset rate limit after window', async () => {
    await checkRateLimit('acc1', 'user1', 1, 1000);
    vi.advanceTimersByTime(1100);
    const allowed = await checkRateLimit('acc1', 'user1', 1, 1000);
    expect(allowed).toBe(true);
  });

  it('should check opt-out keywords', async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        { messageContent: 'STOP', direction: 'inbound' },
      ]),
    };
    (getDatabase as any).mockReturnValue(mockDb);

    const optedOut = await checkOptOut('acc1', 'user1');
    expect(optedOut).toBe(true);
  });

  it('should check loop prevention', async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        { messageContent: 'same response', direction: 'outbound' },
        { messageContent: 'same response', direction: 'outbound' },
        { messageContent: 'same response', direction: 'outbound' },
      ]),
    };
    (getDatabase as any).mockReturnValue(mockDb);

    const looped = await checkLoopPrevention('acc1', 'chat1', 'same response');
    expect(looped).toBe(false);
  });
});