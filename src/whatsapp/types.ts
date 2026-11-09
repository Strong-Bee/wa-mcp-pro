import { ConnectionState } from '../config/constants.js';

export interface WhatsAppAccount {
  id: string;
  name: string;
  phoneNumber: string;
  status: ConnectionState;
}

export interface QRCodeData {
  qr: string;
  code: string;
  expiresAt: Date;
}

export interface PairingCodeData {
  code: string;
  expiresAt: Date;
}

export interface MessagePayload {
  to: string;
  text?: string;
  image?: { path: string; caption?: string };
  video?: { path: string; caption?: string };
  audio?: { path: string; ptt?: boolean };
  document?: { path: string; filename?: string; mimetype?: string };
  location?: { degreesLatitude: number; degreesLongitude: number; name?: string; address?: string };
  contact?: { displayName: string; vcard: string };
  replyTo?: string;
  mentions?: string[];
}

export interface SendResult {
  messageId: string;
  status: 'pending' | 'sent' | 'failed';
  timestamp: Date;
}

export interface ContactInfo {
  jid: string;
  name?: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  isBusiness?: boolean;
  verifiedName?: string;
}

export interface ChatInfo {
  jid: string;
  name?: string;
  isGroup: boolean;
  unreadCount: number;
  lastMessageTimestamp?: Date;
  participants?: string[];
}

export interface GroupInfo {
  jid: string;
  subject: string;
  description?: string;
  owner: string;
  participants: GroupParticipant[];
  createdAt: Date;
}

export interface GroupParticipant {
  jid: string;
  role: 'admin' | 'superadmin' | 'member';
}

export interface MediaInfo {
  url: string;
  mimetype: string;
  fileSize: number;
  fileName?: string;
  directPath?: string;
}

export interface IncomingMessage {
  id: string;
  from: string;
  to: string;
  timestamp: Date;
  type: string;
  content: string | object;
  pushName?: string;
  isFromMe: boolean;
  isGroup: boolean;
  quotedMessage?: IncomingMessage;
}

export interface ConnectionEvent {
  accountId: string;
  state: ConnectionState;
  qr?: string;
  error?: string;
}

export interface AutomationRule {
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

export interface AutomationLog {
  id: string;
  ruleId: string;
  accountId: string;
  messageId: string;
  triggeredAt: Date;
  success: boolean;
  error?: string;
}