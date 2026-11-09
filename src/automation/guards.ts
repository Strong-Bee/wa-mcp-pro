import { getLogger } from '../core/logger.js';
import { getDatabase } from '../database/client.js';
import { messages } from '../database/schema/messages.js';
import { eq, and, gte } from 'drizzle-orm';

const logger = getLogger().child({ component: 'AutomationGuards' });

const recentMessages = new Map<string, { count: number; windowStart: number }>();

export async function checkRateLimit(
  accountId: string,
  fromJid: string,
  maxMessages: number = 5,
  windowMs: number = 60000
): Promise<boolean> {
  const key = `${accountId}:${fromJid}`;
  const now = Date.now();

  let record = recentMessages.get(key);
  if (!record || now - record.windowStart > windowMs) {
    record = { count: 0, windowStart: now };
    recentMessages.set(key, record);
  }

  record.count++;

  if (record.count > maxMessages) {
    logger.warn({ accountId, fromJid, count: record.count }, 'Rate limit exceeded for automation');
    return false;
  }

  return true;
}

export async function checkOptOut(accountId: string, fromJid: string): Promise<boolean> {
  const db = getDatabase();
  const optOutKeywords = ['stop', 'unsubscribe', 'opt out', 'opt-out'];

  const recent = await db
    .select()
    .from(messages)
    .where(and(
      eq(messages.accountId, accountId),
      eq(messages.senderJid, fromJid),
      eq(messages.direction, 'inbound')
    ))
    .orderBy(messages.timestamp.desc())
    .limit(10);

  for (const msg of recent) {
    const content = msg.messageContent.toLowerCase();
    if (optOutKeywords.some(k => content.includes(k))) {
      logger.info({ accountId, fromJid }, 'User opted out of automations');
      return true;
    }
  }

  return false;
}

export async function checkLoopPrevention(
  accountId: string,
  toJid: string,
  response: string,
  maxSimilar: number = 3
): Promise<boolean> {
  const db = getDatabase();
  const recent = await db
    .select()
    .from(messages)
    .where(and(
      eq(messages.accountId, accountId),
      eq(messages.chatJid, toJid),
      eq(messages.direction, 'outbound')
    ))
    .orderBy(messages.timestamp.desc())
    .limit(10);

  let similarCount = 0;
  for (const msg of recent) {
    if (msg.messageContent === response) {
      similarCount++;
    }
  }

  if (similarCount >= maxSimilar) {
    logger.warn({ accountId, toJid, similarCount }, 'Loop prevention triggered');
    return false;
  }

  return true;
}

export function sanitizeResponse(response: string): string {
  return response
    .replace(/@everyone/g, '')
    .replace(/@here/g, '')
    .trim();
}

export async function validateAutomationExecution(
  accountId: string,
  fromJid: string,
  toJid: string,
  response: string
): Promise<{ allowed: boolean; reason?: string }> {
  const rateLimited = await checkRateLimit(accountId, fromJid);
  if (!rateLimited) {
    return { allowed: false, reason: 'Rate limit exceeded' };
  }

  const optedOut = await checkOptOut(accountId, fromJid);
  if (optedOut) {
    return { allowed: false, reason: 'User opted out' };
  }

  const loopPrevented = await checkLoopPrevention(accountId, toJid, response);
  if (!loopPrevented) {
    return { allowed: false, reason: 'Loop prevention' };
  }

  return { allowed: true };
}