# Changelog

All notable changes to WA-MCP Pro will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-09

### Added
- Initial release of WA-MCP Pro
- Multi-account WhatsApp management via Baileys
- QR Code and Pairing Code authentication
- Encrypted session persistence (AES-256-GCM)
- 17 MCP Tools across 8 categories
- 8 MCP Resources for real-time data access
- 5 MCP Prompts for common workflows
- REST API with 30+ endpoints
- API Key authentication with scopes
- Role-based authorization (4 roles)
- SQLite database with Drizzle ORM (9 tables)
- Automation engine with 4 trigger types
- Safety guards (rate limit, opt-out, loop prevention)
- Media management (download, validate, cleanup)
- Comprehensive security (encryption, audit logging, secret redaction)
- Health checks and diagnostics
- CLI for account and system management
- 6 Development Skills for AI agents
- 4 Operations Skills for AI agents
- Skill validation system
- Multi-stage Dockerfile
- Docker Compose for production
- GitHub Actions CI/CD pipeline
- Complete documentation suite
- Unit tests with Vitest
- Cross-platform support (Windows, Linux, macOS)

### Security
- AES-256-GCM encryption for credentials
- Scrypt-hashed API keys
- Input validation with Zod
- Secret redaction in logs
- Path traversal protection
- Rate limiting
- Audit logging

---

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag: `git tag v1.0.0`
4. Push tag: `git push origin v1.0.0`
5. GitHub Actions creates release
6. Docker image published