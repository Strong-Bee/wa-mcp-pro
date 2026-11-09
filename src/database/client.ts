import sqlite3 from 'sqlite3';
import { drizzle, SQLite3Database } from 'drizzle-orm/sqlite3';
import * as schema from './schema/index.js';
import { getConfig } from '../config/env.js';
import { getLogger } from '../core/logger.js';
import path from 'path';
import fs from 'fs';

let dbInstance: SQLite3Database<typeof schema> | null = null;
let sqliteInstance: sqlite3.Database | null = null;

export function getDatabase(): SQLite3Database<typeof schema> {
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

  sqliteInstance = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      logger.error({ error: err }, 'Failed to open database');
      throw err;
    }
  });

  sqliteInstance.exec('PRAGMA journal_mode = WAL;');
  sqliteInstance.exec('PRAGMA foreign_keys = ON;');
  sqliteInstance.exec('PRAGMA busy_timeout = 5000;');
  sqliteInstance.exec('PRAGMA synchronous = NORMAL;');

  dbInstance = drizzle(sqliteInstance, { schema, logger: config.NODE_ENV === 'development' });

  logger.info({ path: dbPath }, 'Database initialized');

  return dbInstance;
}

export function getSqlite(): sqlite3.Database {
  if (!sqliteInstance) {
    getDatabase();
  }
  return sqliteInstance!;
}

export function closeDatabase(): void {
  if (sqliteInstance) {
    sqliteInstance.close();
    sqliteInstance = null;
    dbInstance = null;
    getLogger().info('Database connection closed');
  }
}

export function isDatabaseConnected(): boolean {
  return sqliteInstance !== null && dbInstance !== null;
}