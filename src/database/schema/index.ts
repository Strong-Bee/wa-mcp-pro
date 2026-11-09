export * from './accounts.js';
export * from './sessions.js';
export * from './messages.js';
export * from './contacts.js';
export * from './chats.js';
export * from './groups.js';
export * from './automations.js';
export * from './api_keys.js';
export * from './audit_logs.js';

import { accounts } from './accounts.js';
import { sessions } from './sessions.js';
import { messages } from './messages.js';
import { contacts } from './contacts.js';
import { chats } from './chats.js';
import { groups } from './groups.js';
import { automations } from './automations.js';
import { apiKeys } from './api_keys.js';
import { auditLogs } from './audit_logs.js';

export const schema = {
  accounts,
  sessions,
  messages,
  contacts,
  chats,
  groups,
  automations,
  apiKeys,
  auditLogs,
};