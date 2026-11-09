import { getClient } from './client.js';
import { getLogger } from '../core/logger.js';

const migrations = [
  `CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connecting', 'qr_pending', 'authenticated', 'connected', 'reconnecting', 'logged_out', 'error')),
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,

  `CREATE INDEX IF NOT EXISTS accounts_status_idx ON accounts(status)`,

  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    encrypted_credentials TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,

  `CREATE INDEX IF NOT EXISTS sessions_account_id_idx ON sessions(account_id)`,

  `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    chat_jid TEXT NOT NULL,
    message_id TEXT NOT NULL,
    sender_jid TEXT NOT NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'video', 'document', 'audio', 'location', 'contact', 'reaction', 'sticker', 'poll')),
    message_content TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    timestamp INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,

  `CREATE INDEX IF NOT EXISTS messages_account_id_idx ON messages(account_id)`,
  `CREATE INDEX IF NOT EXISTS messages_chat_jid_idx ON messages(chat_jid)`,
  `CREATE INDEX IF NOT EXISTS messages_message_id_idx ON messages(message_id)`,
  `CREATE INDEX IF NOT EXISTS messages_timestamp_idx ON messages(timestamp)`,
  `CREATE INDEX IF NOT EXISTS messages_account_chat_idx ON messages(account_id, chat_jid)`,

  `CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    jid TEXT NOT NULL,
    name TEXT,
    phone_number TEXT,
    profile_picture_url TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(account_id, jid)
  )`,

  `CREATE INDEX IF NOT EXISTS contacts_account_id_idx ON contacts(account_id)`,
  `CREATE INDEX IF NOT EXISTS contacts_phone_number_idx ON contacts(phone_number)`,

  `CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    chat_jid TEXT NOT NULL,
    name TEXT,
    is_group INTEGER NOT NULL DEFAULT 0,
    unread_count INTEGER NOT NULL DEFAULT 0,
    last_message_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(account_id, chat_jid)
  )`,

  `CREATE INDEX IF NOT EXISTS chats_account_id_idx ON chats(account_id)`,
  `CREATE INDEX IF NOT EXISTS chats_last_message_at_idx ON chats(last_message_at)`,

  `CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    group_jid TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    owner_jid TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(account_id, group_jid)
  )`,

  `CREATE INDEX IF NOT EXISTS groups_account_id_idx ON groups(account_id)`,

  `CREATE TABLE IF NOT EXISTS automations (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('keyword', 'exact_match', 'regex', 'command', 'schedule')),
    trigger_value TEXT NOT NULL,
    response TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    cooldown INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,

  `CREATE INDEX IF NOT EXISTS automations_account_id_idx ON automations(account_id)`,
  `CREATE INDEX IF NOT EXISTS automations_enabled_idx ON automations(enabled)`,

  `CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    permissions TEXT NOT NULL DEFAULT '[]',
    last_used_at INTEGER,
    expires_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,

  `CREATE INDEX IF NOT EXISTS api_keys_key_hash_idx ON api_keys(key_hash)`,
  `CREATE INDEX IF NOT EXISTS api_keys_expires_at_idx ON api_keys(expires_at)`,

  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('success', 'failure')),
    metadata TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,

  `CREATE INDEX IF NOT EXISTS audit_logs_account_id_idx ON audit_logs(account_id)`,
  `CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs(actor)`,
  `CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action)`,
  `CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at)`,

  `CREATE TRIGGER IF NOT EXISTS accounts_updated_at
   AFTER UPDATE ON accounts
   BEGIN
     UPDATE accounts SET updated_at = unixepoch() WHERE id = NEW.id;
   END`,

  `CREATE TRIGGER IF NOT EXISTS sessions_updated_at
   AFTER UPDATE ON sessions
   BEGIN
     UPDATE sessions SET updated_at = unixepoch() WHERE id = NEW.id;
   END`,

  `CREATE TRIGGER IF NOT EXISTS contacts_updated_at
   AFTER UPDATE ON contacts
   BEGIN
     UPDATE contacts SET updated_at = unixepoch() WHERE id = NEW.id;
   END`,

  `CREATE TRIGGER IF NOT EXISTS chats_updated_at
   AFTER UPDATE ON chats
   BEGIN
     UPDATE chats SET updated_at = unixepoch() WHERE id = NEW.id;
   END`,

  `CREATE TRIGGER IF NOT EXISTS groups_updated_at
   AFTER UPDATE ON groups
   BEGIN
     UPDATE groups SET updated_at = unixepoch() WHERE id = NEW.id;
   END`,

  `CREATE TRIGGER IF NOT EXISTS automations_updated_at
   AFTER UPDATE ON automations
   BEGIN
     UPDATE automations SET updated_at = unixepoch() WHERE id = NEW.id;
   END`,
];

export async function runMigrations(): Promise<void> {
  const client = getClient();
  const logger = getLogger().child({ component: 'Migrations' });

  logger.info('Running database migrations');

  // Execute each migration individually (idempotent CREATE IF NOT EXISTS statements)
  // Using explicit transaction doesn't work with libsql client properly
  for (const migration of migrations) {
    await client.execute(migration);
  }
  logger.info('Database migrations completed successfully');
}

export async function checkMigrations(): Promise<{ applied: number; pending: number }> {
  const client = getClient();
  const logger = getLogger().child({ component: 'Migrations' });

  const result = await client.execute(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
  `);

  const existingTables = (result.rows as unknown as { name: string }[]).map(t => t.name);
  const expectedTables = [
    'accounts',
    'sessions',
    'messages',
    'contacts',
    'chats',
    'groups',
    'automations',
    'api_keys',
    'audit_logs',
  ];

  const applied = expectedTables.filter(t => existingTables.includes(t)).length;
  const pending = expectedTables.length - applied;

  logger.debug({ applied, pending }, 'Migration status check');
  return { applied, pending };
}