import { getSocket } from './baileys-adapter.js';
import { getLogger } from '../core/logger.js';
import { normalizeJid, normalizeGroupJid } from './jid-utils.js';
import { getDatabase } from '../database/client.js';
import { groups, contacts } from '../database/schema/index.js';
import { eq, and, desc, count } from 'drizzle-orm';
import { AppError, ERROR_CODES } from '../core/errors.js';

const logger = getLogger().child({ component: 'GroupService' });

export async function getGroups(accountId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
  const db = getDatabase();

  return db
    .select()
    .from(groups)
    .where(eq(groups.accountId, accountId))
    .orderBy(desc(groups.updatedAt))
    .limit(limit)
    .offset(offset);
}

export async function getGroup(accountId: string, groupJid: string): Promise<any | null> {
  const db = getDatabase();
  const normalizedJid = normalizeGroupJid(groupJid);

  const result = await db
    .select()
    .from(groups)
    .where(and(eq(groups.accountId, accountId), eq(groups.groupJid, normalizedJid)))
    .limit(1);

  if (result[0]) return result[0];

  const socket = getSocket(accountId);
  if (!socket) return null;

  try {
    const group = await socket.groupMetadata(normalizedJid);
    if (group) {
      return {
        jid: group.id,
        subject: group.subject,
        description: group.desc,
        owner: group.owner,
        participants: group.participants.map((p: any) => ({
          jid: p.id,
          role: p.admin === 'superadmin' ? 'superadmin' : p.admin === 'admin' ? 'admin' : 'member',
        })),
        createdAt: group.creation ? new Date(group.creation * 1000) : new Date(),
      };
    }
  } catch (error) {
    logger.debug({ groupJid, error }, 'Failed to fetch group from WhatsApp');
  }

  return null;
}

export async function getGroupParticipants(accountId: string, groupJid: string): Promise<{ jid: string; role: 'admin' | 'superadmin' | 'member' }[]> {
  const socket = getSocket(accountId);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const normalizedJid = normalizeGroupJid(groupJid);

  try {
    const metadata = await socket.groupMetadata(normalizedJid);
    return metadata.participants.map((p: any) => ({
      jid: p.id,
      role: p.admin === 'superadmin' ? 'superadmin' : p.admin === 'admin' ? 'admin' : 'member',
    }));
  } catch (error) {
    logger.error({ groupJid, error }, 'Failed to get group participants');
    throw new AppError(ERROR_CODES.WA_MESSAGE_SEND_FAILED, 'Failed to get group participants');
  }
}

export async function createGroup(accountId: string, subject: string, participants: string[]): Promise<string> {
  const socket = getSocket(accountId);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const normalizedParticipants = participants.map(normalizeJid);

  const result = await socket.groupCreate(subject, normalizedParticipants);
  // groupCreate returns GroupMetadata object with id property
  return (result as any).id ?? (result as any).gid ?? '';
}

export async function addGroupParticipants(accountId: string, groupJid: string, participants: string[]): Promise<void> {
  const socket = getSocket(accountId);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const normalizedJid = normalizeGroupJid(groupJid);
  const normalizedParticipants = participants.map(normalizeJid);

  await socket.groupParticipantsUpdate(normalizedJid, normalizedParticipants, 'add');
}

export async function removeGroupParticipants(accountId: string, groupJid: string, participants: string[]): Promise<void> {
  const socket = getSocket(accountId);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const normalizedJid = normalizeGroupJid(groupJid);
  const normalizedParticipants = participants.map(normalizeJid);

  await socket.groupParticipantsUpdate(normalizedJid, normalizedParticipants, 'remove');
}

export async function promoteGroupParticipants(accountId: string, groupJid: string, participants: string[]): Promise<void> {
  const socket = getSocket(accountId);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const normalizedJid = normalizeGroupJid(groupJid);
  const normalizedParticipants = participants.map(normalizeJid);

  await socket.groupParticipantsUpdate(normalizedJid, normalizedParticipants, 'promote');
}

export async function demoteGroupParticipants(accountId: string, groupJid: string, participants: string[]): Promise<void> {
  const socket = getSocket(accountId);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const normalizedJid = normalizeGroupJid(groupJid);
  const normalizedParticipants = participants.map(normalizeJid);

  await socket.groupParticipantsUpdate(normalizedJid, normalizedParticipants, 'demote');
}

export async function updateGroupSubject(accountId: string, groupJid: string, subject: string): Promise<void> {
  const socket = getSocket(accountId);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const normalizedJid = normalizeGroupJid(groupJid);
  await socket.groupUpdateSubject(normalizedJid, subject);
}

export async function updateGroupDescription(accountId: string, groupJid: string, description: string): Promise<void> {
  const socket = getSocket(accountId);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const normalizedJid = normalizeGroupJid(groupJid);
  await socket.groupUpdateDescription(normalizedJid, description);
}

export async function getGroupInviteCode(accountId: string, groupJid: string): Promise<string> {
  const socket = getSocket(accountId);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const normalizedJid = normalizeGroupJid(groupJid);
  const code = await socket.groupInviteCode(normalizedJid);
  return code ?? '';
}

export async function revokeGroupInviteCode(accountId: string, groupJid: string): Promise<string> {
  const socket = getSocket(accountId);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const normalizedJid = normalizeGroupJid(groupJid);
  const code = await socket.groupRevokeInvite(normalizedJid);
  return code ?? '';
}

export async function countGroups(accountId: string): Promise<number> {
  const db = getDatabase();
  const result = await db.select({ count: count() }).from(groups).where(eq(groups.accountId, accountId));
  return result[0]?.count ?? 0;
}

export async function leaveGroup(accountId: string, groupJid: string): Promise<void> {
  const socket = getSocket(accountId);
  if (!socket) throw new AppError(ERROR_CODES.WA_NOT_CONNECTED, 'WhatsApp not connected');

  const normalizedJid = normalizeGroupJid(groupJid);
  await socket.groupLeave(normalizedJid);
}