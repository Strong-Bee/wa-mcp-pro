import { z } from 'zod';

export const automationRuleSchema = z.object({
  name: z.string().min(1).max(100),
  triggerType: z.enum(['keyword', 'exact_match', 'regex', 'command']),
  triggerValue: z.string().min(1),
  response: z.string().min(1),
  enabled: z.boolean().default(true),
  cooldown: z.number().int().nonnegative().default(0),
  conditions: z.object({
    fromContacts: z.array(z.string()).optional(),
    fromGroups: z.array(z.string()).optional(),
    excludeContacts: z.array(z.string()).optional(),
    excludeGroups: z.array(z.string()).optional(),
    timeRange: z.object({
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/),
      timezone: z.string().default('UTC'),
    }).optional(),
    messageTypes: z.array(z.enum(['text', 'image', 'video', 'document', 'audio'])).optional(),
  }).optional(),
});

export type AutomationRuleInput = z.infer<typeof automationRuleSchema>;

export function validateAutomationRule(data: unknown): AutomationRuleInput {
  return automationRuleSchema.parse(data);
}

export function matchTrigger(
  rule: Pick<AutomationRuleInput, 'triggerType' | 'triggerValue'>,
  message: string
): boolean {
  const input = message.trim();
  const trigger = rule.triggerValue.trim();

  if (!trigger || !input) return false;

  switch (rule.triggerType) {
    case 'exact_match':
      return input.toLocaleLowerCase() === trigger.toLocaleLowerCase();
    case 'keyword':
      return input.toLocaleLowerCase().includes(trigger.toLocaleLowerCase());
    case 'command': {
      const command = trigger.startsWith('/') ? trigger : '/' + trigger;
      const normalizedInput = input.toLocaleLowerCase();
      const normalizedCommand = command.toLocaleLowerCase();
      return normalizedInput === normalizedCommand || normalizedInput.startsWith(normalizedCommand + ' ');
    }
    case 'regex':
      try {
        return new RegExp(trigger, 'i').test(input);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

export function checkConditions(
  rule: AutomationRuleInput,
  context: {
    fromJid: string;
    chatJid: string;
    isGroup: boolean;
    messageType: string;
    timestamp: Date;
  }
): boolean {
  if (!rule.conditions) return true;

  if (rule.conditions.fromContacts?.length && !rule.conditions.fromContacts.includes(context.fromJid)) {
    return false;
  }

  if (rule.conditions.fromGroups?.length && !rule.conditions.fromGroups.includes(context.chatJid)) {
    return false;
  }

  if (rule.conditions.excludeContacts?.length && rule.conditions.excludeContacts.includes(context.fromJid)) {
    return false;
  }

  if (rule.conditions.excludeGroups?.length && rule.conditions.excludeGroups.includes(context.chatJid)) {
    return false;
  }

  if (rule.conditions.messageTypes?.length && !rule.conditions.messageTypes.includes(context.messageType as any)) {
    return false;
  }

  if (rule.conditions.timeRange) {
    const now = context.timestamp;
    const currentTime = now.toTimeString().slice(0, 5);
    const { start, end } = rule.conditions.timeRange;

    if (start <= end) {
      if (currentTime < start || currentTime > end) return false;
    } else {
      if (currentTime < start && currentTime > end) return false;
    }
  }

  return true;
}