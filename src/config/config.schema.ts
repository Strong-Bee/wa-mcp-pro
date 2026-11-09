import { z } from 'zod';

export const accountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  phoneNumber: z.string().regex(/^\+\d{10,15}$/),
  status: z.enum(['disconnected', 'connecting', 'qr_pending', 'authenticated', 'connected', 'reconnecting', 'logged_out', 'error']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const sessionSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  encryptedCredentials: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const messageSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  chatJid: z.string(),
  messageId: z.string(),
  senderJid: z.string(),
  messageType: z.enum(['text', 'image', 'video', 'document', 'audio', 'location', 'contact', 'reaction', 'sticker', 'poll']),
  messageContent: z.string(),
  direction: z.enum(['inbound', 'outbound']),
  timestamp: z.date(),
  status: z.enum(['pending', 'sent', 'delivered', 'read', 'failed']),
  createdAt: z.date(),
});

export const contactSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  jid: z.string(),
  name: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  profilePictureUrl: z.string().url().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const chatSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  chatJid: z.string(),
  name: z.string().nullable(),
  isGroup: z.boolean(),
  unreadCount: z.number().int().nonnegative().default(0),
  lastMessageAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const groupSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  groupJid: z.string(),
  subject: z.string(),
  description: z.string().nullable(),
  ownerJid: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const automationSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  name: z.string().min(1).max(100),
  triggerType: z.enum(['keyword', 'exact_match', 'regex', 'command']),
  triggerValue: z.string(),
  response: z.string(),
  enabled: z.boolean().default(true),
  cooldown: z.number().int().nonnegative().default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const apiKeySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  keyHash: z.string(),
  permissions: z.array(z.enum([
    'accounts:read',
    'accounts:manage',
    'messages:read',
    'messages:send',
    'contacts:read',
    'groups:read',
    'automation:read',
    'automation:manage',
    'system:read',
  ])).default([]),
  lastUsedAt: z.date().nullable(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
});

export const auditLogSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid().nullable(),
  actor: z.string(),
  action: z.string(),
  resource: z.string(),
  result: z.enum(['success', 'failure']),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.date(),
});

export type Account = z.infer<typeof accountSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Message = z.infer<typeof messageSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type Chat = z.infer<typeof chatSchema>;
export type Group = z.infer<typeof groupSchema>;
export type Automation = z.infer<typeof automationSchema>;
export type ApiKey = z.infer<typeof apiKeySchema>;
export type AuditLog = z.infer<typeof auditLogSchema>;