---
name: whatsapp-operator
description: Operating WA-MCP Pro - connection management, status monitoring, troubleshooting
category: operations
version: 1.0.0
author: WA-MCP Pro Team
tags: [operations, connection, monitoring, troubleshooting]
---

# WhatsApp Operator Skill

## Purpose
Guide for AI Agents operating WA-MCP Pro via MCP tools.

## When to Use
- Checking connection status
- Connecting/disconnecting accounts
- Getting QR codes for authentication
- Monitoring system health
- Troubleshooting connection issues

## Key MCP Tools

### Connection Management
- `whatsapp_connect` - Start connection for an account
- `whatsapp_disconnect` - Disconnect without logout
- `whatsapp_logout` - Full logout (removes session)
- `whatsapp_get_status` - Check connection state
- `whatsapp_list_accounts` - List all accounts
- `whatsapp_get_qr` - Get QR code for auth
- `whatsapp_get_pairing_code` - Get pairing code
- `whatsapp_reconnect` - Force reconnect

### Status Values
- `disconnected` - Not connected
- `connecting` - Attempting connection
- `qr_pending` - QR code available
- `authenticated` - Authenticated, not fully connected
- `connected` - Fully connected and ready
- `reconnecting` - Automatic reconnect in progress
- `logged_out` - Explicitly logged out
- `error` - Connection error

## Common Workflows

### First-Time Setup
```bash
# 1. List accounts (empty initially)
whatsapp_list_accounts

# 2. Create account
whatsapp_create_account --id "uuid" --name "My WhatsApp"

# 3. Connect (generates QR)
whatsapp_connect --account_id "uuid"

# 4. Get QR code
whatsapp_get_qr --account_id "uuid"
# Display QR to user

# 5. Wait for connection
whatsapp_get_status --account_id "uuid"
# Should show "connected"
```

### Pairing Code Flow (Alternative)
```bash
# 1. Create account with phone number
whatsapp_create_account --id "uuid" --name "My WhatsApp" --phone_number "+1234567890"

# 2. Get pairing code
whatsapp_get_pairing_code --account_id "uuid" --phone_number "+1234567890"
# Enter code on WhatsApp mobile app

# 3. Connect
whatsapp_connect --account_id "uuid"
```

### Daily Operations
```bash
# Check all accounts
whatsapp_list_accounts

# Check specific account
whatsapp_get_status --account_id "uuid"

# Disconnect for maintenance
whatsapp_disconnect --account_id "uuid"

# Reconnect after maintenance
whatsapp_connect --account_id "uuid"
```

### Troubleshooting
```bash
# If connection failed
whatsapp_get_status --account_id "uuid"
# Check status, look for "error"

# If QR expired
whatsapp_disconnect --account_id "uuid"
whatsapp_connect --account_id "uuid"
whatsapp_get_qr --account_id "uuid"

# If logged out unexpectedly
whatsapp_get_status --account_id "uuid"
# Will show "logged_out"
# Need to re-authenticate

# Force reconnect
whatsapp_reconnect --account_id "uuid"
```

## Health Monitoring
```bash
# System health
whatsapp_health_check

# Server info
whatsapp_get_server_info

# Capabilities
whatsapp_get_capabilities
```

## Account Status Transitions

```
disconnected → connecting → qr_pending → authenticated → connected
                    ↓              ↓              ↓
                  error         error         reconnecting
                                              ↓
                                            connected
                                              ↓
                                           disconnected (manual)
                                              ↓
                                           logged_out (explicit)
```

## Error Handling

| Error | Action |
|-------|--------|
| WA_NOT_CONNECTED | Call whatsapp_connect first |
| WA_AUTH_REQUIRED | Get QR or pairing code |
| WA_SESSION_EXPIRED | Logout and re-authenticate |
| WA_CONNECTION_FAILED | Check logs, try reconnect |

## Best Practices

1. **Always check status first** before operations
2. **Use pairing code** for mobile users (easier than QR)
3. **Monitor health** regularly with whatsapp_health_check
4. **Don't spam reconnect** - wait for exponential backoff
5. **Log out properly** when done with an account
6. **Keep sessions backed up** - session files in storage/sessions/

## Limitations

- One WhatsApp Web session per phone number
- QR codes expire after ~20 seconds
- Pairing codes are single-use
- Reconnection has max attempts (default 10)
- Media downloads limited by size (default 50MB)

## References

- [MCP Tools Reference](../docs/MCP-TOOLS.md)
- [Troubleshooting Guide](../docs/TROUBLESHOOTING.md)
- [Architecture](../docs/ARCHITECTURE.md)