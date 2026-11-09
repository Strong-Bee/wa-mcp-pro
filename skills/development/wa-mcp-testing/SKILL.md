---
name: wa-mcp-testing
description: Testing WA-MCP Pro - unit, integration, E2E, MCP tools, REST API, database tests
category: development
version: 1.0.0
author: WA-MCP Pro Team
tags: [testing, vitest, unit, integration, e2e, mcp, api]
---

# WA-MCP Testing Skill

## Purpose
Comprehensive testing guidance for WA-MCP Pro.

## When to Use
- Writing new tests
- Running test suites
- Debugging test failures
- Adding test coverage
- CI/CD pipeline configuration

## Test Structure

```
tests/
├── unit/           # Fast, isolated tests
│   ├── config.test.ts
│   ├── security.test.ts
│   ├── utils.test.ts
│   └── automation.test.ts
├── integration/    # Database, MCP, API tests
│   ├── database.test.ts
│   ├── mcp-tools.test.ts
│   └── api-endpoints.test.ts
├── e2e/            # Full workflow tests
│   └── workflow.test.ts
├── fixtures/       # Test data
├── mocks/          # Mock implementations
└── skills/         # Skill validation tests
```

## Running Tests

```bash
# All tests
pnpm test

# Watch mode
pnpm test:watch

# With coverage
pnpm test:coverage

# Specific file
pnpm test tests/unit/security.test.ts
```

## Unit Testing Patterns

### Basic Test
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { myFunction } from '../../src/module.js';

describe('MyModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });

  it('should handle errors', () => {
    expect(() => myFunction(null)).toThrow();
  });
});
```

### Mocking Dependencies
```typescript
vi.mock('../../src/database/client.js', () => ({
  getDatabase: () => mockDb,
}));

vi.mock('@whiskeysockets/baileys', () => ({
  makeWASocket: vi.fn(() => mockSocket),
}));
```

## Integration Testing

### Database Tests
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { runMigrations } from '../../src/database/migrations.js';
import { createAccount } from '../../src/database/repositories/accounts.js';

describe('Account Repository', () => {
  beforeEach(async () => {
    await runMigrations();
  });

  it('should create account', async () => {
    const account = await createAccount({ name: 'Test', phoneNumber: '+1234567890' });
    expect(account.name).toBe('Test');
  });
});
```

### MCP Tool Tests
```typescript
import { createMCPServer } from '../../src/mcp/server.js';

describe('MCP Tools', () => {
  let server: ReturnType<typeof createMCPServer>;

  beforeEach(() => {
    server = createMCPServer();
  });

  it('should list tools', async () => {
    // Test tool registration
  });

  it('should execute whatsapp_send_message', async () => {
    // Mock WhatsApp service, test tool execution
  });
});
```

### REST API Tests
```typescript
import { createAPIServer } from '../../src/api/app.js';

describe('REST API', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await createAPIServer();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return health', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload).status).toBe('ok');
  });
});
```

## E2E Testing

Test full workflows:
1. Start server
2. Create account
3. Connect (mock QR)
4. Send message
5. Receive message
6. Verify database persistence

## Mocking Baileys

```typescript
// tests/mocks/baileys.ts
export const mockSocket = {
  ev: {
    on: vi.fn(),
    emit: vi.fn(),
  },
  sendMessage: vi.fn(),
  readMessages: vi.fn(),
  logout: vi.fn(),
  // ...
};

vi.mock('@whiskeysockets/baileys', () => ({
  makeWASocket: () => mockSocket,
  useMultiFileAuthState: () => ({ state: {}, saveCreds: vi.fn() }),
  fetchLatestBaileysVersion: () => ({ version: [2, 3000, 1000000000], isLatest: true }),
}));
```

## Test Utilities

```typescript
// tests/utils/test-helpers.ts
export async function createTestAccount() {
  return createAccount({ id: crypto.randomUUID(), name: 'Test Account' });
}

export async function createTestMessage(accountId: string) {
  // Create test message in database
}

export function createMockSocket(overrides = {}) {
  return { ...mockSocket, ...overrides };
}
```

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Push to main/develop
- Scheduled runs

Required checks:
- TypeScript typecheck
- ESLint
- Prettier
- Unit tests
- Integration tests
- Build

## Coverage Targets

- Statements: >80%
- Branches: >70%
- Functions: >80%
- Lines: >80%

## References

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [MSW for API Mocking](https://mswjs.io/)