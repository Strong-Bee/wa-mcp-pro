# Security Guide

## Overview

WA-MCP Pro implements defense-in-depth security with multiple layers of protection. This document describes the security architecture and best practices.

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                            │
├─────────────────────────────────────────────────────────────┤
│  Network: TLS/SSL, Firewall, Rate Limiting                   │
├─────────────────────────────────────────────────────────────┤
│  Transport: API Key Auth, Session Validation                 │
├─────────────────────────────────────────────────────────────┤
│  Application: RBAC, Input Validation, Audit Logging          │
├─────────────────────────────────────────────────────────────┤
│  Data: Encryption at Rest, Secret Redaction                  │
├─────────────────────────────────────────────────────────────┤
│  Runtime: Secure Dependencies, Secure Coding Practices       │
└─────────────────────────────────────────────────────────────┘
```

## Authentication

### API Key Authentication

#### Key Format
```
wamp_{64_hex_chars}
```

#### Generation
```bash
# Via CLI
pnpm generate-api-key --name "Production API" --permissions "accounts:read,messages:send" --expires 365

# Output: API Key: wamp_abc123...
```

#### Usage
```bash
# REST API
curl -H "Authorization: Bearer wamp_abc123..." http://localhost:3001/api/v1/accounts

# MCP HTTP
{
  "url": "http://localhost:3001/mcp",
  "headers": {
    "Authorization": "Bearer wamp_abc123..."
  }
}
```

#### Key Storage
- **Never stored in plaintext**
- Hashed with **scrypt** (N=16384, r=8, p=1)
- 16-byte salt per key
- Verification uses constant-time comparison

### Session Authentication (WhatsApp)

#### QR Code
- Generated per connection attempt
- 20-second expiration
- Never logged or stored

#### Pairing Code
- 8-character code
- Single-use
- Phone number verified

#### Session Storage
- **Encrypted with AES-256-GCM**
- Master key from `ENCRYPTION_KEY` env
- Stored in `storage/sessions/{accountId}.json`
- File permissions: 0600

## Authorization

### Roles

| Role | Permissions |
|------|-------------|
| `owner` | All permissions (`*`) |
| `admin` | All except user management |
| `operator` | Read + Send messages, contacts, groups |
| `readonly` | Read-only access |

### Permission Scopes

| Scope | Description |
|-------|-------------|
| `accounts:read` | List/view accounts |
| `accounts:manage` | Create/connect/disconnect accounts |
| `messages:read` | Read messages/chats |
| `messages:send` | Send messages/media |
| `contacts:read` | View contacts |
| `groups:read` | View groups |
| `automation:read` | View automation rules |
| `automation:manage` | Create/update/delete rules |
| `system:read` | Health, metrics, version |

### Authorization Flow
```
Request → Auth Middleware → Extract API Key → Validate Key → Check Scopes → Allow/Deny
```

## Encryption

### Credential Encryption (AES-256-GCM)

#### Algorithm Details
- **Cipher**: AES-256-GCM
- **Key**: 32 bytes from `ENCRYPTION_KEY` (64 hex chars)
- **IV**: 12 bytes random per operation
- **Salt**: 16 bytes random per encryption
- **Auth Tag**: 16 bytes for integrity

#### Encryption Format
```
[16-byte salt][12-byte IV][16-byte auth tag][encrypted data]
```

#### Key Derivation
```typescript
// PBKDF2 via scrypt
key = scrypt(masterKey, salt, 32)
```

### API Key Hashing
- **Algorithm**: scrypt
- **Parameters**: N=16384, r=8, p=1
- **Salt**: 16 bytes random
- **Output**: 32 bytes
- **Storage**: `salt:hash` (hex)

## Input Validation

### Zod Schemas
All inputs validated with Zod schemas:
- MCP tool inputs
- REST API request bodies
- Query parameters
- Path parameters

### Sanitization
- Path traversal prevention
- SQL injection prevention (Drizzle ORM)
- XSS prevention (no HTML rendering)
- MIME type validation
- File size limits

## Audit Logging

### Logged Events
- Account create/connect/disconnect/logout
- Message send/receive
- Contact/group operations
- Automation create/update/delete/toggle
- API key create/validate
- Authentication success/failure
- Permission denied events

### Log Format
```json
{
  "id": "uuid",
  "accountId": "uuid|null",
  "actor": "string",
  "action": "string",
  "resource": "string",
  "result": "success|failure",
  "metadata": "object|null",
  "createdAt": "ISO8601"
}
```

### Secret Redaction
Automatic redaction of:
- API keys
- Encryption keys
- Passwords
- Tokens
- Phone numbers (partial)
- Base64/hex secrets

## Secure Configuration

### Required Environment Variables
```env
# Must be 64 hex characters (32 bytes)
ENCRYPTION_KEY=a1b2c3d4e5f6...

# Must be 64 hex characters (32 bytes)
API_KEY=f1e2d3c4b5a6...
```

### Generation
```bash
# Generate secure keys
openssl rand -hex 32

# Or Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Production Checklist
- [ ] `ENCRYPTION_KEY` is 64 hex chars, not default
- [ ] `API_KEY` is 64 hex chars, not default
- [ ] `NODE_ENV=production`
- [ ] HTTPS enabled via reverse proxy
- [ ] `LOG_LEVEL=warn` or `error`
- [ ] Rate limiting enabled
- [ ] Firewall restricting access
- [ ] Regular key rotation scheduled

## Network Security

### Reverse Proxy (Required for Production)
```nginx
# Nginx example
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header Content-Security-Policy "default-src 'self'";
    
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Firewall Rules
```bash
# Allow only necessary ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (redirect to HTTPS)
ufw allow 443/tcp   # HTTPS
ufw deny 3000/tcp   # Block direct app access
ufw deny 3001/tcp   # Block direct app access
ufw enable
```

## Data Protection

### At Rest
- SQLite database: File permissions 0600
- Session files: Encrypted + 0600 permissions
- Media files: Access controlled by account

### In Transit
- HTTPS mandatory for production
- MCP HTTP uses TLS
- Internal communication: localhost only

### Data Retention
- Messages: Configurable limit (default 10,000)
- Audit logs: No auto-expiry (manual cleanup)
- Media: Configurable cleanup (default 30 days)
- Sessions: Until logout or expiry

## Vulnerability Management

### Dependency Scanning
```bash
# Audit
pnpm audit --prod

# CI/CD Integration
pnpm audit --json > audit-report.json
```

### Dependency Updates
```bash
# Check outdated
pnpm outdated

# Update
pnpm up -L
```

### Security Headers
```typescript
// Fastify helmet equivalent
app.addHook('onSend', (request, reply, payload) => {
  reply.header('X-Content-Type-Options', 'nosniff')
  reply.header('X-Frame-Options', 'DENY')
  reply.header('X-XSS-Protection', '1; mode=block')
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')
})
```

## Incident Response

### Compromised API Key
1. Delete compromised key via CLI/REST
2. Generate new key
3. Update client configurations
4. Audit recent activity via audit logs

### Compromised Encryption Key
1. Generate new `ENCRYPTION_KEY`
2. Re-encrypt all sessions (requires re-auth)
3. Update environment
4. Restart service

### Data Breach
1. Contain: Stop service, isolate network
2. Assess: Check audit logs, identify scope
3. Notify: Affected users, authorities if required
4. Remediate: Fix vulnerability, rotate keys
5. Document: Post-incident report

## Compliance

### Data Privacy
- No personal data sent to external services
- User data stored locally
- Right to deletion via account logout
- Data portability via export

### WhatsApp Terms
- Unofficial API (Baileys)
- Use responsibly
- Respect rate limits
- No spam/automation abuse
- User consent for messaging

## Security Checklist

### Pre-Deployment
- [ ] Strong `ENCRYPTION_KEY` generated
- [ ] Strong `API_KEY` generated
- [ ] `NODE_ENV=production`
- [ ] HTTPS configured
- [ ] Reverse proxy with security headers
- [ ] Firewall configured
- [ ] Rate limiting enabled
- [ ] Log aggregation configured
- [ ] Backup strategy tested
- [ ] Incident response plan documented

### Ongoing
- [ ] Monthly dependency audit
- [ ] Quarterly key rotation
- [ ] Regular log review
- [ ] Security patch updates
- [ ] Penetration testing (annual)

## Reporting Security Issues

**Do not** report security vulnerabilities publicly.

Email: **security@wa-mcp-pro.dev**

Include:
- Description of vulnerability
- Steps to reproduce
- Impact assessment
- Suggested fix (if any)

We aim to respond within 48 hours.