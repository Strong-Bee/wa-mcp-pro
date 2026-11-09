---
name: sqlite-drizzle-engineering
description: SQLite database with Drizzle ORM - schema design, migrations, repositories, queries
category: development
version: 1.0.0
author: WA-MCP Pro Team
tags: [sqlite, drizzle, orm, database, migrations, repositories]
---

# SQLite + Drizzle Engineering Skill

## Purpose
Guide for database development using SQLite and Drizzle ORM in WA-MCP Pro.

## When to Use
- Designing database schema
- Creating migrations
- Writing repository methods
- Optimizing queries
- Managing backups

## Architecture

### Client (`src/database/client.ts`)
- Better-SQLite3 with WAL mode
- Drizzle ORM with schema
- Foreign keys, busy timeout enabled

### Schema (`src/database/schema/`)
Each table in separate file:
- `accounts.ts` - WhatsApp accounts
- `sessions.ts` - Encrypted sessions
- `messages.ts` - Message history
- `contacts.ts` - Contact list
- `chats.ts` - Chat metadata
- `groups.ts` - Group info
- `automations.ts` - Auto-reply rules
- `api_keys.ts` - Hashed API keys
- `audit_logs.ts` - Audit trail

### Migrations (`src/database/migrations.ts`)
- SQL-based migrations
- Run on startup
- Version tracking

### Repositories (`src/database/repositories/`)
- Type-safe data access
- CRUD operations
- Query builders with Drizzle

## Creating a New Table

```typescript
// src/database/schema/new_table.ts
import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const newTable = sqliteTable('new_table', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  nameIdx: uniqueIndex('new_table_name_unique').on(table.name),
}));

export type NewTable = typeof newTable.$inferSelect;
export type NewNewTable = typeof newTable.$inferInsert;
```

## Creating a Repository

```typescript
// src/database/repositories/new_table.ts
import { getDatabase } from '../client.js';
import { newTable, NewTable, NewNewTable } from '../schema/new_table.js';
import { eq, desc } from 'drizzle-orm';

export async function createNewTable(data: Omit<NewNewTable, 'id' | 'createdAt' | 'updatedAt'>): Promise<NewTable> {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const now = new Date();
  const record = { id, ...data, createdAt: now, updatedAt: now };
  await db.insert(newTable).values(record);
  return record;
}

export async function getNewTable(id: string): Promise<NewTable | null> {
  const db = getDatabase();
  const result = await db.select().from(newTable).where(eq(newTable.id, id)).limit(1);
  return result[0] ?? null;
}

// ... more methods
```

## Adding Migration

Add SQL to `src/database/migrations.ts` in the `migrations` array:

```sql
CREATE TABLE IF NOT EXISTS new_table (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TRIGGER IF NOT EXISTS new_table_updated_at
AFTER UPDATE ON new_table
BEGIN
  UPDATE new_table SET updated_at = unixepoch() WHERE id = NEW.id;
END;
```

## Running Migrations

```bash
pnpm db:migrate
```

## Query Patterns

### Basic Queries
```typescript
const db = getDatabase();

// Select with filters
const results = await db
  .select()
  .from(messages)
  .where(and(eq(messages.accountId, accountId), eq(messages.chatJid, chatJid)))
  .orderBy(desc(messages.timestamp))
  .limit(50);

// Count
const count = await db.select({ count: count() }).from(messages).where(eq(messages.accountId, accountId));

// Insert
await db.insert(messages).values({ ... });

// Update
await db.update(messages).set({ status: 'read' }).where(eq(messages.id, id));

// Delete
await db.delete(messages).where(eq(messages.id, id));
```

### Transactions
```typescript
await db.transaction(async (tx) => {
  await tx.insert(messages).values(msg1);
  await tx.update(chats).set({ unreadCount: 0 }).where(eq(chats.id, chatId));
});
```

## Best Practices

1. **Always use transactions** for multi-table operations
2. **Add indexes** for frequently queried columns
3. **Use foreign keys** for referential integrity
4. **Enable WAL mode** for better concurrency
5. **Use prepared statements** (Drizzle does this automatically)
6. **Paginate results** - never return unbounded lists

## Testing

```typescript
import { getDatabase } from '../../src/database/client.js';
import { runMigrations } from '../../src/database/migrations.js';

beforeEach(async () => {
  await runMigrations();
});

it('should create and retrieve record', async () => {
  const record = await createNewTable({ name: 'test' });
  const found = await getNewTable(record.id);
  expect(found?.name).toBe('test');
});
```

## References

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Better-SQLite3 Documentation](https://github.com/WiseLibs/better-sqlite3)
- [SQLite Documentation](https://www.sqlite.org/docs.html)