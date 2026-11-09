# Skills System Documentation

## Overview

WA-MCP Pro includes a comprehensive **AI Agent Skills System** that provides reusable, well-documented skills for both developing and operating the platform. Skills are structured as markdown files with YAML frontmatter, making them portable across different AI agent platforms.

## Skill Structure

Each skill is a directory containing a `SKILL.md` file with YAML frontmatter:

```
skills/
├── development/
│   ├── wa-mcp-development/
│   │   └── SKILL.md
│   ├── baileys-integration/
│   │   └── SKILL.md
│   ├── mcp-server-engineering/
│   │   └── SKILL.md
│   ├── sqlite-drizzle-engineering/
│   │   └── SKILL.md
│   ├── wa-mcp-testing/
│   │   └── SKILL.md
│   └── wa-mcp-security-audit/
│       └── SKILL.md
└── operations/
    ├── whatsapp-operator/
    │   └── SKILL.md
    ├── whatsapp-messaging/
    │   └── SKILL.md
    ├── whatsapp-chat-management/
    │   └── SKILL.md
    └── whatsapp-automation/
        └── SKILL.md
```

## Skill Format

### YAML Frontmatter
```yaml
---
name: skill-name
description: Brief description of what this skill does
category: development|operations
version: 1.0.0
author: WA-MCP Pro Team
tags: [tag1, tag2, tag3]
---
```

### Content Sections
1. **Purpose** - What the skill accomplishes
2. **When to Use** - Scenarios where skill applies
3. **Scope/Architecture** - Technical details
4. **Step-by-Step Instructions** - Actionable procedures
5. **Code Examples** - Copy-paste ready code
6. **Best Practices** - Dos and don'ts
7. **Troubleshooting** - Common issues
8. **References** - Links to docs/code

## Available Skills

### Development Skills (6)

| Skill | Purpose |
|-------|---------|
| `wa-mcp-development` | Architecture understanding, development workflows, testing, debugging |
| `baileys-integration` | Baileys connection lifecycle, authentication, events, message processing |
| `mcp-server-engineering` | MCP tools, resources, prompts, STDIO/HTTP transports |
| `sqlite-drizzle-engineering` | Schema design, migrations, repositories, query optimization |
| `wa-mcp-testing` | Unit, integration, E2E testing strategies and patterns |
| `wa-mcp-security-audit` | Security review checklist, vulnerability assessment |

### Operations Skills (4)

| Skill | Purpose |
|-------|---------|
| `whatsapp-operator` | Connection management, status monitoring, troubleshooting |
| `whatsapp-messaging` | Sending all message types (text, media, location, contacts) |
| `whatsapp-chat-management` | Reading chats, contacts, groups, searching |
| `whatsapp-automation` | Auto-reply rules, triggers, cooldowns, monitoring |

## Installation

### For AI Agents

#### Claude Code
```bash
# Copy skills to Claude Code skills directory
mkdir -p ~/.claude/skills
cp -r skills/* ~/.claude/skills/
```

#### OpenCode
```bash
# Copy skills to OpenCode skills directory
mkdir -p ~/.opencode/skills
cp -r skills/* ~/.opencode/skills/
```

#### Cursor
```bash
# Copy skills to Cursor skills directory
mkdir -p .cursor/skills
cp -r skills/* .cursor/skills/
```

#### Generic
```bash
# Any directory in your AI agent's skill path
cp -r skills/* /path/to/agent/skills/
```

## Usage

### In AI Agent Conversations

#### Explicit Skill Invocation
```
/skill wa-mcp-development
```

#### Automatic Discovery
Skills are automatically discovered based on context:
- Discussing architecture → `wa-mcp-development`
- Baileys connection issues → `baileys-integration`
- Adding MCP tool → `mcp-server-engineering`
- Database changes → `sqlite-drizzle-engineering`
- Writing tests → `wa-mcp-testing`
- Security review → `wa-mcp-security-audit`
- Connecting WhatsApp → `whatsapp-operator`
- Sending messages → `whatsapp-messaging`
- Managing chats/groups → `whatsapp-chat-management`
- Creating auto-replies → `whatsapp-automation`

### Skill Commands

```bash
# Validate all skills
pnpm skills:validate

# List all skills
pnpm skills:list

# Quick check
pnpm skills:check
```

## Skill Development

### Creating a New Skill

1. **Choose Category**
   - `skills/development/` for development skills
   - `skills/operations/` for operational skills

2. **Create Directory**
   ```bash
   mkdir -p skills/development/my-new-skill
   ```

3. **Create SKILL.md**
   ```bash
   cat > skills/development/my-new-skill/SKILL.md << 'EOF'
   ---
   name: my-new-skill
   description: Brief description
   category: development
   version: 1.0.0
   author: Your Name
   tags: [tag1, tag2]
   ---
   
   # My New Skill
   
   ## Purpose
   What this skill accomplishes.
   
   ## When to Use
   Scenarios where this skill applies.
   
   ## Instructions
   Step-by-step procedures.
   
   ## Examples
   Code snippets and examples.
   
   ## Best Practices
   Dos and don'ts.
   
   ## References
   Links to documentation.
   EOF
   ```

4. **Validate**
   ```bash
   pnpm skills:validate
   ```

5. **Add Tests** (in `tests/skills/`)
   ```bash
   mkdir -p tests/skills/my-new-skill
   cat > tests/skills/my-new-skill/test.test.ts << 'EOF'
   import { describe, it, expect } from 'vitest'
   
   describe('my-new-skill', () => {
     it('should validate', () => {
       // Test skill validation
       expect(true).toBe(true)
     })
   })
   EOF
   ```

### Skill Validation Rules

The validator checks:
1. ✅ `SKILL.md` exists
2. ✅ Valid YAML frontmatter
3. ✅ Required fields: `name`, `description`, `category`, `version`, `author`, `tags`
4. ✅ Name matches directory name
5. ✅ Name format: lowercase with hyphens
6. ✅ Category: `development` or `operations`
7. ✅ No duplicate names
8. ✅ Content not empty
9. ✅ Recommended sections present

## Skill Validation

### CLI Commands
```bash
# Full validation with report
pnpm skills:validate

# List skills
pnpm skills:list

# Quick check (exit code only)
pnpm skills:check
```

### Validation Output
```
=== Skill Validation Results ===

✓ wa-mcp-development
  OK

✓ baileys-integration
  OK

✗ my-new-skill
  ERROR: Skill name "my-new-skill" doesn't match directory name "my_new_skill"
  WARNING: Missing recommended section: ## Purpose

Summary: 9/10 skills valid
```

### CI/CD Integration
```yaml
# .github/workflows/skills.yml
name: Skills Validation
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm skills:validate
```

## Best Practices

### Writing Skills
1. **Single Responsibility** - One skill, one purpose
2. **Specific Name** - Descriptive, discoverable
3. **Actionable Instructions** - Step-by-step procedures
4. **File References** - Link to actual code files
5. **Limitations Documented** - What the skill doesn't do
6. **Verification Checklist** - How to verify success
7. **No Assumptions** - Don't assume unavailable tools

### Maintaining Skills
1. **Update with Code Changes** - Keep skills in sync
2. **Version Bumping** - Increment version on changes
3. **Test Validation** - Run `pnpm skills:validate` after edits
4. **Cross-Reference** - Link related skills
5. **Deprecation Notices** - Mark outdated skills

## Platform Differences

| Platform | Skill Directory | Discovery Method |
|----------|-----------------|------------------|
| Claude Code | `~/.claude/skills/` | Automatic + `/skill` |
| OpenCode | `~/.opencode/skills/` | Automatic |
| Cursor | `.cursor/skills/` | Automatic |
| Generic | Custom path | Manual |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Skill not found | Check directory name matches skill name |
| Validation fails | Run `pnpm skills:validate` for details |
| Skill not loading | Verify directory in agent's skill path |
| Duplicate name error | Rename skill or directory |
| Missing sections | Add required sections per format |

## References

- [Skill Format Specification](https://github.com/wa-mcp-pro/skills-spec)
- [Development Skills](skills/development/)
- [Operations Skills](skills/operations/)
- [Validation Script](src/scripts/validate-skills.ts)