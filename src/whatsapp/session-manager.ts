import fs from 'fs';
import path from 'path';
import { getConfig } from '../config/env.js';
import { getDatabase } from '../database/client.js';
import { sessions } from '../database/schema/sessions.js';
import { eq } from 'drizzle-orm';
import { encrypt, decrypt } from '../security/encryption.js';
import { getLogger } from '../core/logger.js';

const logger = getLogger().child({ component: 'SessionManager' });

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
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  private getSessionPath(accountId: string): string {
    return path.join(this.sessionDir, `${accountId}.json`);
  }

  async saveSession(accountId: string, data: SessionData): Promise<void> {
    try {
      const encrypted = await encrypt(JSON.stringify(data));
      const sessionPath = this.getSessionPath(accountId);
      fs.writeFileSync(sessionPath, encrypted, { mode: 0o600 });

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

      logger.debug({ accountId }, 'Session saved');
    } catch (error) {
      logger.error({ accountId, error }, 'Failed to save session');
      throw error;
    }
  }

  async loadSession(accountId: string): Promise<SessionData | null> {
    try {
      const sessionPath = this.getSessionPath(accountId);

      if (!fs.existsSync(sessionPath)) {
        const db = getDatabase();
        const result = await db
          .select()
          .from(sessions)
          .where(eq(sessions.accountId, accountId))
          .limit(1);

        if (result[0]) {
          const decrypted = await decrypt(result[0].encryptedCredentials);
          const data = JSON.parse(decrypted);
          fs.writeFileSync(sessionPath, decrypted, { mode: 0o600 });
          return data;
        }
        return null;
      }

      const encrypted = fs.readFileSync(sessionPath, 'utf8');
      const decrypted = await decrypt(encrypted);
      return JSON.parse(decrypted);
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
      const files = fs.readdirSync(this.sessionDir);
      return files
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace('.json', ''));
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