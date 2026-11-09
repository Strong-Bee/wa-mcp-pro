import fs from 'fs';
import path from 'path';
import { getConfig } from '../config/env.js';
import { getLogger } from '../core/logger.js';
import { getSocket } from './baileys-adapter.js';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { AppError, ERROR_CODES } from '../core/errors.js';
import { MEDIA_CONFIG } from '../config/constants.js';

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

  const message = await getMessageFromSocket(socket, chatJid, messageId);
  if (!message) {
    throw new AppError(ERROR_CODES.WA_MEDIA_INVALID, 'Message not found');
  }

  const buffer = await downloadContentFromMessage(message, messageType as any);
  if (!buffer) {
    throw new AppError(ERROR_CODES.WA_MEDIA_INVALID, 'Failed to download media');
  }

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

async function getMessageFromSocket(socket: any, chatJid: string, messageId: string): Promise<any> {
  const chat = await socket.chats.get(chatJid);
  if (!chat?.messages) return null;

  return chat.messages.find((m: any) => m.key.id === messageId);
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

export function validateMedia(mimetype: string, size: number): { valid: boolean; error?: string } {
  if (!MEDIA_CONFIG.allowedMimeTypes.includes(mimetype)) {
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