---
name: wa-mcp-security-audit
description: Security auditing for WA-MCP Pro - authentication, authorization, encryption, vulnerabilities
category: development
version: 1.0.0
author: WA-MCP Pro Team
tags: [security, audit, authentication, authorization, encryption, vulnerabilities]
---

# WA-MCP Security Audit Skill

## Purpose
Guide for performing security audits on WA-MCP Pro.

## When to Use
- Before releases
- After security-relevant changes
- Periodic security reviews
- Vulnerability assessments
- Compliance checks

## Audit Checklist

### 1. Authentication & Session Management
- [ ] API keys hashed with scrypt (not plaintext)
- [ ] Session credentials encrypted with AES-256-GCM
- [ ] ENCRYPTION_KEY is 32 bytes (64 hex chars)
- [ ] QR codes not logged or exposed
- [ ] Pairing codes have TTL and single-use
- [ ] Session files have restricted permissions (0600)
- [ ] Logout properly destroys sessions

### 2. Authorization
- [ ] Role-based access control implemented
- [ ] Permission scopes enforced on all endpoints
- [ ] MCP tools check permissions
- [ ] REST API uses auth middleware
- [ ] Account isolation - no cross-account access

### 3. Input Validation
- [ ] All MCP tools use Zod schemas
- [ ] All REST endpoints validate request body/query
- [ ] Phone numbers validated and normalized
- [ ] JIDs validated before use
- [ ] File paths sanitized (no path traversal)
- [ ] MIME types validated for media

### 4. Encryption
- [ ] AES-256-GCM for credential storage
- [ ] Master key from environment (not hardcoded)
- [ ] Auth tag verification on decrypt
- [ ] Unique IV per encryption
- [ ] Key rotation capability

### 5. API Security
- [ ] Rate limiting on all endpoints
- [ ] CORS properly configured
- [ ] Security headers (Helmet.js equivalent)
- [ ] Request size limits
- [ ] API key expiration support

### 6. Data Protection
- [ ] No secrets in logs (secret-redaction.ts)
- [ ] No secrets in error responses
- [ ] Audit logs don't contain sensitive data
- [ ] Database credentials not in code
- [ ] Media files access-controlled

### 7. Network Security
- [ ] HTTPS in production (reverse proxy)
- [ ] No SSRF vulnerabilities
- [ ] Internal services not exposed
- [ ] Database not exposed externally

### 8. Dependencies
- [ ] No known vulnerabilities (npm audit)
- [ ] Dependencies pinned to specific versions
- [ ] Regular dependency updates
- [ ] License compatibility check

## Audit Commands

```bash
# Dependency audit
pnpm audit --prod

# License check
pnpm licenses list

# Secret scan
trufflehog filesystem .

# Static analysis
pnpm typecheck
pnpm lint
```

## Common Vulnerabilities to Check

| Category | Check |
|----------|-------|
| SQL Injection | Drizzle ORM parameterized queries only |
| XSS | No HTML rendering, sanitize outputs |
| Path Traversal | sanitizePath() for file operations |
| SSRF | No user-controlled URLs fetched |
| RCE | No eval, no dynamic code execution |
| Auth Bypass | All endpoints have auth middleware |
| Info Disclosure | Error messages sanitized |

## Security Testing

### Penetration Testing
```bash
# Test authentication bypass
curl -X GET http://localhost:3001/api/v1/accounts

# Test rate limiting
for i in {1..150}; do curl http://localhost:3001/health; done

# Test input validation
curl -X POST http://localhost:3001/api/v1/messages/send \
  -H "Authorization: Bearer invalid" \
  -d '{"to": "invalid", "message": "<script>alert(1)</script>"}'
```

### Dependency Scanning
```bash
# Audit
pnpm audit --json > audit-report.json

# Check for outdated
pnpm outdated
```

## Incident Response

If vulnerability found:
1. Assess severity (CVSS)
2. Create patch
3. Test fix
4. Deploy hotfix
5. Rotate compromised credentials
6. Update audit log

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)