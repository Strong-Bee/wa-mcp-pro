---
name: wa-mcp-development
description: Development skill for WA-MCP Pro - architecture understanding, feature development, testing workflows
category: development
version: 1.0.0
author: WA-MCP Pro Team
tags: [architecture, development, typescript, testing]
---

# WA-MCP Pro Development Skill

## Purpose
This skill provides comprehensive guidance for developing WA-MCP Pro, including understanding the architecture, adding new features, modifying modules, and maintaining code quality.

## When to Use
- Starting new development on WA-MCP Pro
- Adding new features or modifying existing ones
- Running tests, linting, type checking
- Understanding project structure and conventions
- Debugging issues

## Scope
Covers the entire WA-MCP Pro codebase including:
- Core infrastructure (config, logging, errors, events, lifecycle, DI container)
- WhatsApp engine (Baileys adapter, connection manager, session manager)
- MCP server (tools, resources, prompts, transports)
- REST API (Fastify, routes, middleware, OpenAPI)
- Database (SQLite, Drizzle ORM, migrations, repositories)
- Automation engine (rules, scheduler, guards)
- Security (encryption, API keys, permissions, audit logging)
- Monitoring (metrics, health checks, diagnostics)

## Architecture Overview

```
wa-mcp-pro/
├── src/
│   ├── config/          # Configuration management
│   ├── core/            # Core infrastructure
│   ├── whatsapp/        # WhatsApp engine
│   ├── mcp/             # MCP server
│   ├── api/             # REST API
│   ├── database/        # Database layer
│   ├── automation/      # Automation engine
│   ├── security/        # Security utilities
│   ├── monitoring/      # Observability
│   └── utils/           # Utility functions
├── tests/               # Test suites
├── scripts/             # CLI scripts
└── skills/              # AI Agent skills
```

## Key Principles

1. **TypeScript Strict Mode** - All code must pass strict type checking
2. **Dependency Injection** - Use the container for service management
3. **Service Layer Pattern** - Business logic in services, transport in separate layer
4. **Event-Driven** - Use event bus for cross-component communication
5. **Security First** - Never log secrets, validate all inputs, use encrypted storage
6. **Testability** - Write tests for all new functionality

## Development Workflow

### 1. Setup
```bash
# Install dependencies
pnpm install

# Run migrations
pnpm db:migrate

# Seed database
pnpm db:seed

# Start development server
pnpm dev
```

### 2. Code Quality Checks
```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Formatting
pnpm format

# Tests
pnpm test
```

### 3. Adding a New Feature

#### Step 1: Understand the Domain
- Identify which module the feature belongs to
- Check existing patterns in that module
- Review related tests

#### Step 2: Implement
- Create/modify types in appropriate module
- Implement business logic in service layer
- Add database schema if needed (create migration)
- Add repository methods if needed
- Create MCP tool if exposing via MCP
- Create REST endpoint if exposing via API
- Add validation schemas

#### Step 3: Test
- Write unit tests for new logic
- Write integration tests for database operations
- Test MCP tool execution
- Test REST endpoint

#### Step 4: Verify
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

## Key Files to Know

### Configuration
- `src/config/env.ts` - Environment validation with Zod
- `src/config/constants.ts` - Application constants
- `.env.example` - Environment template

### Core Infrastructure
- `src/core/container.ts` - Dependency injection container
- `src/core/logger.ts` - Pino logger setup
- `src/core/errors.ts` - Error classes
- `src/core/events.ts` - Event bus
- `src/core/lifecycle.ts` - Application lifecycle hooks

### WhatsApp Engine
- `src/whatsapp/baileys-adapter.ts` - Baileys socket management
- `src/whatsapp/connection-manager.ts` - Account lifecycle
- `src/whatsapp/session-manager.ts` - Session persistence
- `src/whatsapp/message-service.ts` - Message sending
- `src/whatsapp/contact-service.ts` - Contact management
- `src/whatsapp/chat-service.ts` - Chat management
- `src/whatsapp/group-service.ts` - Group management

### MCP Server
- `src/mcp/server.ts` - MCP server creation
- `src/mcp/tool-registry.ts` - Tool registration
- `src/mcp/tools/` - Individual tool implementations
- `src/mcp/transports/` - STDIO and HTTP transports

### REST API
- `src/api/app.ts` - Fastify app creation
- `src/api/routes/` - Route handlers
- `src/api/middleware/` - Auth, rate limit, error handling

### Database
- `src/database/client.ts` - Drizzle + SQLite setup
- `src/database/schema/` - Table definitions
- `src/database/migrations.ts` - Migration runner
- `src/database/repositories/` - Data access layer

### Automation
- `src/automation/engine.ts` - Rule execution engine
- `src/automation/rules.ts` - Trigger matching
- `src/automation/guards.ts` - Rate limiting, opt-out, loop prevention

### Security
- `src/security/encryption.ts` - AES-256-GCM encryption
- `src/security/api-key.ts` - API key hashing/verification
- `src/security/permissions.ts` - RBAC
- `src/security/secret-redaction.ts` - Log sanitization

## Testing Patterns

### Unit Tests
```typescript
// tests/unit/module.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from '../../src/module.js';

describe('MyModule', () => {
  it('should do something', () => {
    expect(myFunction('input')).toBe('expected');
  });
});
```

### Integration Tests
```typescript
// tests/integration/database.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getDatabase } from '../../src/database/client.js';
import { runMigrations } from '../../src/database/migrations.js';

describe('Database', () => {
  beforeEach(async () => {
    await runMigrations();
  });

  it('should create account', async () => {
    // test database operations
  });
});
```

### MCP Tool Tests
```typescript
// tests/integration/mcp-tools.test.ts
import { createMCPServer } from '../../src/mcp/server.js';

describe('MCP Tools', () => {
  it('should register tools', async () => {
    const server = createMCPServer();
    // verify tools
  });
});
```

## Common Tasks

### Adding a New MCP Tool
1. Create tool file in `src/mcp/tools/`
2. Define Zod schema for input
3. Implement handler using service layer
4. Register in `src/mcp/tool-registry.ts`
5. Add tests

### Adding a New REST Endpoint
1. Create route file in `src/api/routes/`
2. Define Fastify schema
3. Implement handler with auth middleware
4. Register in `src/api/routes/index.ts`
5. Add OpenAPI documentation
6. Add tests

### Adding Database Schema
1. Create schema file in `src/database/schema/`
2. Export from `src/database/schema/index.ts`
3. Add migration SQL in `src/database/migrations.ts`
4. Create repository in `src/database/repositories/`
5. Run `pnpm db:migrate`

### Modifying Baileys Integration
- Work in `src/whatsapp/baileys-adapter.ts`
- Handle connection events properly
- Store messages in database
- Emit events for MCP/REST consumption

## Debugging Tips

1. **Check Logs** - Structured JSON logs in `storage/logs/`
2. **Database** - Use `pnpm db:studio` for Drizzle Studio
3. **MCP** - Test with `pnpm start:stdio` and MCP client
4. **REST** - Use Swagger UI at `/docs` endpoint
5. **Baileys** - Enable debug logging in `.env`

## Security Considerations

- Never commit `.env` files
- Use `ENCRYPTION_KEY` for session encryption
- Hash API keys with scrypt
- Sanitize all logs with `secret-redaction.ts`
- Validate all inputs with Zod
- Use parameterized queries (Drizzle handles this)

## Performance Guidelines

- Use database indexes for common queries
- Paginate list endpoints (default 50, max 100)
- Cache frequently accessed data
- Use connection pooling (SQLite WAL mode)
- Monitor memory usage

## References

- [Architecture Documentation](../docs/ARCHITECTURE.md)
- [API Documentation](../docs/API.md)
- [MCP Integration Guide](../docs/MCP.md)
- [Security Guide](../docs/SECURITY.md)
- [Deployment Guide](../docs/DEPLOYMENT.md)