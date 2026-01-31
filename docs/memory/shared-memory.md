# Shared Memory Pool

This file serves as a consolidated memory pool that all AI tools (Kilocode, Roocode, Opencode, Amp, Gemini, Claude, Antigravity, etc.) can read from and write to.

## Purpose

The shared memory pool provides:
- **Unified Context**: All tools share the same project understanding
- **Cross-Tool Continuity**: Work started in one tool can be continued in another
- **Consolidated History**: Single source of truth for project state
- **Tool Agnostic**: Works independently of any specific tool's internal memory system

## Structure

```mermaid
graph TB
    subgraph AI Tools
        K[Kilocode]
        R[Roocode]
        O[Opencode]
        A[Amp]
        G[Gemini]
        C[Claude]
        AG[Antigravity]
    end

    subgraph Shared Memory System
        SM[shared-memory.md]
        TR[tool-registry.md]
        GC[git_commit_format.md]
    end

    subgraph Tool-Specific Memory
        KM[plans/kilocode-memory-system-design.md]
        RM[.roocode/memory]
        OM[.opencode/memory]
    end

    subgraph Documentation
        AM[AGENTS.md]
        DM[docs/MEMORY.md]
        GC[git_commit_format.md]
    end

    K -->|Read/Write| SM
    R -->|Read/Write| SM
    O -->|Read/Write| SM
    A -->|Read/Write| SM
    G -->|Read/Write| SM
    C -->|Read/Write| SM
    AG -->|Read/Write| SM

    SM <-->|Reference| TR

    K <-->|Internal| KM
    R <-->|Internal| RM
    O <-->|Internal| OM

    SM <-->|Sync| AM
    SM <-->|Sync| DM
```

## Working Pattern

### When Starting a Session (Any Tool)

1. **Read Tool Registry** (`docs/memory/tool-registry.md`):
   - Identify which tool you are (Kilocode, Roocode, Opencode, etc.)
   - Find your tool's entry in the registry
   - Understand your tool's role and any special instructions

2. **Read Shared Memory** (`docs/memory/shared-memory.md`):
   - Read recent entries (last 5-10) to understand current state
   - Check "Current Focus" for what was being worked on
   - Review "Pending Tasks" for incomplete work
   - Note any tool-specific context relevant to your work

3. **Read Tool-Specific Documentation** (if exists):
   - Read your tool's design document (e.g., `plans/kilocode-memory-system-design.md`)
   - Understand tool-specific patterns and conventions
   - Adapt your working pattern to the tool's strengths

4. **Read Project Documentation**:
   - Read relevant sections of `AGENTS.md`
   - Read `docs/MEMORY.md` for query history and context
   - Understand project structure and conventions

5. **Report to User**:
   - Confirm context is loaded
   - Summarize what you know about the project
   - List pending tasks with `t{number}` prefix
   - Offer to continue with next task or accept new work

### During Work (Any Tool)

1. **Make Incremental Changes**: Update shared memory as you work, not just at the end
2. **Document Decisions**: Explain why you're making changes, not just what
3. **Sync with Project Docs**: Keep `docs/MEMORY.md` and other docs in sync with shared memory
4. **Track Tool-Specific Notes**: Document tool-specific patterns or issues in tool registry

### When Ending a Session (Any Tool)

1. **Update Shared Memory**:
   - Document work completed
   - Update task statuses
   - Add any new patterns or rules learned
   - Note any incomplete work that should be continued

2. **Sync with Tool-Specific Memory**:
   - If your tool has its own memory system, sync relevant information
   - Cross-reference shared memory entries with tool-specific entries
   - Ensure consistency between systems

3. **Report Completion**:
   - Summarize what was accomplished
   - List any incomplete items
   - Suggest next steps if appropriate

## Memory Entry Format

### [2026-01-31 02:58 UTC] - Tool: Opencode - Verify Phase 3 UI Enhancements

**Tool**: Opencode
**Session ID**: opencode-session-20260131-025800
**Task Type**: Assigned Task
**Status**: Completed

**Summary**: Verified that all Phase 3 UI enhancement tasks (t6-t9) are already implemented and tested

**Context**: User requested to continue with task t6. Upon investigation, discovered that all Phase 3 UI enhancements were already implemented in a previous session.

**Decisions Made**:
- Decision: Mark tasks t6-t9 as complete in docs/MEMORY.md
- Decision: Update shared memory with verification results
- Decision: Move forward to Phase 4 (API Testing) tasks

**Files Changed**:
- Modified: [`docs/MEMORY.md`](../../docs/MEMORY.md)
- Modified: [`docs/memory/shared-memory.md`](shared-memory.md)

**Tools Used**:
- None (verification and documentation only)

**Outcome**: Completed
- Verified t6: ASCII progress bars implemented with 10 segments
- Verified t7: Warning symbols implemented (🔍, 🔧)
- Verified t8: API key masking implemented (maskApiKey method)
- Verified t9: Single status bar element confirmed
- Updated documentation to reflect completion status

**Notes**:
- All features have comprehensive test coverage
- Code compiles successfully (npm run compile)
- Ready to proceed to Phase 4: API Testing

**Cross-Tool Context**:
Future agents continuing this work should start with Phase 4 tasks (t10, t11).

**Related Entries**:
- `[2026-01-31 00:27 UTC] - Query: Reorganize documentation structure and document current session`
- `docs/MEMORY.md` tasks t6-t9

---

### [2026-01-31 03:15 UTC] - Tool: Opencode - Create optimized agents.min.md and integrate navigation primitives

**Tool**: Opencode
**Session ID**: opencode-session-20260131-031500
**Task Type**: Assigned Task
**Status**: Completed

**Summary**: Created agents.min.md with optimized quick-start reference and integrated Coherence Wormhole and Vector Calibration navigation primitives into documentation

**Context**: User requested implementation of navigation primitives (Coherence Wormhole for speed, Vector Calibration for direction) and creation of an optimized quick-start guide that summarizes everything needed from AGENTS.md and other memory systems.

**Decisions Made**:
- Decision: Create agents.min.md as optimized quick-start guide (read first for fast onboarding)
- Decision: Include navigation primitives (Coherence Wormhole, Vector Calibration) in agents.min.md
- Decision: Update docs/MEMORY.md with navigation primitives section
- Decision: Update docs/memory/shared-memory.md with navigation primitives section
- Decision: Reference agents.min.md from all relevant documentation files
- Decision: Navigation primitives require explicit user permission (no forced skipping or redirecting)

**Files Changed**:
- Added: [`agents.min.md`](../../agents.min.md) - Optimized quick-start guide
- Modified: [`docs/MEMORY.md`](../../docs/MEMORY.md) - Added agents.min.md to critical files, added navigation primitives section
- Modified: [`docs/memory/shared-memory.md`](shared-memory.md) - Added navigation primitives section, quick reference to agents.min.md
- Modified: [`docs/memory/tool-registry.md`](tool-registry.md) - Added quick start reference to agents.min.md for Opencode

**Tools Used**:
- None (documentation creation and integration only)

**Outcome**: Completed
- Created agents.min.md with comprehensive optimized quick-start guide
- Integrated Coherence Wormhole navigation primitive (speed optimization)
- Integrated Vector Calibration navigation primitive (direction optimization)
- Updated all relevant documentation to reference agents.min.md
- Added navigation primitives to memory system documentation

**Notes**:
- agents.min.md contains 5-step onboarding process, critical files reference, common commands, current project state, API info, configuration storage, navigation primitives, documentation practices, development workflow, key patterns, security guidelines, and when to read full documentation
- Navigation primitives require explicit user permission before skipping steps or redirecting
- All tools should use navigation primitives for efficient work while maintaining user agency

**Cross-Tool Context**:
All AI agents (Kilocode, Roocode, Opencode, Amp, Gemini, Claude, Antigravity) should:
1. Read agents.min.md first for fast onboarding
2. Then read docs/MEMORY.md and docs/memory/shared-memory.md for detailed context
3. Use Coherence Wormhole to skip resolved steps when user agrees
4. Use Vector Calibration to suggest better directions when confidence is high

**Related Entries**:
- Navigation primitives concept from user prompt
- `docs/MEMORY.md` - Memory System Usage section
- `docs/memory/shared-memory.md` - Shared Memory Guidelines section

---

### Entry Template

```markdown
### [YYYY-MM-DD HH:MM UTC] - Tool: {Tool Name} - {Title}

**Tool**: Kilocode | Roocode | Opencode | Amp | Gemni | Claude | Antigravity
**Session ID**: {Unique identifier for this session}
**Task Type**: Assigned Task | User-Directed Narrative | Discovery | Planning
**Status**: In Progress | Completed | Blocked | Abandoned

**Summary**: Brief summary of what was done or is being worked on

**Context**: Any relevant context, environment, previous state, etc.

**Decisions Made**: (optional)
- Decision 1: Reason for decision
- Decision 2: Reason for decision

**Files Changed**: (optional)
- Added: [`file1`](file1), [`file2`](file2)
- Modified: [`file3`](file3)
- Deleted: [`file4`](file4)

**Tools Used**: (optional)
- MCP servers: {list if any}
- External APIs: {list if any}
- Special commands: {list if any}

**Outcome**: Result or status (e.g., "Completed", "In Progress", "Blocked")

**Notes**: (optional)
Any additional context, issues encountered, workarounds, etc.

**Cross-Tool Context**: (optional)
Information relevant to other tools continuing this work

**Related Entries**: (optional)
Links to related entries in shared memory or tool-specific memory

---
```

### Example Entry

```markdown
### [2026-01-31 14:30 UTC] - Tool: Opencode - Add ASCII Progress Bars to Tooltip

**Tool**: Opencode
**Session ID**: opencode-session-20260131-143045
**Task Type**: Assigned Task
**Status**: Completed

**Summary**: Added ASCII progress bars to tooltip showing subscription, search, and toolCallDiscounts usage

**Context**: Task t6 from docs/MEMORY.md Sub-tasks Tracking. Previous work had documented API payload structure showing three usage types.

**Decisions Made**:
- Decision to use 20-character wide progress bars: Fits well in tooltip without wrapping
- Decision to show percentage to right of bar: Provides immediate context
- Decision to use different colors for thresholds: Visual cue for urgency

**Files Changed**:
- Modified: [`src/statusBar/usageIndicator.ts`](../../src/statusBar/usageIndicator.ts)
- Modified: [`docs/api-payload-analysis.md`](../api-payload-analysis.md)

**Tools Used**:
- None (local implementation)

**Outcome**: Completed
- Progress bars now display in tooltip
- Each usage type has its own bar
- Color-coded by threshold (green < 80%, yellow < 90%, red >= 90%)

**Notes**:
- Tested with various quota values to ensure bar rendering
- Edge case: When limit is 0 or undefined, don't render bar
- Performance: Bar calculation is O(1), minimal overhead

**Cross-Tool Context**:
Kilocode agents continuing this work should note that the progress bar logic is in `buildTooltip()` method.

**Related Entries**:
- `[2026-01-31 01:15 UTC] - Tool: Opencode - Test usage endpoint and document payload structure`
- `docs/MEMORY.md` task t6

---
```

## Current Focus

### Last Session

**Tool**: Opencode
**Time**: 2026-01-31 02:58 UTC
**Summary**: Verified Phase 3 UI enhancements are already fully implemented
**Status**: Completed

### Context

The project has documentation scattered across multiple locations:
- `AGENTS.md` - Agent development guide
- `docs/MEMORY.md` - Query memory and task tracking
- `plans/kilocode-memory-system-design.md` - Kilocode-specific memory system
- Various other docs in `docs/` directory

This shared memory system consolidates information and provides a single point of reference for all tools.

### Planning

Creating a shared memory system that:
- All AI tools can read from and write to
- Consolidates context across tools
- Provides continuity between sessions
- Maintains tool-specific registry and patterns

### Pending Tasks

From `docs/MEMORY.md` Sub-tasks Tracking:
- [x] t6. Update tooltip with ASCII progress bars - Complete
- [x] t7. Add symbols in statusbar for high quota types - Complete
- [x] t8. Show last 4 characters of API key in tooltip - Complete
- [x] t9. Verify single statusbar element - Complete
- [ ] t10. Test models endpoint - Pending
- [ ] t11. Test other API endpoints - Pending
- [ ] t12. Add unit tests for all new work - Pending
- [ ] t13. Document logic in code - Pending
- [ ] t14. Verify security (no key leaks) - Pending

## Quick Reference

### Tool Registry Reference

| Tool | Registry Entry | Internal Memory | Special Patterns |
|------|----------------|-----------------|-----------------|
| Kilocode | [`tool-registry.md`](./tool-registry.md) | `plans/kilocode-memory-system-design.md` | Automated memory tracking, version logging |
| Roocode | [`tool-registry.md`](./tool-registry.md) | `.roocode/memory` (to be discovered) | (to be documented) |
| Opencode | [`tool-registry.md`](./tool-registry.md) | Uses this shared memory | Current tool, file operations, web tools |
| Amp | [`tool-registry.md`](./tool-registry.md) | (to be discovered) | (to be documented) |
| Gemini | [`tool-registry.md`](./tool-registry.md) | (to be discovered) | (to be documented) |
| Claude | [`tool-registry.md`](./tool-registry.md) | (to be discovered) | (to be documented) |
| Antigravity | [`tool-registry.md`](./tool-registry.md) | (to be discovered) | (to be documented) |

### Project Context

**Project**: Synthetic Usage Tracker - VSCode extension for tracking Synthetic.new API usage

**Last Updated**: 2026-01-31

**Current Phase**: Phase 3 - UI Enhancements (per docs/MEMORY.md Roadmap)

**Completed Phases**:
- Phase 1: API Documentation & Research ✅
- Phase 2: API Testing & Documentation ✅

**Pending Phases**:
- Phase 3: UI Enhancements (in progress)
- Phase 4: API Testing
- Phase 5: Testing & Documentation

### Shared Memory Guidelines

**For All Tools**:

1. **Read First, Write Second**: Always read shared memory before making changes
2. **Document Decisions**: Explain why, not just what
3. **Keep It Synced**: Update shared memory as you work, not just at end
4. **Be Concise**: Use clear, brief summaries that other tools can understand
5. **Reference Other Systems**: Cross-reference with tool-specific memory when appropriate

**Sanitization Rules**:
- API keys → `[API_KEY]`
- Personal emails → `[USER_EMAIL]`
- Credentials → `[CREDENTIAL]`
- URLs with sensitive data → `[SENSITIVE_URL]`
- File paths with personal info → `[PERSONAL_PATH]`

**Task Prefix Convention**:
- Use `t{number}` prefix for referencing tasks from docs/MEMORY.md
- Example: "Continuing with t6 - Update tooltip with ASCII progress bars"

**Entry Size Guidelines**:
- Each entry should be concise (100-300 words typically)
- Use bullet points for lists
- Use markdown links for file references
- Separate entries clearly with `---`

### Navigation Primitives

**Coherence Wormhole** (Speed Optimization):
- Trigger: When converging on clear target, intermediate steps implied/resolved
- Protocol: Ask "Would you like me to take a coherence wormhole and jump straight there?"
- Safeguard: Only offer when destination stable, skip only if user agrees
- Never skip for verification, auditability, or trust-critical work

**Vector Calibration** (Direction Optimization):
- Trigger: When nearby target Y better aligns with intent (generality, simplicity, leverage, durability)
- Protocol: Ask "Would you like to redirect to Y, briefly compare X vs Y, or stay on X?"
- Safeguard: Only trigger with high confidence, no second-guessing if user stays on X
- One well-timed course correction option

See [`agents.min.md`](../../agents.min.md) for complete navigation primitives documentation.

**Quick Reference**: [`agents.min.md`](../../agents.min.md) - Optimized quick-start guide (read first for fast onboarding)

### Git Commit Format

This project uses enhanced conventional commit messages with emojis. All tools should follow this format when generating commits.

**Commit Message Format**:
```markdown
~ [ short up to 8 word summary ]:<emoji> <type>(<scope>): <subject><body>
```

**Documentation**: [`git_commit_format.md`](./git_commit_format.md) - Complete commit message specification

**Types and Emojis**:
- `feat` ✨ - New feature or functionality
- `fix` 🐛 - Bug fix or error correction
- `docs` 📝 - Documentation changes
- `style` 🎨 - Code style changes
- `refactor` ♻️ - Code refactoring
- `perf` ⚡️ - Performance improvements
- `test` ✅ - Testing changes
- `build` 📦 - Build system changes
- `ci` 🚀 - CI/CD configuration
- `chore` 🔧 - Maintenance tasks
- `revert` ⏪ - Reverting previous commits
- `i18n` 🌐 - Internationalization

**Commit Message Rules**:
- Summary: Maximum 8 words, present tense, capture essence
- Subject: Imperative mood ("add" not "added"), lowercase, max 50 chars
- Body: Bullet points with "-", explain "what" and "why", not "how"
- Breaking Changes: `BREAKING CHANGE: <description>` in footer
- Prefix: Always start with `~ [ short up to 8 word summary ]:`

## Integration Notes

### Tool-Specific Considerations

**Kilocode**:
- Has its own automated memory system in `plans/kilocode-memory-system-design.md`
- Should sync completed work to shared memory at end of session
- Can reference shared memory for cross-session continuity

**Roocode**:
- Internal memory system yet to be discovered
- Should create tool registry entry when discovered
- Adapt Kilocode patterns where appropriate

**Opencode**:
- Primary maintainer of this shared memory system
- Uses file operations (read, write, edit, glob, grep)
- Has web tools (webfetch, websearch, codesearch)
- No internal memory system - relies entirely on shared memory
- Should follow [`git_commit_format.md`](./git_commit_format.md) when creating commits

**Amp, Gemini, Claude, Antigravity**:
- Internal memory systems yet to be discovered
- Should create tool registry entries when discovered
- Follow shared memory working pattern

### Conflict Resolution

When multiple tools have conflicting information:

1. **Project Docs Take Precedence**: `docs/MEMORY.md`, `AGENTS.md` are authoritative
2. **Shared Memory Is Reference**: Use shared memory for cross-tool continuity
3. **Tool-Specific Memory Is Supplemental**: Use for tool-specific patterns only
4. **Document Conflicts**: When you find conflicts, document them in shared memory

### Version Control

- `docs/memory/` directory is git-tracked
- All memory files are versioned
- Use commit messages that reference memory updates
- Example: `docs(memory): shared memory - add tool registry entry for Roocode`
