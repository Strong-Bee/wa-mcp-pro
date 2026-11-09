import { createClient } from '@libsql/client';
import { drizzle, LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema/index.js';
import { getConfig } from '../config/env.js';
import { getLogger } from '../core/logger.js';
import path from 'path';
import fs from 'fs';

let dbInstance: LibSQLDatabase<typeof schema> | null = null;
let clientInstance: ReturnType<typeof createClient> | null = null;

export function getDatabase(): LibSQLDatabase<typeof schema> {
  if (dbInstance) {
    return dbInstance;
  }

  const config = getConfig();
  const logger = getLogger().child({ component: 'Database' });

  const dbPath = config.DATABASE_URL.replace('sqlite:', '').replace('file:', '');
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Use file: protocol for libsql local database
  const libsqlUrl = `file:${dbPath}`;
  clientInstance = createClient({ url: libsqlUrl });

  dbInstance = drizzle(clientInstance, { schema, logger: config.NODE_ENV === 'development' });

  logger.info({ path: dbPath }, 'Database initialized');

  return dbInstance;
}

export function getClient(): ReturnType<typeof createClient> {
  if (!clientInstance) {
    getDatabase();
  }
  return clientInstance!;
}

export function closeDatabase(): void {
  if (clientInstance) {
    clientInstance.close();
    clientInstance = null;
    dbInstance = null;
    getLogger().info('Database connection closed');
  }
}

export function isDatabaseConnected(): boolean {
  return clientInstance !== null && dbInstance !== null;
}