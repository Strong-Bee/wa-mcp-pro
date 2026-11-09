# Architecture Documentation

## Overview

WA-MCP Pro follows a modular monolith architecture with clear separation of concerns. The system is designed to support multiple transport protocols (STDIO, HTTP) while sharing a single WhatsApp connection manager and service layer.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        External Clients                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │
│  │  MCP STDIO  │  │  MCP HTTP   │  │         REST API            │  │
│  │  Transport  │  │  Transport  │  │        (Fastify)            │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────────┬──────────────┘  │
└─────────┼────────────────┼─────────────────────────┼─────────────────┘
          │                │                         │
          └────────────────┼─────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │   MCP Core  │
                    │  (Server,   │
                    │  Registry,  │
                    │  Prompts)   │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼─────┐    ┌─────▼─────┐    ┌─────▼─────┐
    │ Message   │    │ Contact   │    │  Chat     │
    │ Service   │    │ Service   │    │ Service   │
    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
          │                │                │
    ┌─────▼────────────────▼────────────────▼─────┐
    │           Connection Manager                │
    │  (Account Lifecycle, Locking, Routing)     │
    └────────────────────┬────────────────────────┘
                         │
                ┌────────▼────────┐
                │  Baileys Adapter│
                │  (Socket, Auth, │
                │   Events)       │
                └────────┬────────┘
                         │
                ┌────────▼────────┐
                │  WhatsApp Web   │
                └─────────────────┘
```

## Core Components

### 1. Configuration Layer (`src/config/`)
- **env.ts** - Zod-validated environment configuration
- **constants.ts** - Application constants and enums
- **config.schema.ts** - Database schema types

### 2. Core Infrastructure (`src/core/`)
- **container.ts** - Dependency injection container
- **logger.ts** - Pino structured logging
- **errors.ts** - Custom error classes with codes
- **events.ts** - Event bus for cross-component communication
- **lifecycle.ts** - Startup/shutdown hooks

### 3. WhatsApp Engine (`src/whatsapp/`)
- **connection-manager.ts** - Account lifecycle, locking, routing
- **baileys-adapter.ts** - Socket management, event handling
- **session-manager.ts** - Encrypted session persistence
- **reconnect-manager.ts** - Exponential backoff reconnection
- **message-service.ts** - All message sending operations
- **contact-service.ts** - Contact management
- **chat-service.ts** - Chat and message history
- **group-service.ts** - Group administration
- **media-service.ts** - Media download/validation
- **presence-service.ts** - Presence/typing indicators
- **history-service.ts** - Message history queries
- **jid-utils.ts** - JID normalization and validation

### 4. MCP Server (`src/mcp/`)
- **server.ts** - MCP server creation and capabilities
- **tool-registry.ts** - Central tool registration
- **resource-registry.ts** - MCP resources
- **prompt-registry.ts** - MCP prompts
- **tools/** - 17 tools across 8 categories
- **transports/** - STDIO and Streamable HTTP

### 5. REST API (`src/api/`)
- **app.ts** - Fastify app factory
- **routes/** - Route handlers by domain
- **middleware/** - Auth, rate limit, error handling
- **openapi.ts** - Swagger documentation

### 6. Database (`src/database/`)
- **client.ts** - Drizzle + SQLite setup
- **schema/** - Table definitions (9 tables)
- **migrations.ts** - SQL migrations with triggers
- **repositories/** - Data access layer (9 repos)
- **seed.ts** - Initial data seeding

### 6. Automation (`src/automation/`)
- **engine.ts** - Rule execution engine
- **rules.ts** - Trigger matching logic
- **scheduler.ts** - Cron-based scheduling
- **guards.ts** - Safety guards (rate limit, opt-out, loop prevention)

### 7. Security (`src/security/`)
- **encryption.ts** - AES-256-GCM
- **api-key.ts** - Scrypt hashing
- **permissions.ts** - RBAC
- **secret-redaction.ts** - Log sanitization
- **input-validation.ts** - Zod schemas
- **audit-log.ts** - Operation auditing

### 8. Monitoring (`src/monitoring/`)
- **metrics.ts** - Metrics collection
- **health.ts** - Health checks
- **diagnostics.ts** - Diagnostics export

### 9. Utils (`src/utils/`)
- **jid.ts** - JID utilities
- **phone-number.ts** - Phone validation
- **retry.ts** - Retry with backoff
- **date.ts** - Date formatting
- **sanitize.ts** - Input sanitization

## Data Flow

### Message Sending
```
Client Request
    ↓
MCP Tool / REST Endpoint
    ↓
Input Validation (Zod)
    ↓
Authorization Check
    ↓
Service Layer (MessageService)
    ↓
Connection Manager (get socket)
    ↓
Baileys Adapter (sendMessage)
    ↓
WhatsApp Web
    ↓
Event: message.sent
    ↓
Database: store message
    ↓
Return Result
```

### Incoming Message
```
WhatsApp Web
    ↓
Baileys Event: messages.upsert
    ↓
Baileys Adapter (handleIncomingMessage)
    ↓
Extract content, normalize JIDs
    ↓
Database: store message
    ↓
Database: update chat (unread, lastMessage)
    ↓
Event: message.received
    ↓
Automation Engine (check triggers)
    ↓
MCP Resource Update
    ↓
Available via REST/MCP
```

## Connection Management

### Account States
```
disconnected
    ↓ connect()
connecting
    ↓ QR generated
qr_pending
    ↓ QR scanned
authenticated
    ↓ Connection established
connected
    ↓ Network issue
reconnecting (with backoff)
    ↓ Reconnected
connected
    ↓ Logout
logged_out
    ↓ Manual disconnect
disconnected
```

### Account Locking
- Per-account mutex prevents duplicate connections
- Ensures single Baileys socket per account
- Prevents race conditions during connect/disconnect

## Security Model

### Encryption
- **Algorithm**: AES-256-GCM
- **Key**: 32 bytes from ENCRYPTION_KEY env
- **Salt**: 16 bytes random per encryption
- **IV**: 12 bytes random per encryption
- **Auth Tag**: 16 bytes for integrity

### API Keys
- **Hashing**: scrypt with 16-byte salt
- **Storage**: Hash only, never plaintext
- **Scopes**: 9 granular permissions
- **Expiration**: Optional TTL

### Authorization
```
Roles: Owner > Admin > Operator > Readonly
Permissions: 9 scopes
Middleware: Checks on every request
```

## Deployment Architecture

### Docker
```
┌─────────────────────────────────────┐
│           Docker Container          │
│  ┌───────────────────────────────┐  │
│  │         Node.js App           │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐  │  │
│  │  │ MCP  │ │ REST │ │ Baileys│  │  │
│  │  │STDIO │ │ API  │ │ Socket │  │  │
│  │  └──────┘ └──────┘ └──────┘  │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │     SQLite Database           │  │
│  │   (WAL mode, persistent vol)  │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │    Session Files (encrypted)  │  │
│  │       (persistent volume)     │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Volumes
- `/app/storage/sessions` - Encrypted session files
- `/app/storage/media` - Downloaded media
- `/app/storage/logs` - Application logs
- `/app/storage/wa-mcp.db` - SQLite database

### Health Checks
- `/health` - Basic liveness
- `/health/ready` - Database + WhatsApp ready
- `/health/live` - Process alive

## Scalability Considerations

### Current Limits
- Single Node.js process
- SQLite single-writer
- One Baileys socket per account
- In-memory event bus

### Horizontal Scaling (Future)
- Redis for distributed event bus
- PostgreSQL for multi-writer database
- Load balancer for REST API
- Separate worker processes for automation

## Technology Decisions

| Decision | Rationale |
|----------|-----------|
| TypeScript Strict | Catch errors at compile time |
| Drizzle ORM | Type-safe, lightweight, fast |
| Fastify | High performance, low overhead |
| Pino | Fast structured logging |
| Vitest | Fast, native ESM support |
| Docker Multi-stage | Small production images |
| SQLite + WAL | Zero-config, good concurrency |
| Baileys | Best unofficial WhatsApp library |
| MCP SDK | Official protocol implementation |