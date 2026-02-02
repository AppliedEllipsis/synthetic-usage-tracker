# Agents Quick Reference (Optimized)

**Purpose**: Optimized quick-start guide for AI agents working on Synthetic Usage Tracker VSCode extension.

**Last Updated**: 2026-01-31 (Version 1.0.10022)

---

## 🚀 Session Onboarding (5 Steps)

1. **Read `AGENTS.md`** (Memory System Workflow section) - lines 22-210
2. **Read `docs/MEMORY.md`** - Check Current Focus and Sub-tasks Tracking
3. **Read `docs/memory/shared-memory.md`** - Cross-tool context and recent work
4. **Read `docs/memory/tool-registry.md`** - Identify your tool and capabilities
5. **Report Status** to user with context summary and pending tasks

**Status Report Format**:
```
🧠 Context loaded! Project: Synthetic Usage Tracker
Last Focus: [from docs/MEMORY.md]
Pending Tasks: t10, t11, t12, t13, t14
Continue with t10 or new task?
```

---

## 📁 Critical Files Reference

| File | Purpose | When to Read |
|------|---------|--------------|
| [`agents.md`](agents.md) | Complete agent development guide | First session or complex changes |
| [`docs/MEMORY.md`](docs/MEMORY.md) | Query history, current focus, task tracking | Every session start |
| [`docs/memory/shared-memory.md`](docs/memory/shared-memory.md) | Cross-tool shared memory pool | Every session start |
| [`docs/memory/tool-registry.md`](docs/memory/tool-registry.md) | Tool registry and capabilities | Every session start |
| [`package.json`](package.json) | Extension manifest, commands, config | Adding features/commands |
| [`src/extension.ts`](src/extension.ts) | Main entry point | Understanding architecture |
| [`CHANGELOG.md`](CHANGELOG.md) | Version history | Before release |

**Source Files**:
- [`src/api/syntheticService.ts`](src/api/syntheticService.ts) - API client with retry logic
- [`src/config/configuration.ts`](src/config/configuration.ts) - Configuration management
- [`src/config/keyManager.ts`](src/config/keyManager.ts) - Multi-key management (not integrated yet)
- [`src/statusBar/usageIndicator.ts`](src/statusBar/usageIndicator.ts) - UI status bar component

---

## 🔧 Common Commands

```bash
# Build & Test
npm run compile      # Compile TypeScript
npm run lint        # Check code quality
npm run test        # Run test suite
npm run buildrelease # Release workflow (version bump, compile, package)

# Development
npm run watch       # Watch mode (recompiles on changes)
npm run package     # Create .vsix package
```

---

## 🎯 Current Project State

**Project**: Synthetic Usage Tracker - VSCode extension tracking Synthetic.new API usage

**Last Session**: 2026-01-31 12:30 UTC - Removed unimplemented commands and added conditional command display

**Current Phase**: Phase 4 - API Testing (complete)

**Pending Tasks** (from docs/MEMORY.md):
- t10. Test models endpoint
- t11. Test other API endpoints
- t12. Add unit tests for all new work
- t13. Document logic in code
- t14. Verify security (no key leaks)

**Completed Phases**:
- ✅ Phase 1: API Documentation & Research
- ✅ Phase 2: API Testing & Documentation
- ✅ Phase 3: UI Enhancements (t6-t9 verified complete)

---

## 🌐 API Key Information

**Documentation**: https://dev.synthetic.new/

**Base URLs**:
- `https://api.synthetic.new/v2` - **Only** for `/quotas` endpoint
- `https://api.synthetic.new/openai/v1` - For all other endpoints (models, chat/completions, completions, embeddings, messages)
- **Important:** `/v2/models` does NOT exist - use `/openai/v1/models`

**Quotas Endpoint** (`/v2/quotas`):
```json
{
  "subscription": {"limit": 135, "requests": 83.1, "renewAt": "ISO-8601"},
  "search": {"hourly": {"limit": 250, "requests": 0, "renewAt": "ISO-8601"}},
  "toolCallDiscounts": {"limit": 1620, "requests": 382, "renewAt": "ISO-8601"}
}
```

**Usage Types**:
- `subscription` - Monthly API quota (renews every 5 hours)
- `search.hourly` - Hourly search quota
- `toolCallDiscounts` - Tool call functionality quota

**Important**: API does NOT return `remaining` or `percentageUsed` - calculate client-side:
```typescript
remaining = limit - requests
percentageUsed = (requests / limit) * 100
```

---

## 🏗️ Build & Release Workflow

**Prerequisites**: Node.js 18+, npm 9+, TypeScript 5.7.2, VSCode 1.96.0+, @vscode/vsce

```bash
# Build Commands
npm install      # Install dependencies
npm run compile  # Compile TypeScript
npm run lint     # Check code quality
npm run lint:fix # Auto-fix linting issues
npm run test     # Run test suite
npm run watch    # Watch mode (recompiles on changes)
npm run package  # Create .vsix package
```

**Release Workflow** (`npm run buildrelease`):
```bash
npm run buildrelease
```

**Automated process** (10 steps):
1. Update CHANGELOG: Moves "Unreleased" to `## [X.Y.Z] - YYYY-MM-DD`
2. Commit CHANGELOG: Creates git commit for changelog update
3. Update memory: Runs memory update script
4. Commit memory: Creates git commit for memory update
5. Bump version: `npm version patch` increments patch version
6. Create git tag: Tags version commit with `vX.Y.Z`
7. Push to remote: `git push && git push --tags`
8. Compile TypeScript: Build the extension
9. Package extension: Create `.vsix` file
10. Move to releases: Move `.vsix` to `releases/` directory

**Before running buildrelease**:
- [ ] Update CHANGELOG.md: Unreleased section complete and accurate
- [ ] Update README.md: If user-facing changes made
- [ ] Verify tests pass: `npm run test`
- [ ] Verify compilation: `npm run compile`
- [ ] Verify linting: `npm run lint`
- [ ] Clean working tree: All changes committed or stashed

**Output**: `releases/synthetic-usage-tracker-X.Y.Z.vsix`

---

## 💾 Configuration Storage

| Data Type | Storage | Key |
|-----------|----------|-----|
| API Keys | `context.secrets` | `syntheticApiKeys` (array) or `syntheticApiKey` (legacy) |
| Configuration | `workspace configuration` | `syntheticUsageTracker` namespace |
| Shared State | `context.globalState` | `syntheticApiKeyUpdateTimestamp` |

**Test Key**: Available in `.env` file

---

## 🔄 Navigation Primitives

### Coherence Wormhole (Speed Optimization)

**Purpose**: Skip resolved steps without losing coherence

**Trigger**: When converging on clear target, intermediate steps implied/resolved

**Protocol**:
```
"It looks like we're converging on X. Would you like me to take a coherence
wormhole and jump straight there, or continue step by step?"
```

**Safeguard**: Only offer when destination stable, steps unlikely to change outcome
- Skip only if user agrees
- Never skip for verification, auditability, or trust-critical work
- No assumptions, no forced shortcuts

**Coherence Wormhole Safeguard**:
- Offer only when the destination is stable and intermediate steps are unlikely to change the outcome
- If the reasoning path is important for verification, auditability, or trust, do not offer the shortcut unless the user explicitly opts in to skipping steps

---

### Vector Calibration (Direction Optimization)

**Purpose**: Warn when converging on suboptimal target

**Trigger**: When nearby target Y better aligns with intent (generality, simplicity, leverage, durability)

**Protocol**:
```
"You're converging on X. There may be a more optimal target Y that subsumes
or improves it. Would you like to redirect to Y, briefly compare X vs Y,
or stay on X?"
```

**Safeguard**: Only trigger with high confidence
- If user stays on X, don't revisit unless new information appears
- No second-guessing, no derailment
- One well-timed course correction option

---

## 📝 Documentation Practices

**Update docs/MEMORY.md when**:
- Starting new query session
- Completing sub-tasks
- Finishing query
- Learning new information

**Sanitization Rules** (CRITICAL):
- API keys → `[API_KEY]`
- Emails → `[USER_EMAIL]`
- Credentials → `[CREDENTIAL]`
- URLs with sensitive data → `[SENSITIVE_URL]`

**Comment Standards** (Decision-Logic Comments):
**DO comment**: Design decisions, trade-offs, alternatives, cross-file dependencies, performance considerations
**DON'T comment**: Obvious code, what code does (not why), redundant type info

---

## 🛠️ Development Workflow

**Incremental Changes**:
1. Understand current state (read relevant files)
2. Make small, focused changes
3. Verify: `npm run compile`
4. Check: `npm run lint`
5. Test: `npm run test`
6. Manual test (F5 to launch extension)

**Release Workflow** (`npm run buildrelease`):
See 🏗️ Build & Release Workflow section above for complete automated 10-step process.

---

## 🧩 Key Patterns

**Status Bar Caching** (prevent flickering):
```typescript
private lastText: string | null = null;
private lastTooltip: string | null = null;

// Only update if values changed
if (this.lastText !== text || this.lastTooltip !== tooltip) {
  this.statusBarItem.text = text;
  this.statusBarItem.tooltip = tooltip;
  this.lastText = text;
  this.lastTooltip = tooltip;
}
```

**Cross-Window Synchronization**:
- Use `context.globalState` for shared timestamp
- Poll every 5 seconds to detect changes from other windows
- Trigger refresh when timestamp changes

**Error Handling**:
- Custom error types (`ApiError` with `ApiErrorType`)
- Catch at extension level to prevent crashes
- Provide meaningful error messages
- Don't retry on authentication errors

**Command Registration Verification**:
- Always verify package.json commands match registered commands
- Search package.json for all `"command": "syntheticUsageTracker.*"` entries
- Search extension.ts for all `vscode.commands.registerCommand()` calls
- Compare lists to ensure all commands are registered
- Before implementing features, verify existing commands aren't broken
- Search for `executeCommand()` calls that might reference commands you're modifying

---

## 🔒 Security Guidelines

**ALWAYS**:
- Use `context.secrets` for API keys (never `globalState` or `workspaceState`)
- Never log sensitive data
- Validate input before storage
- Sanitize all documentation

**NEVER**:
- Commit `.env` file (use `.env.example` template)
- Log API keys in console output
- Expose credentials in error messages

---

## 🧠 When to Read Full Documentation

**agents.md** - Read when:
- First time working on project
- Making architectural changes
- Need detailed coding conventions
- Building or releasing

**docs/MEMORY.md** - Read when:
- Every session start
- Understanding recent work
- Checking pending tasks
- Querying project history

**docs/memory/shared-memory.md** - Read when:
- Every session start
- Cross-tool handoff
- Understanding recent decisions
- Looking for cross-tool context

**docs/memory/tool-registry.md** - Read when:
- Every session start
- Identifying your tool
- Understanding tool capabilities
- Discovering new tools

---

## 🚦 Extension Commands

| Command | Description |
|---------|-------------|
| `syntheticUsageTracker.refresh` | Manually refresh usage data |
| `syntheticUsageTracker.configure` | Configure API key (alias) |
| `syntheticUsageTracker.showUsage` | Display detailed usage info |
| `syntheticUsageTracker.toggleAutoRefresh` | Enable/disable auto-refresh |
| `syntheticUsageTracker.copyUsage` | Copy usage to clipboard |
| `syntheticUsageTracker.eraseKey` | Erase API key (alias) |
| `syntheticUsageTracker.openDashboard` | Open Synthetic.new dashboard |
| `syntheticUsageTracker.subscribeWithDiscount` | Subscribe with referral discount |
| `syntheticUsageTracker.setRefreshInterval` | Set auto-refresh interval |
| `syntheticUsageTracker.addKey` | Add API key (multi-key) |
| `syntheticUsageTracker.removeKey` | Remove specific API key |
| `syntheticUsageTracker.cycleKey` | Cycle to next key |
| `syntheticUsageTracker.clearAllKeys` | Clear all API keys |

---

## 📊 Status Bar States

| State | Icon | Meaning |
|-------|------|---------|
| Idle | `$(circle-outline)` | No API key configured |
| Loading | `$(loading~spin)` | Fetching data |
| Success | `$(check-circle)` | Usage below threshold |
| Warning | `$(warning)` | Usage above warning threshold (80%) |
| Error | `$(error)` | Error or critical usage (90%+) |

---

## 🐛 Known Issues

- **Critical**: KeyManager not integrated in extension.ts
- **Critical**: Configuration interface missing multi-key settings
- Multi-key infrastructure tested but not integrated

---

## 📚 Tool Registry Summary

| Tool | Memory System | Status |
|------|---------------|--------|
| Kilocode | `plans/kilocode-memory-system-design.md` | Active |
| Opencode | `docs/memory/shared-memory.md` | Active (current tool) |
| Roocode | (to be discovered) | Pending |
| Amp | (to be discovered) | Pending |
| Gemini | (to be discovered) | Pending |
| Claude | (to be discovered) | Pending |
| Antigravity | (to be discovered) | Pending |

---

## 🎯 For More Details

See full documentation:
- [`AGENTS.md`](agents.md) - Complete agent development guide (2100+ lines)
- [`docs/MEMORY.md`](docs/MEMORY.md) - Query history and task tracking (460+ lines)
- [`docs/memory/shared-memory.md`](docs/memory/shared-memory.md) - Cross-tool memory pool (420+ lines)
- [`docs/memory/tool-registry.md`](docs/memory/tool-registry.md) - Tool registry (340+ lines)

---

**Tip**: Use "Coherence Wormhole" to skip steps you've mentally cleared. Use "Vector Calibration" to redirect to better targets. Both require explicit user permission.
