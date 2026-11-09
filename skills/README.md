# WA-MCP Pro Skills

This directory contains reusable AI Agent Skills for developing and operating WA-MCP Pro.

## Skill Categories

### Development Skills
Skills for building and maintaining WA-MCP Pro:

- **wa-mcp-development** - Understanding architecture, adding features, running tests
- **baileys-integration** - Baileys connection lifecycle, authentication, events
- **mcp-server-engineering** - MCP tools, resources, prompts, transports
- **sqlite-drizzle-engineering** - Database schema, migrations, repositories
- **wa-mcp-testing** - Unit, integration, and E2E testing
- **wa-mcp-security-audit** - Security auditing and vulnerability assessment

### Operations Skills
Skills for operating WA-MCP Pro via MCP:

- **whatsapp-operator** - Connection management, operational workflows
- **whatsapp-messaging** - Sending messages, media, reactions
- **whatsapp-chat-management** - Reading chats, contacts, groups
- **whatsapp-automation** - Creating and managing auto-reply rules

## Skill Format

Each skill is a directory containing a `SKILL.md` file with YAML frontmatter:

```yaml
---
name: skill-name
description: What this skill does
category: development|operations
version: 1.0.0
author: WA-MCP Pro Team
tags: [tag1, tag2]
---
```

## Installation

Skills can be installed by copying the skill directory to your AI agent's skill directory:

- **Claude Code**: `~/.claude/skills/`
- **OpenCode**: `~/.opencode/skills/`
- **Cursor**: `.cursor/skills/`

## Usage

Reference skills in your AI agent conversations:

```
/skill wa-mcp-development
```

Or let the agent discover them automatically based on context.

## Validation

Run the skill validator:

```bash
pnpm skills:validate
```

## Creating New Skills

1. Create a new directory under `skills/development/` or `skills/operations/`
2. Add a `SKILL.md` file following the format
3. Run `pnpm skills:validate` to verify
4. Add tests in `tests/skills/`