# Contributing to WA-MCP Pro

Thank you for your interest in contributing to WA-MCP Pro! This document provides guidelines for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:
- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect differing opinions

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+
- Git

### Setup
```bash
# Fork and clone
git clone https://github.com/your-fork/wa-mcp-pro.git
cd wa-mcp-pro

# Install dependencies
corepack enable
pnpm install

# Setup environment
cp .env.example .env
# Edit .env as needed

# Run migrations
pnpm db:migrate

# Run tests
pnpm test
```

## Development Workflow

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Example:
```
feat(mcp): add whatsapp_send_poll tool

Add support for sending WhatsApp polls via MCP.
Closes #123
```

### Pull Request Process

1. Create feature branch from `main`
2. Make changes with tests
3. Run quality checks:
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm format
   pnpm test
   pnpm build
   ```
4. Update documentation if needed
5. Create PR with clear description
6. Address review feedback
6. Squash and merge after approval

## Coding Standards

### TypeScript
- Strict mode enabled
- No `any` without justification
- Use type inference where possible
- Prefer interfaces over types for objects
- Use `readonly` for immutable data

### Code Style
- ESLint + Prettier enforced
- 2-space indentation
- Single quotes
- Trailing commas (es5)
- 100 character line width

### Architecture
- Service layer pattern
- Repository pattern for data access
- Dependency injection via container
- Event-driven for cross-component communication
- Transport separated from business logic

### Error Handling
- Use custom error classes
- Include correlation IDs
- Sanitize error responses
- Log with structured data

### Security
- Never log secrets
- Validate all inputs with Zod
- Use parameterized queries
- Hash sensitive data
- Encrypt credentials at rest

## Testing

### Test Types
- **Unit**: Fast, isolated, mock dependencies
- **Integration**: Real database, mocked external services
- **E2E**: Full workflows (manual or CI)

### Requirements
- New features require unit tests
- Bug fixes require regression tests
- Maintain >80% coverage
- Run `pnpm test:coverage` before PR

## Documentation

### Required Updates
- README.md for user-facing changes
- API docs for endpoint changes
- Architecture docs for structural changes
- Skill docs for skill changes
- Code comments for complex logic

### Style
- Clear, concise language
- Code examples for APIs
- Diagrams for architecture
- Indonesian language for user docs

## Skills Development

### Creating a Skill
1. Create directory under `skills/development/` or `skills/operations/`
2. Add `SKILL.md` with YAML frontmatter
3. Follow skill format guidelines
4. Run `pnpm skills:validate`
5. Add tests in `tests/skills/`

### Skill Standards
- Single responsibility
- Specific, discoverable name
- Actionable instructions
- File/tool references
- Limitations documented
- Verification checklist

## Release Process

### Versioning
Semantic Versioning (MAJOR.MINOR.PATCH):
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes (backward compatible)

### Steps
1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create and push tag
4. CI builds and publishes
5. Update documentation site

## Reporting Issues

### Bug Reports
Include:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, Node, pnpm versions)
- Logs/error messages
- Minimal reproduction if possible

### Feature Requests
Include:
- Problem statement
- Proposed solution
- Alternatives considered
- Use cases

## Security Issues

**Do not** report security vulnerabilities publicly.

Email security@wa-mcp-pro.dev with details.

## Getting Help

- GitHub Discussions for questions
- GitHub Issues for bugs/features
- Documentation at docs/
- Skills at skills/

## Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- GitHub contributors graph

Thank you for contributing to WA-MCP Pro!