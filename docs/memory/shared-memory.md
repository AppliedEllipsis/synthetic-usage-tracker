# Shared Memory Pool

This file serves as a consolidated memory pool for all AI tools working on the Synthetic Usage Tracker project. It maintains context across different AI agent sessions and tools.

## Memory Entries

---

### [2026-03-26] - Build Release Workflow Redesign - Build-First Approach

**Task Type:** Architecture Improvement  
**Tool:** Opencode

**Summary:**  
Completely redesigned the buildrelease workflow to use a build-first approach. The old workflow was error-prone, often missed changelog updates, and occasionally included unwanted files in the package. The new workflow builds and tests FIRST before any git operations, preventing broken builds from being tagged or pushed.

**Problem:**  
- Old workflow required manual changelog updates before running buildrelease
- Build happened AFTER git operations, leading to broken tags when builds failed
- No support for repackaging when a build failed but no code changes were made
- Vector DBs and unnecessary files were occasionally included in the .vsix package
- Confusing documentation led to agents missing steps

**Solution:**  
Created a comprehensive Node.js script (`scripts/buildrelease.js`) that handles the entire release process:

1. **Build-first approach**: compile → lint → test BEFORE any git operations
2. **Automatic changelog detection**: Reads Unreleased section and determines if changes exist
3. **Letter-suffix repackaging**: When no changelog changes, creates versions like 1.0.10033a, 1.0.10033b
4. **Interactive prompts**: Asks user before repackaging
5. **Comprehensive error handling**: Colored output, clear error messages
6. **Automatic documentation updates**: Updates CHANGELOG and shared memory

**Key Features:**
- **Standard Release**: 1.0.10033 → 1.0.10034 (when changelog has changes)
- **Letter-Suffix Repackage**: 1.0.10033 → 1.0.10033a/b/c... (when no changes, user confirms)
  - a→z, then aa→az, then ba→bz, etc. (Excel-style column naming)
- **Build verification**: Ensures all tests pass before proceeding
- **Clean working tree check**: Prevents accidental commits of local changes
- **Full git flow**: commit → tag → push for both standard and letter releases
- **Bloat exclusion**: Respects .vscodeignore (vector DBs, docs, scripts excluded)

**Files Changed:**
- `scripts/buildrelease.js` (NEW, 519 lines) - Main release automation script
- `package.json` (line 219) - Changed from shell command to node script
- `AGENTS.md` - Updated Release Workflow section (lines 465-574) with new documentation
- `docs/memory/shared-memory.md` - This entry

**Design Decisions:**
1. **Why build-first?** Prevents broken builds from polluting git history. If compilation, linting, or tests fail, the script exits immediately without any git operations.

2. **Why letter-suffix?** Provides a clear way to indicate repackaging attempts. The pattern (a-z, aa-zz, etc.) allows unlimited repackages while maintaining semantic relationship to the base version.

3. **Why user confirmation for letter releases?** Repackaging is usually for fixing build/packaging issues. Confirming ensures this is intentional, not accidental.

4. **Why automatic changelog detection?** Eliminates manual steps that agents often forgot. The script reads the Unreleased section and determines release type automatically.

**Usage:**
```bash
npm run buildrelease
```

The script handles everything automatically:
1. Verifies clean working tree
2. Builds and tests
3. Determines release type
4. Updates documentation
5. Commits, tags, and pushes
6. Packages the extension

**Verification:**
- All edge cases tested: standard release, letter release, a→z transition
- Build failure handling verified: script exits before git operations
- User confirmation flow tested: interactive prompts work correctly
- Git operations verified: commit, tag, push sequence works for both release types

**Cross-Tool Context:**
- Any AI tool can now run `npm run buildrelease` without manual steps
- No need to update CHANGELOG manually first (script handles it)
- Letter suffixes indicate repackaging - useful context when debugging
- Build failures prevent git pollution - safer for all tools

**Best Practices for Future Releases:**
1. Always ensure CHANGELOG.md "Unreleased" section is accurate before running
2. Use "Nothing yet" placeholder if there are no changes (triggers letter release)
3. The script will ask for confirmation before creating letter-suffix versions
4. If build fails, fix the issue and re-run - no cleanup needed
5. Verify .vscodeignore excludes any new bloat files

---

### [2026-03-18] - Hide Free Tool Calls block when 0/0

**Issue:**
The tooltip was displaying "Free Tool Calls (daily): 0 / 0" when both requests and limit were 0, which provided no useful information to users and cluttered the UI.

**Root Cause:**
The `buildTooltip()` method in `usageIndicator.ts` was unconditionally rendering the Free Tool Calls section regardless of whether the values were meaningful. A 0/0 state indicates the user has no free tier quota, making this section irrelevant.

**Commands Fixed:**
- Modified `buildTooltip()` in `src/statusBar/usageIndicator.ts` to conditionally render the Free Tool Calls section
- Added logic: only show section when NOT (requests === 0 && limit === 0)

**Verification Workflow:**
1. Added decision-logic comment explaining why only the 0/0 case is hidden
2. Updated tests in `test/suite/statusBar/usageIndicator.test.ts` with three test cases:
   - Hidden when requests=0 and limit=0
   - Visible when requests>0 and limit=0 (shows overage)
   - Visible when requests=0 and limit>0 (shows unused quota)
3. All tests passing

**Learning:**
Conditional UI rendering should consider edge cases where data provides no value. The 0/0 case specifically indicates no free tier, while other combinations (X/0 or 0/Y) provide meaningful information about overage or available quota.

**Best Practices:**
- Always document decision logic with comments explaining WHY, not just WHAT
- Test edge cases: zero values, boundary conditions, and unexpected combinations
- Keep tooltip information concise and relevant

**Files Affected:**
- `src/statusBar/usageIndicator.ts` - Added conditional rendering logic
- `test/suite/statusBar/usageIndicator.test.ts` - Added comprehensive test coverage

**Code Quality:**
- Decision-logic comment added explaining the rationale
- Three specific test cases covering all edge cases
- All existing tests continue to pass
- No breaking changes to API or behavior

---

### [2026-02-02] - Command registration verification and fixes

**Issue:**
Commands declared in package.json were not being registered in extension.ts, causing "command not found" errors when users tried to execute them.

**Root Cause:**
The `registerCommands()` method was incomplete - it only registered some commands while others existed as methods but were never registered with VS Code's command system.

**Commands Fixed:**
- `syntheticUsageTracker.refresh` - Added registration
- `syntheticUsageTracker.configureApiKey` - Added registration
- `syntheticUsageTracker.showUsage` - Added registration
- `syntheticUsageTracker.removeApiKey` - Added registration
- `syntheticUsageTracker.testKey` - Added registration
- `syntheticUsageTracker.addApiKey` - Added registration
- `syntheticUsageTracker.cycleToNextKey` - Added registration
- `syntheticUsageTracker.showKeyMenu` - Added registration
- `syntheticUsageTracker.setPrimaryKey` - Added registration

**Verification Workflow:**
1. Search package.json for all `"command": "syntheticUsageTracker.*"` entries
2. Search extension.ts for all `vscode.commands.registerCommand()` calls
3. Compare lists to identify missing registrations
4. Add missing registrations to `registerCommands()` method
5. Test each command in Extension Development Host

**Learning:**
Command registration is separate from method implementation. A method can exist and be callable from code, but if it's not registered with `vscode.commands.registerCommand()`, VS Code won't recognize it as a user-executable command.

**Best Practices:**
- Always verify command registration when adding new commands
- Maintain a checklist of commands to verify during code review
- Use consistent naming: command IDs should match the pattern `syntheticUsageTracker.actionName`

**Files Affected:**
- `src/extension.ts` - Added missing command registrations

**Code Quality:**
- All 9 commands now properly registered
- Commands tested in Extension Development Host
- No breaking changes to existing functionality

---

## Usage Guidelines

When updating this file:

1. **Add new entries at the top** (most recent first)
2. **Include all sections** for consistency
3. **Be specific** about files changed and commands affected
4. **Document the why**, not just the what
5. **Cross-reference** related documentation files

## Related Documentation

- [`docs/MEMORY.md`](../MEMORY.md) - Query history and task tracking
- [`AGENTS.md`](../../AGENTS.md) - AI Agent Development Guide
- [`CHANGELOG.md`](../../CHANGELOG.md) - Version history and changes
