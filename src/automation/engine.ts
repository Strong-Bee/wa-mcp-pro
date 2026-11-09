import { getLogger } from '../core/logger.js';
import { getDatabase } from '../database/client.js';
import { automations, messages } from '../database/schema/index.js';
import { eq, and, desc, gte } from 'drizzle-orm';
import { eventBus, subscribe } from '../core/events.js';
import { EVENT_TYPES } from '../config/constants.js';
import { sendTextMessage } from '../whatsapp/message-service.js';
import { AppError, ERROR_CODES } from '../core/errors.js';

const logger = getLogger().child({ component: 'AutomationEngine' });

interface AutomationRule {
  id: string;
  accountId: string;
  name: string;
  triggerType: 'keyword' | 'exact_match' | 'regex' | 'command';
  triggerValue: string;
  response: string;
  enabled: boolean;
  cooldown: number;
  lastTriggered?: Date;
}

const ruleCache = new Map<string, AutomationRule[]>();
const cooldownCache = new Map<string, number>();

export async function loadAutomations(accountId: string): Promise<void> {
  const db = getDatabase();
  const rules = await db
    .select()
    .from(automations)
    .where(and(eq(automations.accountId, accountId), eq(automations.enabled, true)));

  ruleCache.set(accountId, rules as AutomationRule[]);
  logger.debug({ accountId, count: rules.length }, 'Automations loaded');
}

export async function reloadAutomations(accountId: string): Promise<void> {
  await loadAutomations(accountId);
}

export function matchTrigger(rule: AutomationRule, messageText: string): boolean {
  const text = messageText.toLowerCase().trim();
  const trigger = rule.triggerValue.toLowerCase().trim();

  switch (rule.triggerType) {
    case 'exact_match':
      return text === trigger;
    case 'keyword':
      return text.includes(trigger);
    case 'command':
      return text.startsWith('/' + trigger);
    case 'regex':
      try {
        const regex = new RegExp(trigger, 'i');
        return regex.test(text);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

export function isInCooldown(rule: AutomationRule): boolean {
  const key = `${rule.accountId}:${rule.id}`;
  const lastTriggered = cooldownCache.get(key);
  if (!lastTriggered) return false;

  const now = Date.now();
  return (now - lastTriggered) < rule.cooldown * 1000;
}

export function setCooldown(rule: AutomationRule): void {
  const key = `${rule.accountId}:${rule.id}`;
  cooldownCache.set(key, Date.now());
}

export async function processIncomingMessage(
  accountId: string,
  messageId: string,
  fromJid: string,
  text: string,
  isGroup: boolean
): Promise<void> {
  const rules = ruleCache.get(accountId) || [];
  if (rules.length === 0) return;

  for (const rule of rules) {
    if (!rule.enabled) continue;

    if (isInCooldown(rule)) continue;

    if (matchTrigger(rule, text)) {
      try {
        await executeAutomation(accountId, rule, fromJid, messageId);
        setCooldown(rule);
      } catch (error) {
        logger.error({ accountId, ruleId: rule.id, error }, 'Automation execution failed');
      }
    }
  }
}

async function executeAutomation(
  accountId: string,
  rule: AutomationRule,
  fromJid: string,
  messageId: string
): Promise<void> {
  logger.info({ accountId, ruleId: rule.id, fromJid }, 'Executing automation');

  const result = await sendTextMessage({
    to: fromJid,
    message: rule.response,
    replyTo: messageId,
  });

  eventBus.emit(EVENT_TYPES[13], accountId, {
    ruleId: rule.id,
    messageId,
    responseMessageId: result.messageId,
    timestamp: new Date(),
    success: true,
  });

  logger.info({ accountId, ruleId: rule.id, responseMessageId: result.messageId }, 'Automation executed successfully');
}

export async function getAutomationLogs(accountId: string, limit: number = 50): Promise<any[]> {
  // This would query an automation_logs table if we had one
  // For now, return empty array
  return [];
}

subscribe(EVENT_TYPES[4], async (accountId: string, message: any) => {
  if (!message.isFromMe && message.type === 'text') {
    await processIncomingMessage(accountId, message.id, message.from, message.content, message.isGroup);
  }
});

export function clearCache(accountId?: string): void {
  if (accountId) {
    ruleCache.delete(accountId);
  } else {
    ruleCache.clear();
    cooldownCache.clear();
  }
}