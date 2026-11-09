import { getSocket } from './baileys-adapter.js';
import { getLogger } from '../core/logger.js';
import { normalizeJid } from './jid-utils.js';
import { AppError, ERROR_CODES } from '../core/errors.js';

const logger = getLogger().child({ component: 'PresenceService' });

export type Presence = 'available' | 'unavailable' | 'composing' | 'recording';

export async function setPresence(accountId: string, to: string, presence: Presence): Promise<void> {
  const socket = getSocket(accountId);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const normalizedTo = normalizeJid(to);
  await socket.sendPresenceUpdate(presence, normalizedTo);
}

export async function sendTyping(accountId: string, to: string): Promise<void> {
  await setPresence(accountId, to, 'composing');
}

export async function sendRecording(accountId: string, to: string): Promise<void> {
  await setPresence(accountId, to, 'recording');
}

export async function stopTyping(accountId: string, to: string): Promise<void> {
  await setPresence(accountId, to, 'available');
}

export async function getPresence(accountId: string, jid: string): Promise<Presence | null> {
  const socket = getSocket(accountId);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const normalizedJid = normalizeJid(jid);

  try {
    const presence = await socket.presenceGet(normalizedJid);
    return presence?.lastKnownPresence || null;
  } catch {
    return null;
  }
}

export async function subscribePresence(accountId: string, jid: string): Promise<void> {
  const socket = getSocket(accountId);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const normalizedJid = normalizeJid(jid);
  await socket.presenceSubscribe(normalizedJid);
}