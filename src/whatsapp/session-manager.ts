import fs from 'fs';
import path from 'path';
import { getConfig } from '../config/env.js';
import { getDatabase } from '../database/client.js';
import { sessions } from '../database/schema/sessions.js';
import { eq } from 'drizzle-orm';
import { encrypt, decrypt } from '../security/encryption.js';
import { getLogger } from '../core/logger.js';

const logger = getLogger().child({ component: 'SessionManager' });
const ACCOUNT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface SessionData {
  creds: any;
  keys: any;
}

export class SessionManager {
  private sessionDir: string;

  constructor() {
    const config = getConfig();
    this.sessionDir = config.SESSION_DIRECTORY;
    this.ensureDirectory();
  }

  private ensureDirectory(): void {
    fs.mkdirSync(this.sessionDir, { recursive: true, mode: 0o700 });
    try {
      fs.chmodSync(this.sessionDir, 0o700);
    } catch {
      // Windows does not support POSIX directory modes; ACLs remain authoritative.
    }
  }

  private getSessionPath(accountId: string): string {
    if (!ACCOUNT_ID_PATTERN.test(accountId)) {
      throw new Error('Invalid account ID; expected a UUID');
    }

    const sessionPath = path.resolve(this.sessionDir, `${accountId}.json`);
    const sessionRoot = path.resolve(this.sessionDir) + path.sep;
    if (!sessionPath.startsWith(sessionRoot)) {
      throw new Error('Invalid session path');
    }
    return sessionPath;
  }

  private writeEncryptedSession(sessionPath: string, encrypted: string): void {
    const temporaryPath = `${sessionPath}.${process.pid}.${crypto.randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporaryPath, encrypted, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
      fs.renameSync(temporaryPath, sessionPath);
      try {
        fs.chmodSync(sessionPath, 0o600);
      } catch {
        // Windows ACLs are used instead of POSIX file modes.
      }
    } finally {
      if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
    }
  }

  async saveSession(accountId: string, data: SessionData): Promise<void> {
    try {
      const sessionPath = this.getSessionPath(accountId);
      const encrypted = await encrypt(JSON.stringify(data));

      const db = getDatabase();
      await db
        .insert(sessions)
        .values({
          id: crypto.randomUUID(),
          accountId,
          encryptedCredentials: encrypted,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: sessions.accountId,
          set: { encryptedCredentials: encrypted, updatedAt: new Date() },
        });

      this.writeEncryptedSession(sessionPath, encrypted);
      logger.debug({ accountId }, 'Session saved');
    } catch (error) {
      logger.error({ accountId, error }, 'Failed to save session');
      throw error;
    }
  }

  async loadSession(accountId: string): Promise<SessionData | null> {
    const sessionPath = this.getSessionPath(accountId);

    try {
      if (fs.existsSync(sessionPath)) {
        try {
          const encrypted = fs.readFileSync(sessionPath, 'utf8');
          const decrypted = await decrypt(encrypted);
          return JSON.parse(decrypted) as SessionData;
        } catch (fileError) {
          logger.warn({ accountId, error: fileError }, 'Session file could not be decrypted; attempting encrypted database recovery');
        }
      }

      const db = getDatabase();
      const result = await db
        .select()
        .from(sessions)
        .where(eq(sessions.accountId, accountId))
        .limit(1);

      if (!result[0]) return null;

      const decrypted = await decrypt(result[0].encryptedCredentials);
      const data = JSON.parse(decrypted) as SessionData;

      // Persist the ciphertext, never the decrypted credentials.
      this.writeEncryptedSession(sessionPath, result[0].encryptedCredentials);
      return data;
    } catch (error) {
      logger.error({ accountId, error }, 'Failed to load session');
      return null;
    }
  }

  async deleteSession(accountId: string): Promise<void> {
    try {
      const sessionPath = this.getSessionPath(accountId);
      if (fs.existsSync(sessionPath)) {
        fs.unlinkSync(sessionPath);
      }

      const db = getDatabase();
      await db.delete(sessions).where(eq(sessions.accountId, accountId));

      logger.info({ accountId }, 'Session deleted');
    } catch (error) {
      logger.error({ accountId, error }, 'Failed to delete session');
      throw error;
    }
  }

  async listSessions(): Promise<string[]> {
    try {
      return fs.readdirSync(this.sessionDir)
        .filter((file) => file.endsWith('.json') && ACCOUNT_ID_PATTERN.test(file.slice(0, -5)))
        .map((file) => file.slice(0, -5));
    } catch {
      return [];
    }
  }

  async hasSession(accountId: string): Promise<boolean> {
    const sessionPath = this.getSessionPath(accountId);
    if (fs.existsSync(sessionPath)) return true;

    const db = getDatabase();
    const result = await db.select().from(sessions).where(eq(sessions.accountId, accountId)).limit(1);
    return result.length > 0;
  }
}

export const sessionManager = new SessionManager();