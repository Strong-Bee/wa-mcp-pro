export const CONNECTION_STATES = [
  'disconnected',
  'connecting',
  'qr_pending',
  'authenticated',
  'connected',
  'reconnecting',
  'logged_out',
  'error',
] as const;

export type ConnectionState = (typeof CONNECTION_STATES)[number];

export const MCP_TRANSPORTS = ['stdio', 'http', 'hybrid'] as const;
export type MCPTransport = (typeof MCP_TRANSPORTS)[number];

export const MESSAGE_TYPES = [
  'text',
  'image',
  'video',
  'document',
  'audio',
  'location',
  'contact',
  'reaction',
  'sticker',
  'poll',
] as const;

export type MessageType = (typeof MESSAGE_TYPES)[number];

export const AUTOMATION_TRIGGERS = [
  'keyword',
  'exact_match',
  'regex',
  'command',
] as const;

export type AutomationTrigger = (typeof AUTOMATION_TRIGGERS)[number];

export const PERMISSION_SCOPES = [
  'accounts:read',
  'accounts:manage',
  'messages:read',
  'messages:send',
  'contacts:read',
  'groups:read',
  'automation:read',
  'automation:manage',
  'system:read',
] as const;

export type PermissionScope = (typeof PERMISSION_SCOPES)[number];

export const ROLES = ['owner', 'admin', 'operator', 'readonly'] as const;
export type Role = (typeof ROLES)[number];

export const EVENT_TYPES = [
  'whatsapp.connected',
  'whatsapp.disconnected',
  'whatsapp.qr.updated',
  'whatsapp.connection.error',
  'message.received',
  'message.sent',
  'message.updated',
  'message.deleted',
  'chat.updated',
  'contact.updated',
  'group.updated',
  'group.participants.updated',
  'automation.triggered',
  'automation.completed',
  'automation.failed',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const ERROR_CODES = {
  WA_NOT_CONNECTED: 'WA_NOT_CONNECTED',
  WA_CONNECTION_FAILED: 'WA_CONNECTION_FAILED',
  WA_AUTH_REQUIRED: 'WA_AUTH_REQUIRED',
  WA_SESSION_EXPIRED: 'WA_SESSION_EXPIRED',
  WA_INVALID_JID: 'WA_INVALID_JID',
  WA_INVALID_RECIPIENT: 'WA_INVALID_RECIPIENT',
  WA_MESSAGE_SEND_FAILED: 'WA_MESSAGE_SEND_FAILED',
  WA_MEDIA_INVALID: 'WA_MEDIA_INVALID',
  WA_MEDIA_TOO_LARGE: 'WA_MEDIA_TOO_LARGE',
  MCP_TOOL_ERROR: 'MCP_TOOL_ERROR',
  MCP_AUTH_FAILED: 'MCP_AUTH_FAILED',
  MCP_PERMISSION_DENIED: 'MCP_PERMISSION_DENIED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  DATABASE_MIGRATION_FAILED: 'DATABASE_MIGRATION_FAILED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const DEFAULT_PAGINATION = {
  limit: 50,
  maxLimit: 100,
} as const;

export const MEDIA_CONFIG = {
  maxSizeMB: 50,
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'audio/mpeg',
    'audio/ogg',
    'audio/mp4',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
} as const;