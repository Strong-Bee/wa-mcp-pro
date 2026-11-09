import { getLogger } from '../core/logger.js';
import { getDatabase } from '../database/client.js';
import { accounts } from '../database/schema/accounts.js';
import { eq } from 'drizzle-orm';
import {
  createConnection,
  getConnectionStatus,
  getQRCode,
  disconnectAccount,
  logoutAccount,
  requestPairingCode,
} from './baileys-adapter.js';
import { sessionManager } from './session-manager.js';
import { normalizeJid } from './jid-utils.js';
import { ConnectionState } from '../config/constants.js';
import { AppError, ERROR_CODES } from '../core/errors.js';

const logger = getLogger().child({ component: 'ConnectionManager' });
const accountLocks = new Map<string, Promise<void>>();
const UNASSIGNED_PHONE_PREFIX = 'unassigned:';

export interface AccountConfig {
  id: string;
  name: string;
  phoneNumber?: string;
}

function displayPhoneNumber(phoneNumber: string): string {
  return phoneNumber.startsWith(UNASSIGNED_PHONE_PREFIX) ? '' : phoneNumber;
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

  // The current SQLite schema requires a unique, non-null phone value.
  // Use a deterministic internal placeholder until the account is paired.
  const phoneNumber = config.phoneNumber?.trim() || `${UNASSIGNED_PHONE_PREFIX}${config.id}`;

  await db.insert(accounts).values({
    id: config.id,
    name: config.name,
    phoneNumber,
    status: 'disconnected',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  logger.info({ accountId: config.id }, 'Account created');
}

export async function connectAccount(accountId: string): Promise<void> {
  const existingLock = accountLocks.get(accountId);
  if (existingLock) {
    await existingLock;
    return;
  }

  const lock = (async () => {
    const status = getConnectionStatus(accountId);
    if (status === 'connected' || status === 'connecting' || status === 'qr_pending' || status === 'reconnecting') {
      logger.debug({ accountId, status }, 'Account already connecting/connected');
      return;
    }

    const hasSession = await sessionManager.hasSession(accountId);
    if (!hasSession) {
      logger.info({ accountId }, 'No session found, will generate QR');
    }

    await createConnection(accountId);
  })();

  accountLocks.set(accountId, lock);
  try {
    await lock;
  } catch (error) {
    logger.error({ accountId, error }, 'Failed to connect account');
    throw error;
  } finally {
    if (accountLocks.get(accountId) === lock) {
      accountLocks.delete(accountId);
    }
  }
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

  return dbAccounts.map((account) => ({
    id: account.id,
    name: account.name,
    phoneNumber: displayPhoneNumber(account.phoneNumber),
    status: getConnectionStatus(account.id),
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
    phoneNumber: displayPhoneNumber(result[0].phoneNumber),
    status: getConnectionStatus(result[0].id),
  };
}