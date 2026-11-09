import fs from 'fs';
import path from 'path';
import { getConfig } from '../config/env.js';
import { getLogger } from '../core/logger.js';
import { getSocket } from './baileys-adapter.js';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { AppError, ERROR_CODES } from '../core/errors.js';
import { MEDIA_CONFIG } from '../config/constants.js';
import { getDatabase } from '../database/client.js';
import { messages } from '../database/schema/index.js';
import { eq, and } from 'drizzle-orm';

const logger = getLogger().child({ component: 'MediaService' });

export interface MediaDownloadResult {
  path: string;
  mimetype: string;
  filename: string;
  size: number;
}

export async function downloadMedia(
  accountId: string,
  messageId: string,
  chatJid: string,
  messageType: string
): Promise<MediaDownloadResult> {
  const socket = getSocket(accountId);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const config = getConfig();
  const mediaDir = path.join(config.MEDIA_DIRECTORY, accountId);

  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }

  // Get message from database instead of socket.chats.get
  const db = getDatabase();
  const normalizedChatJid = chatJid; // Already normalized in calling code
  const messageRecord = await db
    .select()
    .from(messages)
    .where(and(eq(messages.accountId, accountId), eq(messages.messageId, messageId)))
    .limit(1);

  if (!messageRecord[0]) {
    throw new AppError(ERROR_CODES.WA_MEDIA_INVALID, 'Message not found');
  }

  // Reconstruct a minimal message object for downloadContentFromMessage
  const message = {
    key: { id: messageId, remoteJid: normalizedChatJid },
    message: JSON.parse(messageRecord[0].messageContent),
  } as any;

  const mediaStream = await downloadContentFromMessage(message, messageType as any);
  if (!mediaStream) {
    throw new AppError(ERROR_CODES.WA_MEDIA_INVALID, 'Failed to download media');
  }

  // Convert stream to buffer
  const buffer = await streamToBuffer(mediaStream);

  if (buffer.length > config.MAX_MEDIA_SIZE_MB * 1024 * 1024) {
    throw new AppError(ERROR_CODES.WA_MEDIA_TOO_LARGE, `Media size exceeds ${config.MAX_MEDIA_SIZE_MB}MB limit`);
  }

  const mimetype = getMimeTypeFromMessage(message, messageType);
  const filename = generateFilename(messageId, mimetype);
  const filePath = path.join(mediaDir, filename);

  fs.writeFileSync(filePath, buffer);

  logger.info({ accountId, messageId, filePath, size: buffer.length }, 'Media downloaded');

  return {
    path: filePath,
    mimetype,
    filename,
    size: buffer.length,
  };
}

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

function getMimeTypeFromMessage(message: any, messageType: string): string {
  const msgType = messageType || Object.keys(message.message || {})[0];

  switch (msgType) {
    case 'imageMessage':
      return message.message.imageMessage?.mimetype || 'image/jpeg';
    case 'videoMessage':
      return message.message.videoMessage?.mimetype || 'video/mp4';
    case 'audioMessage':
      return message.message.audioMessage?.mimetype || 'audio/ogg';
    case 'documentMessage':
      return message.message.documentMessage?.mimetype || 'application/octet-stream';
    case 'stickerMessage':
      return message.message.stickerMessage?.mimetype || 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

function generateFilename(messageId: string, mimetype: string): string {
  const extension = mimetype.split('/')[1] || 'bin';
  return `${messageId}.${extension}`;
}

// Allowed MIME types as a wider type to avoid TypeScript issues
const ALLOWED_MIME_TYPES: string[] = [
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
];

export function validateMedia(mimetype: string, size: number): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
    return { valid: false, error: `MIME type ${mimetype} not allowed` };
  }

  if (size > MEDIA_CONFIG.maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `File size exceeds ${MEDIA_CONFIG.maxSizeMB}MB limit` };
  }

  return { valid: true };
}

export function sanitizeFilename(filename: string): string {
  return path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function getMediaInfo(accountId: string, filePath: string): Promise<{ size: number; mimetype: string } | null> {
  const fullPath = path.resolve(filePath);

  const config = getConfig();
  const mediaDir = path.resolve(config.MEDIA_DIRECTORY, accountId);

  if (!fullPath.startsWith(mediaDir)) {
    throw new AppError(ERROR_CODES.WA_MEDIA_INVALID, 'Invalid media path');
  }

  try {
    const stats = fs.statSync(fullPath);
    const mimetype = getMimeTypeFromExtension(path.extname(fullPath));
    return { size: stats.size, mimetype };
  } catch {
    return null;
  }
}

function getMimeTypeFromExtension(ext: string): string {
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };

  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
}

export async function cleanupOldMedia(accountId: string, olderThanDays: number = 30): Promise<number> {
  const config = getConfig();
  const mediaDir = path.join(config.MEDIA_DIRECTORY, accountId);

  if (!fs.existsSync(mediaDir)) return 0;

  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  let deleted = 0;

  const files = fs.readdirSync(mediaDir);
  for (const file of files) {
    const filePath = path.join(mediaDir, file);
    try {
      const stats = fs.statSync(filePath);
      if (stats.mtimeMs < cutoff) {
        fs.unlinkSync(filePath);
        deleted++;
      }
    } catch {
      // Ignore errors
    }
  }

  logger.info({ accountId, deleted }, 'Old media cleaned up');
  return deleted;
}