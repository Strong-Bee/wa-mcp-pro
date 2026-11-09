import { getSocket } from './baileys-adapter.js';
import { getLogger } from '../core/logger.js';
import { normalizeJid } from './jid-utils.js';
import { getDatabase } from '../database/client.js';
import { contacts } from '../database/schema/contacts.js';
import { eq, and, desc, like, count } from 'drizzle-orm';
import { AppError, ERROR_CODES } from '../core/errors.js';

const logger = getLogger().child({ component: 'ContactService' });

export async function getContacts(accountId: string, limit: number = 50, offset: number = 0, search?: string): Promise<any[]> {
  const db = getDatabase();

  const conditions = [eq(contacts.accountId, accountId)];

  if (search) {
    conditions.push(
      like(contacts.name, `%${search}%`)
    );
  }

  return db
    .select()
    .from(contacts)
    .where(and(...conditions))
    .orderBy(desc(contacts.updatedAt))
    .limit(limit)
    .offset(offset);
}

export async function getContact(accountId: string, jid: string): Promise<any | null> {
  const db = getDatabase();
  const normalizedJid = normalizeJid(jid);

  const result = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.accountId, accountId), eq(contacts.jid, normalizedJid)))
    .limit(1);

  if (result[0]) return result[0];

  const socket = getSocket(accountId);
  if (!socket) return null;

  try {
    const waContacts = await socket.onWhatsApp(normalizedJid);
    if (waContacts && waContacts.length > 0) {
      const contact = waContacts[0] as any;
      if (contact?.exists) {
        let profilePictureUrl: string | null = null;
        try {
          const url = await socket.profilePictureUrl(normalizedJid).catch(() => null);
          profilePictureUrl = url ?? null;
        } catch {
          // Ignore profile picture errors
        }
        return {
          jid: contact.jid,
          name: contact.name || contact.notify || '',
          phoneNumber: contact.jid.split('@')[0],
          profilePictureUrl,
        };
      }
    }
  } catch (error) {
    logger.debug({ jid, error }, 'Failed to fetch contact from WhatsApp');
  }

  return null;
}

export async function checkNumber(accountId: string, phoneNumber: string): Promise<{ exists: boolean; jid?: string }> {
  const socket = getSocket(accountId);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const normalized = normalizeJid(phoneNumber);
  const waContacts = await socket.onWhatsApp(normalized);

  if (waContacts && waContacts.length > 0) {
    const result = waContacts[0] as any;
    return {
      exists: result?.exists ?? false,
      jid: result?.jid,
    };
  }

  return { exists: false };
}

export async function getProfilePicture(accountId: string, jid: string): Promise<string | null> {
  const socket = getSocket(accountId);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const normalizedJid = normalizeJid(jid);
  try {
    const url = await socket.profilePictureUrl(normalizedJid).catch(() => null);
    return url ?? null;
  } catch {
    return null;
  }
}

export async function searchContacts(accountId: string, query: string, limit: number = 50): Promise<any[]> {
  return getContacts(accountId, limit, 0, query);
}

export async function countContacts(accountId: string): Promise<number> {
  const db = getDatabase();
  const result = await db.select({ count: count() }).from(contacts).where(eq(contacts.accountId, accountId));
  return result[0]?.count ?? 0;
}