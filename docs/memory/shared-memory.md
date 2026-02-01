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
