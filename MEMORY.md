# Query Memory & Task Tracking

This file maintains context across AI agent sessions by tracking queries, current focus, sub-tasks, and quick reference information.

## Query History

### [2026-01-31 00:22 UTC] - Query: Analyze incomplete items and create query tracking system
**Query**: "what do you have remaining or what hasn't been done yet or is incomplete"

**Context**: User wants to understand what's incomplete in the Synthetic Usage Tracker project. Additionally, user requested implementation of a query documentation and tracking system to maintain context across sessions.

**Outcome**: Completed
1. Comprehensive analysis of incomplete items identified:
   - 2 critical bugs (KeyManager not integrated in extension.ts, Configuration interface missing multi-key settings)
   - 8+ unreleased features (multi-key support, key cycling, key management UI, etc.)
   - 11 pending tasks from implementation plans
2. Created MEMORY.md with query tracking system
3. Created .env.example template
4. Updated agents.md with Memory System Workflow documentation

**Key Findings**:
- Critical issue: KeyManager not integrated in extension.ts - needs integration
- Critical issue: Configuration interface missing multi-key settings - needs updates
- Multi-key infrastructure is well-designed and tested at unit level (2,355 lines of unit tests)
- All individual services have comprehensive test coverage

---

### [2026-01-31 00:18 UTC] - Query: Create query documentation and tracking system
**Query**: Create a query documentation and tracking system for the Synthetic Usage Tracker project. This system will help maintain context across sessions and track progress on tasks.

Tasks:
1. Create `MEMORY.md` at the project root with the following structure:
   - Query History section (chronological list of queries, sanitized of sensitive info)
   - Current Focus section (last query summary with context, planning, and remaining items)
   - Sub-tasks Tracking section (list of active sub-tasks with status)
   - Quick Reference section (commonly referenced info)

2. Create `.env.example` as a git-tracked template showing structure of secrets (without actual values)

3. Update `.gitignore` to ensure `.env` is ignored (if not already)

4. Update `agents.md` to document this new system as part of the workflow

**Context**: New project infrastructure task to support AI agent development workflow. The Synthetic Usage Tracker is a VSCode extension that monitors API usage from Synthetic.new service.

**Outcome**: Completed - All files created and updated successfully.

---

## Current Focus

### Last Query: Analyze incomplete items and create query tracking system
**Time**: 2026-01-31 00:22 UTC
**Summary**: Completed analysis of incomplete items in the Synthetic Usage Tracker project and successfully created the query tracking system. All documentation files have been created and updated.

**Context**: 
- Project: Synthetic Usage Tracker VSCode extension
- Memory system infrastructure is now in place
- All sub-tasks have been completed

**Planning**: None - task is complete

**Remaining Items**: None - all documentation system tasks completed

---

## Sub-tasks Tracking

No active sub-tasks.

---

## Quick Reference

### Critical Files

| File | Purpose |
|------|---------|
| [`agents.md`](agents.md) | AI Agent Development Guide - comprehensive guide for agents working on this project |
| [`MEMORY.md`](MEMORY.md) | Query Memory & Task Tracking - this file, maintains session context |
| [`package.json`](package.json) | Extension manifest, dependencies, and scripts |
| [`tsconfig.json`](tsconfig.json) | TypeScript compiler configuration |
| [`CHANGELOG.md`](CHANGELOG.md) | Version history and release notes |
| [`README.md`](README.md) | User-facing documentation |

**Source Files:**
- [`src/extension.ts`](src/extension.ts) - Main extension entry point
- [`src/api/syntheticService.ts`](src/api/syntheticService.ts) - API integration layer
- [`src/config/configuration.ts`](src/config/configuration.ts) - Configuration management
- [`src/statusBar/usageIndicator.ts`](src/statusBar/usageIndicator.ts) - UI status bar component

**Test Files:**
- [`test/suite/extension.test.ts`](test/suite/extension.test.ts) - Extension tests
- [`test/suite/api/syntheticService.test.ts`](test/suite/api/syntheticService.test.ts) - API service tests
- [`test/suite/config/configuration.test.ts`](test/suite/config/configuration.test.ts) - Configuration tests
- [`test/suite/statusBar/usageIndicator.test.ts`](test/suite/statusBar/usageIndicator.test.ts) - Status bar tests

**Documentation:**
- [`docs/architecture.md`](docs/architecture.md) - System architecture
- [`docs/api.md`](docs/api.md) - API documentation
- [`docs/development.md`](docs/development.md) - Development workflow
- [`docs/troubleshooting.md`](docs/troubleshooting.md) - Common issues and solutions

### Common Commands

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Run linter
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Run tests
npm run test

# Package extension
npm run package

# Build release (version bump, compile, package, move to releases/)
npm run buildrelease
```

### Known Issues

None currently documented. When issues are identified, add them here with:
- Issue description
- Affected version
- Workaround (if available)
- Status (Open/In Progress/Resolved)

### Configuration Storage

- **API Keys**: Stored in VSCode SecretStorage (`context.secrets`)
  - New format: `syntheticApiKeys` (JSON array of keys with labels)
  - Legacy format: `syntheticApiKey` (single string)
  - Supports backward compatibility for upgrades
- **Configuration**: Stored in VSCode workspace configuration (`syntheticUsageTracker` namespace)
- **Shared State**: Uses `context.globalState` for cross-window synchronization

### Extension Commands

| Command ID | Description |
|------------|-------------|
| `syntheticUsageTracker.refresh` | Manually refresh usage data |
| `syntheticUsageTracker.setApiKey` | Configure API key |
| `syntheticUsageTracker.showUsage` | Display detailed usage information |
| `syntheticUsageTracker.toggleAutoRefresh` | Enable/disable auto-refresh |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `https://api.synthetic.new/v2/quota` | Fetch quota/usage information |
| `https://api.synthetic.new/v2/models` | List available models |
| `https://api.synthetic.new/v2/keys` | Manage API keys |

### Status Bar States

| State | Icon | Meaning |
|-------|------|---------|
| Idle | `$(circle-outline) Synthetic.new` | No API key configured |
| Loading | `$(loading~spin) Synthetic.new` | Fetching data |
| Success | `$(check-circle) Synthetic.new` | Usage below threshold |
| Warning | `$(warning) Synthetic.new` | Usage above warning threshold |
| Error | `$(error) Synthetic.new` | Error fetching data or critical usage |

### Memory System Usage

**When to Update MEMORY.md:**
1. At the start of each new query session
2. When switching focus to a different task
3. When completing significant milestones
4. When encountering important context that should persist

**How to Use:**
1. Read the "Query History" to understand previous work
2. Review "Current Focus" to understand what was being worked on
3. Check "Sub-tasks Tracking" for incomplete items
4. Reference "Quick Reference" for commonly needed information

**Sanitization Rules:**
- Always replace API keys with `[API_KEY]`
- Replace user emails with `[USER_EMAIL]`
- Replace personal data with `[REDACTED]`
- Never include actual secrets, passwords, or credentials
