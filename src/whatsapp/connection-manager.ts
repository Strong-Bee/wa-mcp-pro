import { getConfig } from '../config/env.js';
import { getLogger } from '../core/logger.js';
import { getDatabase } from '../database/client.js';
import { accounts } from '../database/schema/accounts.js';
import { eq } from 'drizzle-orm';
import { createConnection, getSocket, getConnectionStatus, getQRCode, getPairingCode, disconnectAccount, logoutAccount, requestPairingCode } from './baileys-adapter.js';
import { sessionManager } from './session-manager.js';
import { normalizeJid } from './jid-utils.js';
import { ConnectionState } from '../config/constants.js';
import { AppError, ERROR_CODES } from '../core/errors.js';

const logger = getLogger().child({ component: 'ConnectionManager' });

const accountLocks = new Map<string, Promise<void>>();

export interface AccountConfig {
  id: string;
  name: string;
  phoneNumber?: string;
}

export async function createAccount(config: AccountConfig): Promise<void> {
  const db = getDatabase();

  const existing = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, config.id))
    .limit(1);

  if (existing[0]) {
    throw new AppError(ERROR_CODES.INTERNAL_SERVER_ERROR, 'Account already exists', 409);
  }

  await db.insert(accounts).values({
    id: config.id,
    name: config.name,
    phoneNumber: config.phoneNumber || '',
    status: 'disconnected',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  logger.info({ accountId: config.id }, 'Account created');
}

export async function connectAccount(accountId: string): Promise<void> {
  let lock = accountLocks.get(accountId);
  if (lock) {
    await lock;
    return;
  }

  lock = (async () => {
    const status = getConnectionStatus(accountId);
    if (status === 'connected' || status === 'connecting' || status === 'qr_pending' || status === 'reconnecting') {
      logger.debug({ accountId, status }, 'Account already connecting/connected');
      return;
    }

    const hasSession = await sessionManager.hasSession(accountId);
    if (!hasSession) {
      logger.info({ accountId }, 'No session found, will generate QR');
    }

    try {
      await createConnection(accountId);
    } catch (error) {
      logger.error({ accountId, error }, 'Failed to connect account');
      throw error;
    } finally {
      accountLocks.delete(accountId);
    }
  })();

  accountLocks.set(accountId, lock);
  await lock;
}

export async function disconnectAccountSafe(accountId: string): Promise<void> {
  await disconnectAccount(accountId);
  logger.info({ accountId }, 'Account disconnected');
}

export async function logoutAccountSafe(accountId: string): Promise<void> {
  await logoutAccount(accountId);
  logger.info({ accountId }, 'Account logged out');
}

export function getAccountStatus(accountId: string): ConnectionState {
  return getConnectionStatus(accountId);
}

export function getAccountQR(accountId: string): string | undefined {
  return getQRCode(accountId);
}

export async function getAccountPairingCode(accountId: string, phoneNumber: string): Promise<string> {
  return requestPairingCode(accountId, normalizeJid(phoneNumber));
}

export async function listAccounts(): Promise<Array<{ id: string; name: string; phoneNumber: string; status: ConnectionState }>> {
  const db = getDatabase();
  const dbAccounts = await db.select().from(accounts);

  return dbAccounts.map((acc) => ({
    id: acc.id,
    name: acc.name,
    phoneNumber: acc.phoneNumber,
    status: getConnectionStatus(acc.id),
  }));
}

export async function deleteAccount(accountId: string): Promise<void> {
  await disconnectAccountSafe(accountId);

  const db = getDatabase();
  await db.delete(accounts).where(eq(accounts.id, accountId));

  await sessionManager.deleteSession(accountId);

  logger.info({ accountId }, 'Account deleted');
}

export async function getAccount(accountId: string): Promise<{ id: string; name: string; phoneNumber: string; status: ConnectionState } | null> {
  const db = getDatabase();
  const result = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);

  if (!result[0]) return null;

  return {
    id: result[0].id,
    name: result[0].name,
    phoneNumber: result[0].phoneNumber,
    status: getConnectionStatus(result[0].id),
  };
}