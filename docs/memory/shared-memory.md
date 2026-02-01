---

## Critical Workflow: LLM Agent buildrelease Command

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
