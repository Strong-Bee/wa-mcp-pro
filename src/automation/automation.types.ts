export interface AutomationRule {
  id: string;
  accountId: string;
  name: string;
  triggerType: 'keyword' | 'exact_match' | 'regex' | 'command' | 'schedule';
  triggerValue: string;
  response: string;
  enabled: boolean;
  cooldown: number;
  conditions?: {
    fromContacts?: string[];
    fromGroups?: string[];
    excludeContacts?: string[];
    excludeGroups?: string[];
    timeRange?: {
      start: string;
      end: string;
      timezone: string;
    };
    messageTypes?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  lastTriggered?: Date;
}

export interface AutomationLog {
  id: string;
  ruleId: string;
  accountId: string;
  messageId: string;
  fromJid: string;
  response: string;
  success: boolean;
  error?: string;
  triggeredAt: Date;
}

export interface AutomationContext {
  accountId: string;
  messageId: string;
  fromJid: string;
  chatJid: string;
  isGroup: boolean;
  messageType: string;
  messageContent: string;
  timestamp: Date;
}

export type TriggerType = 'keyword' | 'exact_match' | 'regex' | 'command' | 'schedule';

export const TRIGGER_TYPES: TriggerType[] = ['keyword', 'exact_match', 'regex', 'command', 'schedule'];