# Shared Memory Pool

This file serves as a consolidated memory pool for all AI tools working on the Synthetic Usage Tracker project. It maintains context across different AI agent sessions and tools.

## Memory Entries

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
