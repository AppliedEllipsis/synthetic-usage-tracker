---

### [2026-02-02] - Command registration verification and fixes

**Issue**: Three commands defined in package.json were not registered in extension.ts:
- `syntheticUsageTracker.configure` - "Configure API Key"
- `syntheticUsageTracker.eraseKey` - "Erase API Key"
- `syntheticUsageTracker.openDashboard` - "Open Synthetic Dashboard"

**Root Cause**: During multi-key implementation, commands were added to package.json but the registerCommands() method was not updated to register them. The methods existed in the code but were never registered with VSCode's command system.

**Commands Fixed**:
1. `configure` → calls `setApiKey()` (redirects to addKey() for multi-key support)
2. `eraseKey` → calls `clearAllKeys()` (clears all API keys)
3. `openDashboard` → calls `openDashboard()` (opens https://synthetic.new/billing)

**Verification Workflow**:
1. Extract all commands from package.json `contributes.commands` array
2. Search for all `vscode.commands.registerCommand()` calls in extension.ts
3. Compare package.json commands against registered commands
4. Implement missing registrations or remove unused package.json entries
5. Verify all registered methods exist and are called correctly
6. Search for any `executeCommand()` calls to verify no broken references
7. Run TypeScript compilation and ESLint to verify code integrity

**Learning**:
- Always verify package.json commands match registered commands in registerCommands()
- Methods can exist but not be registered, causing "command not found" errors
- Command registration is separate from method implementation
- Verification should include checking for executeCommand() calls that might break

**Best Practices**:
- Before adding features, verify existing command registrations
- After modifying commands, search for all references using grep
- Run compile and lint after any command-related changes
- Document any command aliases or redirects in code comments

**Files Affected**:
- package.json - commands defined (no changes needed)
- src/extension.ts - added three command registrations (lines 245-268)
- docs/memory/shared-memory.md - documented command verification workflow
- docs/MEMORY.md - added query history entry, updated current focus

**Code Quality**:
- TypeScript compilation: Success ✅
- ESLint: No errors ✅

---


**When user says "buildrelease", follow this exact sequence**:

### Step 1: Update CHANGELOG with Predicted Version
```bash
node scripts/update-changelog-for-release.js
```
- Reads package.json current version (e.g., 1.0.10023)
- Predicts next version by incrementing patch (e.g., 1.0.10024)
- Moves "Unreleased" section to `## [1.0.10024] - YYYY-MM-DD`
- Creates new empty "Unreleased" section with "Nothing yet"

### Step 2: Verify Version Prediction
- Check that CHANGELOG version matches what `npm version patch` will create
- The script uses the same prediction logic (current version + 1 patch)
- This ensures .vsix package version matches CHANGELOG

### Step 3: Ensure Clean Working Tree
- Verify all changes are committed or stashed
- No uncommitted changes should exist

### Step 4: Run buildrelease
```bash
npm run buildrelease
```
- Confirms CHANGELOG changes (already added and committed by agent)
- Updates project memory
- Runs `npm version patch` (increments to predicted version)
- Creates git tag
- Pushes commits and tags
- Compiles and packages extension
- Moves .vsix to releases/ directory

**Why this workflow exists**:
- The buildrelease command DOES include the changelog update step in package.json
- However, the LLM agent is instructed to run it FIRST to verify/control the process
- This gives the agent visibility into the version prediction before running buildrelease
- If version mismatch occurs (e.g., due to errors), the agent can increment patch again and update changelog
- **Script now prevents duplicates**: The update script checks if version header exists and skips if already created

**Version Matching Strategy**:
1. Script predicts: version = package.json version + 1 patch
2. CHANGELOG shows: `[predicted version] - YYYY-MM-DD`
3. `npm version patch` increments to: predicted version ✅
4. Result: CHANGELOG version matches package.json version in .vsix package ✅

**If version mismatch occurs**:
- Increment patch again manually: `npm version patch`
- Update CHANGELOG to show new version number
- Continue with rest of workflow

---

## Memory Entries

### [2026-02-01] - buildrelease duplicate version headers issue

**Issue**: When running `buildrelease`, duplicate version headers appeared in CHANGELOG.md:
```markdown
## [1.0.10024] - 2026-02-01
## [1.0.10024] - 2026-02-01
```

**Root Cause**: The `update-changelog-for-release.js` script ran twice:
1. Agent manually ran it to verify version prediction (per workflow instructions)
2. `npm run buildrelease` then ran it again (as part of its workflow)

The original script didn't check if the version header already existed, so both runs moved content and created headers.

**Resolution**: 
1. Removed the duplicate header via manual edit and committed fix
2. **Fixed the script**: Added check `if (versionHeaderRegex.test(changelogContent))` to skip if version header already exists
3. Script now safely runs twice without creating duplicates

**Learning**:
- Manual script run BEFORE buildrelease is the intended workflow (for control/verification)
- Script must handle being run multiple times safely (idempotent)
- The fix ensures script exits gracefully if version header already exists

**Files Affected**:
- CHANGELOG.md - duplicate headers created, then fixed
- scripts/update-changelog-for-release.js - added duplicate header prevention
- docs/memory/shared-memory.md - updated workflow documentation

**Commits**:
- `fix(changelog): Remove duplicate version 1.0.10024 header` (0cd0d88)
- `fix(script): Prevent duplicate version headers in changelog script` (future)

---
