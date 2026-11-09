# Development Guide

## Quick Start

```bash
# Clone and setup
git clone https://github.com/wa-mcp-pro/wa-mcp-pro.git
cd wa-mcp-pro
corepack enable
pnpm install
cp .env.example .env
# Edit .env with your keys
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Project Structure

```
wa-mcp-pro/
├── src/
│   ├── config/          # Configuration
│   ├── core/            # Core infrastructure
│   ├── whatsapp/        # WhatsApp engine
│   ├── mcp/             # MCP server
│   ├── api/             # REST API
│   ├── automation/      # Automation engine
│   ├── database/        # Database layer
│   ├── security/        # Security utilities
│   ├── monitoring/      # Observability
│   ├── utils/           # Utilities
│   ├── scripts/         # CLI scripts
│   ├── index.ts         # Main entry
│   ├── app.ts           # App factory
│   └── cli.ts           # CLI commands
├── tests/               # Test suites
├── skills/              # AI Agent Skills
├── docs/                # Documentation
└── scripts/             # Build scripts
```

## Development Workflow

### 1. Code Changes

```bash
# Start dev server with hot reload
pnpm dev

# Run tests in watch mode
pnpm test:watch

# Type check
pnpm typecheck

# Lint
pnpm lint

# Format
pnpm format
```

### 2. Adding Features

#### New MCP Tool
1. Create tool file in `src/mcp/tools/`
2. Define Zod schema
3. Implement handler using service layer
3. Register in `src/mcp/tool-registry.ts`
4. Add tests

#### New REST Endpoint
1. Create route file in `src/api/routes/`
2. Define Fastify schema
3. Implement handler with auth middleware
4. Register in `src/api/routes/index.ts`
5. Add OpenAPI documentation

#### New Database Table
1. Create schema in `src/database/schema/`
2. Export from `src/database/schema/index.ts`
3. Add migration SQL in `src/database/migrations.ts`
4. Create repository in `src/database/repositories/`
5. Run `pnpm db:migrate`

### 3. Testing

```bash
# All tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage

# Specific file
pnpm test tests/unit/security.test.ts
```

### 4. Building

```bash
# Production build
pnpm build

# Verify build
node dist/index.js --help
```

## Code Standards

### TypeScript
- Strict mode enabled
- No `any` without `@ts-expect-error` comment
- Use type inference
- Prefer `interface` for objects
- Use `readonly` for immutable data
- Explicit return types for public APIs

### Code Style (ESLint + Prettier)
```bash
# Check
pnpm lint
pnpm format:check

# Fix
pnpm lint:fix
pnpm format
```

### Error Handling
- Use custom error classes from `src/core/errors.ts`
- Include correlation IDs
- Sanitize error responses
- Log with structured data

### Security
- Never log secrets
- Validate all inputs with Zod
- Use parameterized queries (Drizzle ORM)
- Hash sensitive data
- Encrypt credentials at rest

## Architecture Patterns

### Service Layer
Business logic in services, transport in separate layer:
```
Transport (MCP/REST) → Service Layer → Database/External
```

### Dependency Injection
Use container for service management:
```typescript
import { container, register, resolve } from './core/container.js'

register('myService', () => new MyService())
const service = await resolve('myService')
```

### Event-Driven
Use event bus for cross-component communication:
```typescript
import { emit, subscribe, EVENT_TYPES } from './core/events.js'

emit(EVENT_TYPES[4], accountId, message)  // message.received
subscribe(EVENT_TYPES[4], handler)
```

### Repository Pattern
Data access through repositories:
```typescript
import { createAccount, getAccount } from './database/repositories/accounts.js'

const account = await createAccount({ name: 'Test' })
```

## Adding a New MCP Tool

### 1. Create Tool File
```typescript
// src/mcp/tools/my.tools.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { z } from 'zod'
import { getLogger } from '../../core/logger.js'
import { myService } from '../../services/my.service.js'

const mySchema = z.object({
  param1: z.string(),
  param2: z.number().optional(),
})

export function registerMyTools(server: Server): void {
  server.setRequestHandler('tools/list', async () => ({
    tools: [{
      name: 'my_tool',
      description: 'Description of what this tool does',
      inputSchema: {
        type: 'object',
        properties: {
          param1: { type: 'string', description: 'Parameter 1' },
          param2: { type: 'number', description: 'Optional parameter 2' },
        },
        required: ['param1'],
      },
    }],
  }))

  server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params

    if (name === 'my_tool') {
      const { param1, param2 } = mySchema.parse(args)
      const result = await myService.doSomething(param1, param2)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }

    throw new Error(`Unknown tool: ${name}`)
  })
}
```

### 2. Register Tool
```typescript
// src/mcp/tool-registry.ts
import { registerMyTools } from './tools/my.tools.js'

export function registerTools(server: Server): void {
  // ... existing registrations
  registerMyTools(server)
}
```

### 3. Add Tests
```typescript
// tests/integration/mcp-tools.test.ts
import { createMCPServer } from '../../src/mcp/server.js'

describe('My Tools', () => {
  it('should register my_tool', async () => {
    const server = createMCPServer()
    // Verify tool registration
  })

  it('should execute my_tool', async () => {
    // Test tool execution
  })
})
```

## Adding a New REST Endpoint

### 1. Create Route File
```typescript
// src/api/routes/my.routes.ts
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getLogger } from '../../core/logger.js'
import { myService } from '../../services/my.service.js'
import { requireSystemRead } from '../middleware/authorization.js'

const mySchema = z.object({
  param1: z.string(),
  param2: z.number().optional(),
})

export async function myRoutes(app: FastifyInstance): Promise<void> {
  app.post('/my-endpoint', {
    preHandler: requireSystemRead,
    schema: {
      body: {
        type: 'object',
        properties: {
          param1: { type: 'string' },
          param2: { type: 'number' },
        },
        required: ['param1'],
      },
    },
  }, async (request, reply) => {
    const { param1, param2 } = mySchema.parse(request.body)
    const result = await myService.doSomething(param1, param2)
    return result
  })
}
```

### 2. Register Routes
```typescript
// src/api/routes/index.ts
import { myRoutes } from './my.routes.js'

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // ... existing routes
  await app.register(myRoutes, { prefix: '/api/v1' })
}
```

### 3. Add OpenAPI Documentation
```typescript
// Automatically generated from schema
// Access at /docs
```

## Database Operations

### Creating a Table
```typescript
// src/database/schema/new_table.ts
import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const newTable = sqliteTable('new_table', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  nameIdx: uniqueIndex('new_table_name_unique').on(table.name),
}))

export type NewTable = typeof newTable.$inferSelect
export type NewNewTable = typeof newTable.$inferInsert
```

### Creating a Repository
```typescript
// src/database/repositories/new_table.ts
import { getDatabase } from '../client.js'
import { newTable, NewTable, NewNewTable } from '../schema/new_table.js'
import { eq, desc } from 'drizzle-orm'

export async function createNewTable(data: Omit<NewNewTable, 'id' | 'createdAt' | 'updatedAt'>): Promise<NewTable> {
  const db = getDatabase()
  const id = crypto.randomUUID()
  const now = new Date()
  const record = { id, ...data, createdAt: now, updatedAt: now }
  await db.insert(newTable).values(record)
  return record
}

export async function getNewTable(id: string): Promise<NewTable | null> {
  const db = getDatabase()
  const result = await db.select().from(newTable).where(eq(newTable.id, id)).limit(1)
  return result[0] ?? null
}
```

### Adding Migration
```typescript
// src/database/migrations.ts
const migrations = [
  // ... existing migrations
  `CREATE TABLE IF NOT EXISTS new_table (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE TRIGGER IF NOT EXISTS new_table_updated_at
   AFTER UPDATE ON new_table
   BEGIN
     UPDATE new_table SET updated_at = unixepoch() WHERE id = NEW.id;
   END`,
]
```

## Testing Patterns

### Unit Test
```typescript
// tests/unit/my-module.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { myFunction } from '../../src/my-module.js'

describe('MyModule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should do something', () => {
    const result = myFunction('input')
    expect(result).toBe('expected')
  })

  it('should handle errors', () => {
    expect(() => myFunction(null)).toThrow()
  })
})
```

### Integration Test
```typescript
// tests/integration/database.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { runMigrations } from '../../src/database/migrations.js'
import { createAccount } from '../../src/database/repositories/accounts.js'

describe('Account Repository', () => {
  beforeEach(async () => {
    await runMigrations()
  })

  it('should create account', async () => {
    const account = await createAccount({ name: 'Test', phoneNumber: '+1234567890' })
    expect(account.name).toBe('Test')
  })
})
```

### MCP Tool Test
```typescript
// tests/integration/mcp-tools.test.ts
import { createMCPServer } from '../../src/mcp/server.js'

describe('MCP Tools', () => {
  let server: ReturnType<typeof createMCPServer>

  beforeEach(() => {
    server = createMCPServer()
  })

  it('should list tools', async () => {
    // Test tool registration
  })

  it('should execute whatsapp_send_message', async () => {
    // Mock WhatsApp service, test tool execution
  })
})
```

## Debugging

### VS Code Launch Config
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Dev Server",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["dev"],
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["test:watch"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Logs
```bash
# View logs
tail -f storage/logs/app.log

# Filter
grep "ERROR" storage/logs/app.log
grep "accountId=uuid" storage/logs/app.log
```

### Database
```bash
# Drizzle Studio
pnpm db:studio

# Direct SQLite
sqlite3 storage/wa-mcp.db
.tables
.schema
SELECT * FROM accounts;
```

## Common Tasks

### Generate API Key
```bash
pnpm generate-api-key --name "My App" --permissions "accounts:read,messages:send"
```

### Run Migrations
```bash
pnpm db:migrate
```

### Seed Database
```bash
pnpm db:seed
```

### Validate Skills
```bash
pnpm skills:validate
```

### Build for Production
```bash
pnpm build
```

### Docker Build
```bash
docker build -t wa-mcp-pro .
```

## Useful Commands

```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Type check
pnpm typecheck

# Lint
pnpm lint

# Format
pnpm format

# Test
pnpm test

# Build
pnpm build

# Database
pnpm db:migrate
pnpm db:seed

# CLI
pnpm wa-mcp --help

# Skills
pnpm skills:validate
pnpm skills:list

# Docker
pnpm docker:build
pnpm docker:run
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Resources

- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/REST-API.md)
- [MCP Tools](docs/MCP-TOOLS.md)
- [Security](docs/SECURITY.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Skills](docs/SKILLS.md)