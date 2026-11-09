---
name: baileys-integration
description: Baileys WhatsApp integration - connection lifecycle, authentication, event handling, message processing
category: development
version: 1.0.0
author: WA-MCP Pro Team
tags: [baileys, whatsapp, websocket, authentication, events]
---

# Baileys Integration Skill

## Purpose
Guide for integrating and maintaining the Baileys WhatsApp Web client in WA-MCP Pro.

## When to Use
- Setting up WhatsApp connection
- Managing authentication (QR, pairing code)
- Handling connection events
- Processing incoming messages
- Managing reconnection logic
- Debugging Baileys issues

## Key Components

### 1. Connection Manager (`src/whatsapp/connection-manager.ts`)
- Account creation and lifecycle
- Connection initiation
- QR code generation
- Pairing code requests
- Disconnect/logout handling

### 2. Baileys Adapter (`src/whatsapp/baileys-adapter.ts`)
- Socket creation with multi-file auth state
- Event handlers for all Baileys events
- Message upsert/update/delete handling
- Chat/contact/group updates
- Automatic reconnection with exponential backoff

### 3. Session Manager (`src/whatsapp/session-manager.ts`)
- Encrypted credential storage (AES-256-GCM)
- File-based and database persistence
- Session loading/saving/deletion

### 4. Reconnect Manager (`src/whatsapp/reconnect-manager.ts`)
- Exponential backoff with jitter
- Configurable max attempts
- State tracking per account

## Authentication Flows

### QR Code Authentication
```typescript
// 1. Create account
await createAccount({ id: 'uuid', name: 'My Account' });

// 2. Connect (generates QR)
await connectAccount('uuid');

// 3. Get QR code
const qr = getAccountQR('uuid');
// Display QR to user

// 4. Wait for connection
// Event: whatsapp.connected
```

### Pairing Code Authentication
```typescript
// 1. Create account with phone number
await createAccount({ id: 'uuid', name: 'My Account', phoneNumber: '+1234567890' });

// 2. Request pairing code
const code = await getAccountPairingCode('uuid', '+1234567890');
// Enter code on WhatsApp mobile app

// 3. Wait for connection
```

## Event Handling

All Baileys events are normalized and emitted via the event bus:

```typescript
import { subscribe, EVENT_TYPES } from '../core/events.js';

// Connection events
subscribe(EVENT_TYPES[0], (accountId) => {}); // connected
subscribe(EVENT_TYPES[1], (accountId) => {}); // disconnected
subscribe(EVENT_TYPES[2], (accountId, qr) => {}); // qr.updated
subscribe(EVENT_TYPES[3], (accountId, error) => {}); // connection.error

// Message events
subscribe(EVENT_TYPES[4], (accountId, message) => {}); // received
subscribe(EVENT_TYPES[5], (accountId, update) => {}); // sent
subscribe(EVENT_TYPES[6], (accountId, deletion) => {}); // deleted

// Other events
subscribe(EVENT_TYPES[8], (accountId, chat) => {}); // chat.updated
subscribe(EVENT_TYPES[9], (accountId, contact) => {}); // contact.updated
subscribe(EVENT_TYPES[10], (accountId, group) => {}); // group.updated
```

## Message Processing

Incoming messages are automatically:
1. Stored in database with full content
2. Chat metadata updated (unread count, last message)
3. Events emitted for MCP/REST consumption

```typescript
// Message structure
{
  id: string,
  from: string,
  to: string,
  timestamp: Date,
  type: 'text' | 'image' | 'video' | ...,
  content: string | object,
  pushName: string,
  isFromMe: boolean,
  isGroup: boolean,
  quotedMessage?: IncomingMessage
}
```

## Reconnection Logic

- Automatic on unexpected disconnect
- Exponential backoff: 1s, 2s, 4s, 8s... (max 30s)
- Jitter added to prevent thundering herd
- Max 10 attempts by default (configurable)
- Stops on logout (DisconnectReason.loggedOut)

## JID Handling

Use utilities in `src/utils/jid.ts`:
- `normalizeJid()` - Phone number to JID
- `normalizeGroupJid()` - Group ID to JID
- `isGroupJid()` / `isUserJid()` - Type checking
- `jidToPhoneNumber()` / `phoneNumberToJid()` - Conversion

## Common Issues

| Issue | Solution |
|-------|----------|
| Connection fails | Check network, WhatsApp Web availability |
| QR not generating | Ensure no existing session, check logs |
| Pairing code invalid | Verify phone number format, try again |
| Reconnect loops | Check credentials, may need fresh login |
| Message not sending | Verify connection status, check JID format |

## Testing

Mock Baileys for unit tests:
```typescript
vi.mock('@whiskeysockets/baileys', () => ({
  makeWASocket: vi.fn(),
  useMultiFileAuthState: vi.fn(),
  // ...
}));
```

## References

- [Baileys Documentation](https://github.com/WhiskeySockets/Baileys)
- [WA-MCP Architecture](../docs/ARCHITECTURE.md)
- [WhatsApp Web Protocol](https://github.com/WhiskeySockets/Baileys/blob/main/docs/PROTOCOL.md)