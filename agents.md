# AI Agent Development Guide

**Current Version**: 1.0.10022 | **Last Updated**: 2026-01-31

This guide provides comprehensive instructions for AI agents working on the Synthetic Usage Tracker VSCode extension. It covers build processes, incremental development practices, documentation standards, and coding conventions specific to this project.

## Table of Contents

- [Memory System Workflow](#memory-system-workflow)
  - [Overview](#overview)
  - [MEMORY.md Structure](#memorymd-structure)
  - [When to Update MEMORY.md](#when-to-update-memorymd)
  - [Query Documentation Guidelines](#query-documentation-guidelines)
- [Build Instructions](#build-instructions)
  - [Release Workflow](#release-workflow)
- [Incremental Development Approach](#incremental-development-approach)
- [Documentation Practices](#documentation-practices)
- [Coding Practices](#coding-practices)
- [Memory and Decision Logic](#memory-and-decision-logic)
- [Project-Specific Guidelines](#project-specific-guidelines)

---

## Memory System Workflow

### Overview

The project includes a **Query Memory & Task Tracking** system to maintain context across AI agent sessions. This system helps track work progress, remember important decisions, and provide continuity between different user interactions.

**Key File**: [`docs/MEMORY.md`](docs/MEMORY.md) - Query history and task tracking

**Purpose**: 
- Maintain context across multiple AI agent sessions
- Track progress on ongoing tasks and sub-tasks
- Document query history (sanitized of sensitive information)
- Provide quick reference for commonly used information
- Enable smooth handoffs between different AI sessions

### MEMORY.md Structure

The [`MEMORY.md`](MEMORY.md) file is organized into four main sections:

#### 1. Query History
Chronological list of all queries made to the agent, with:
- Timestamp in ISO 8601 UTC format
- Short descriptive title for each query
- Full query text (sanitized - no sensitive info)
- Context at the time of the query
- Outcome or status

**Important**: Always sanitize sensitive information before documenting:
- API keys → `[API_KEY]`
- Personal emails → `[USER_EMAIL]`
- Credentials → `[CREDENTIAL]`
- URLs with sensitive data → `[SENSITIVE_URL]`
- File paths with personal info → `[PERSONAL_PATH]`

#### 2. Current Focus
Details about the most recent or ongoing work:
- Last query title and timestamp
- Summary of what was being worked on
- Context needed to continue
- Planning or considerations
- Remaining items as a checklist

#### 3. Sub-tasks Tracking
Table format tracking active sub-tasks:
| # | Sub-task | Status | Notes |
|---|----------|--------|-------|
| 1 | Description | [Pending/In Progress/Complete] | Additional info |

#### 4. Quick Reference
Commonly referenced information:
- **Critical Files**: Key files with their purposes
- **Common Commands**: Frequently used commands
- **Configuration Storage**: Where sensitive data is stored
- **Extension Commands**: Available VSCode commands
- **API Endpoints**: Service endpoints
- **Status Bar States**: Display state enumerations
- **Memory System Usage**: Guidelines for using the memory system

### When to Update MEMORY.md

Update [`MEMORY.md`](MEMORY.md) in the following scenarios:

1. **Beginning a New Query Session**
   - Read the Current Focus section to understand what was previously being worked on
   - Review Sub-tasks Tracking to see if any tasks are in progress
   - Check if the new query relates to previous work

2. **During Query Processing**
   - Add the new query to Query History (sanitized)
   - Update Current Focus with the current work summary
   - Add sub-tasks to Sub-tasks Tracking as they are identified

3. **Completing Sub-tasks**
   - Update status in Sub-tasks Tracking table
   - Add relevant notes about the completion
   - Update Current Focus if the context has changed

4. **Finishing a Query**
   - Update Outcome in Query History
   - Clear or update Current Focus section
   - Mark completed sub-tasks as "Complete"
   - Update Quick Reference if new information was learned

5. **Learning New Information**
   - Add to Quick Reference section if it's commonly referenced
   - Update relevant sections with new insights

### Query Documentation Guidelines

When documenting queries in [`MEMORY.md`](MEMORY.md):

#### Sanitization Rules
**ALWAYS** replace sensitive information with placeholders:
```markdown
# Bad - Contains actual sensitive data
**Query**: "My API key is syn_abc123xyz789 and I'm having trouble"

# Good - Sanitized
**Query**: "My API key is [API_KEY] and I'm having trouble"
```

#### Query Entry Format
```markdown
### [YYYY-MM-DD HH:MM UTC] - Query: Short descriptive title
**Query**: Sanitized query text
**Context**: Any relevant context at the time (environment, previous state, etc.)
**Outcome**: Result or status (e.g., "Completed", "In Progress", "Blocked")
```

#### Current Focus Format
```markdown
### Last Query: [Same title as above]
**Time**: [timestamp]
**Summary**: Brief but detailed summary of what was being worked on
**Context**: What was needed to continue (files to read, commands to run, etc.)
**Planning**: What was planned or being considered (implementation approach, alternatives)
**Remaining Items**: Checklist of incomplete items or next steps
- [ ] Item 1
- [ ] Item 2
```

#### Sub-task Status Values
Use one of these status values:
- **Pending**: Not started yet
- **In Progress**: Currently being worked on
- **Complete**: Finished successfully
- **Blocked**: Waiting on something (e.g., user input, external dependency)

#### Quick Reference Guidelines
Add items to Quick Reference when:
- You find yourself looking up the same information repeatedly
- New files are created that are frequently referenced
- New commands are used often
- Configuration or architecture patterns emerge

### Memory System Workflow Example

**Scenario: Agent starts a new session**

1. **Read MEMORY.md**:
   - Check "Current Focus" to see what was last being worked on
   - Review "Sub-tasks Tracking" for any in-progress tasks
   - Scan "Query History" for recent related queries

2. **Process New Query**:
   - Add query to "Query History" section (sanitized)
   - Update "Current Focus" with new work context
   - Create sub-tasks in "Sub-tasks Tracking" table

3. **During Work**:
   - Update sub-task statuses as work progresses
   - Add notes to sub-tasks for important findings
   - Update "Current Focus" as context changes

4. **Complete Query**:
   - Update query "Outcome" in Query History
   - Mark completed sub-tasks as "Complete"
   - Clear or update "Current Focus" for next session

### Integration with Other Documentation

The memory system works alongside other documentation:

- [`CHANGELOG.md`](CHANGELOG.md): Tracks released changes and version history
- [`docs/`](docs/): Technical documentation and architecture decisions
- [`AGENTS.md`](AGENTS.md): This guide - development workflow and coding standards
- [`docs/MEMORY.md`](docs/MEMORY.md): Query history, current focus, and task tracking
- [`docs/memory/shared-memory.md`](docs/memory/shared-memory.md): Consolidated shared memory pool for all AI tools

**Key Difference**:
- [`CHANGELOG.md`](CHANGELOG.md) is for **released** changes (git-tagged versions)
- [`docs/MEMORY.md`](docs/MEMORY.md) is for **session context** and ongoing work (not versioned)

### Security Considerations

The memory system handles potentially sensitive information:

1. **Never include real credentials** in [`MEMORY.md`](MEMORY.md)
2. **Always sanitize** API keys, tokens, and secrets
3. **Use placeholders** consistently: `[API_KEY]`, `[USER_EMAIL]`, etc.
4. **Review before committing** to ensure no sensitive data was accidentally included

### Best Practices

1. **Keep it current**: Update [`MEMORY.md`](MEMORY.md) as you work, not just at the end
2. **Be concise**: Summaries should be brief but informative
3. **Be accurate**: Only document what actually happened or is planned
4. **Use links**: Reference specific files with markdown links (e.g., [`src/extension.ts`](src/extension.ts))
5. **Clean up**: Remove outdated sub-tasks and old Current Focus entries regularly

---

## Agent Context Management

### Onboarding Flow

When a new agent session begins, follow this sequence:

1. **First Read: AGENTS.md** - Read Memory System Workflow section (lines 22-210)
2. **Second Read: docs/MEMORY.md** - Read Query History and Current Focus to understand recent work
3. **Third Read: docs/memory/shared-memory.md** - Read shared memory pool for cross-tool context
4. **Fourth Read: docs/memory/tool-registry.md** - Identify your tool and understand your capabilities
5. **Fifth Read: Tool-Specific Documentation** - Read your tool's design document if it exists
6. **Report Status** - After reading all relevant files, report back to user with context summary

### Status Report Format

After reading all relevant documentation, agents should respond with:

```
🧠 Context loaded successfully! Here's what I know:

Project: Synthetic Usage Tracker - VSCode extension for tracking Synthetic.new API usage
Last Focus: [from docs/MEMORY.md Current Focus]
Pending Tasks: [from docs/MEMORY.md Sub-tasks Tracking]

Current Task Queue:
t6. [Update tooltip with ASCII progress bars] - Pending
t7. [Add symbols in statusbar for high quota] - Pending
...

Should I continue with the next task (t6), or do you have something else you want me to do?
```

**Key Requirements**:
- The response should be conversational and show context awareness
- List incomplete tasks with `t{number}` prefix for easy reference
- Use agentic-friendly, relevant language based on what was read
- Be ready to accept new tasks or continue with existing ones
- Intelligently prioritize tasks based on dependencies and user input

### Decision Documentation

Always document decision logic so future agents can understand:

1. **Impact Analysis**: Before making changes, document:
   - Which files/components will be affected
   - How the change fits into the overall system structure
   - Potential side effects or breaking changes
   - Dependencies and contracts between components

2. **Task Type Identification**: When creating sub-tasks, document:
   - **User-Directed Narrative**: Exploratory conversations, research, questions
   - **Assigned Task**: Specific work to complete with clear deliverables
   - This helps future agents understand context and approach

3. **Token Budget Management**:
   - Read large files in chunks (maximum 500 lines at a time)
   - Use offset/limit parameters strategically
   - Summarize logic between chunks
   - Track what was read to avoid re-reading
   - Ask user if continuation is needed before reading more

4. **Documentation Commitment**:
   - Document decisions immediately - don't wait until the end
   - Explain **why** a decision was made, not just **what** was done
   - Consider impact on documentation and all previous rules
   - Update docs/memory/shared-memory.md and docs/MEMORY.md with key decisions

### Memory System Discovery

The project contains multiple memory systems for different AI tools. When discovering and using these:

1. **Search Pattern**:
   - Check `docs/memory/` directory for shared memory pool
   - Check `docs/MEMORY.md` for query history and task tracking
   - Check `docs/` directory for tool-specific documentation
   - Check `plans/` directory for design documents
   - Look for patterns like `*memory*.md`, `*agent*.md`, `*mcp*.md`

2. **Reading Strategy**:
   - Read files in chunks (500 lines max)
   - Document key insights as you discover them
   - Update docs/memory/shared-memory.md with new discoveries
   - Note any tool-specific workflows or conventions

3. **Conflict Resolution**:
   - If multiple memory systems exist, document hierarchy
   - Project-specific docs take precedence over tool-specific docs
   - Tool-specific patterns can be adapted to project conventions
   - Document any deviations or customizations

4. **Documentation**:
   - When you discover a new memory system or documentation file:
     - Add it to Quick Reference in docs/MEMORY.md
     - Note its purpose and what information it contains
     - Document how it relates to other documentation
     - Add to docs/memory/tool-registry.md if it's a new tool

### Working Pattern

**Before starting any task:**
1. Read AGENTS.md sections relevant to the work
2. Read docs/MEMORY.md for current focus and recent decisions
3. Read docs/memory/shared-memory.md for cross-tool context
4. Read docs/memory/tool-registry.md to identify your tool
5. Discover and read any tool-specific memory files
6. Identify task type (narrative vs assigned)
7. Report context status to user with task queue

**During task execution:**
1. Read files in manageable chunks (500 lines max)
2. Document decisions as they are made in code comments
3. Update docs/memory/shared-memory.md with context and reasoning
4. Consider how this affects future tasks and documentation

**After completing task:**
1. Update docs/memory/shared-memory.md with new entry
2. Update docs/MEMORY.md Query History with outcome
3. Document any new patterns or rules learned
4. Update Quick Reference if new information emerged
5. Mark completed sub-tasks as "Complete"
6. Report completion and offer to continue with next task

### Cross-Tool Integration

This project may be accessed via different AI agent tools. Each tool may have its own conventions:

**Tool Discovery**:
- When a new session starts, identify which tool is being used
- Read docs/memory/tool-registry.md to find your tool's entry
- Read any tool-specific documentation if available
- Adapt working pattern to tool's strengths
- Document tool-specific patterns in docs/memory/shared-memory.md

**Common Patterns Across Tools**:
- All tools should read AGENTS.md first
- All tools should check docs/memory/shared-memory.md for context
- All tools should check docs/MEMORY.md for query history
- All tools should follow decision documentation standards
- All tools should use the status report format after onboarding

**Tool-Specific Considerations**:

| Tool | Memory Doc Location | Special Notes |
|------|-------------------|---------------|
| Kilocode | [`plans/kilocode-memory-system-design.md`](plans/kilocode-memory-system-design.md) | Has automated JSON-based memory system with version logging |
| Roocode | (to be discovered) | Search for `*roocode*.md` or `.roocode/` directory |
| Opencode | (current tool) | Uses docs/memory/shared-memory.md + AGENTS.md, no internal memory |
| Amp | (to be discovered) | Search for `*amp*.md` or `.amp/` directory |
| Gemini | (to be discovered) | Search for `*gemini*.md` or `.gemini/` directory |
| Claude | (to be discovered) | Search for `*claude*.md` or `.claude/` directory |
| Antigravity | (to be discovered) | Search for `*antigravity*.md` or `.antigravity/` directory |

**Documentation**:
When working with a new tool, document:
- Tool name and version (if available)
- Unique capabilities or limitations
- Tool-specific patterns or conventions
- How to adapt project workflows to the tool
- Add entry to docs/memory/tool-registry.md

---

## Build Instructions

### Prerequisites

Before building the extension, ensure you have:

- **Node.js**: Version 18 or higher
- **npm**: Version 9 or higher (comes with Node.js)
- **TypeScript**: Version 5.7.2 (installed via devDependencies)
- **VSCode**: Version 1.96.0 or higher for testing
- **@vscode/vsce**: For packaging the extension

Install dependencies:

```bash
npm install
```

### Building the Extension

The extension uses TypeScript compilation to generate JavaScript output in the `out/` directory.

#### Compile TypeScript

```bash
npm run compile
```

This command:
- Runs TypeScript compiler with configuration from [`tsconfig.json`](tsconfig.json)
- Outputs compiled JavaScript to the `out/` directory
- Generates source maps for debugging
- Produces type declaration files

#### Watch Mode for Development

```bash
npm run watch
```

This command:
- Runs TypeScript compiler in watch mode
- Automatically recompiles on file changes
- Ideal for active development sessions

#### Linting

Check code quality:

```bash
npm run lint
```

Auto-fix linting issues:

```bash
npm run lint:fix
```

### Running Tests

Execute the test suite:

```bash
npm run test
```

The test command:
- Runs [`eslint`](eslint.config.mjs) first (via `pretest` hook)
- Compiles TypeScript
- Executes tests using [`vscode-test`](.vscode-test.mjs)
- Tests are located in [`test/suite/`](test/suite/)

### Packaging the Extension

Create a `.vsix` package for distribution:

```bash
npm run package
```

This command:
- Uses `vsce` to package the extension
- Creates a `.vsix` file in the project root
- Includes only files specified in [`.vscodeignore`](.vscodeignore)
- Ready for upload to VSCode Marketplace

### Release Workflow

The `buildrelease` command automates the complete release process with a **build-first approach** to ensure only successful builds are tagged and pushed. This prevents broken builds from polluting the git history.

#### Overview

The release process now uses a single comprehensive script (`scripts/buildrelease.js`) that:
- Builds and tests FIRST before any git operations
- Automatically detects changelog changes and determines release type
- Supports standard version bumps OR letter-suffix repackaging
- Handles all git operations (commit, tag, push) in one flow

#### Usage

**Simple usage - just run:**
```bash
npm run buildrelease
```

That's it. The script handles everything:
1. Verifies clean working tree
2. Builds and tests (compile + lint + test)
3. Checks for changelog changes
4. Updates CHANGELOG if needed
5. Commits and tags with appropriate version
6. Pushes to remote
7. Packages the extension

#### Release Types

**Standard Release** (when Unreleased section has actual changes):
- Version bump: `1.0.10033` → `1.0.10034`
- CHANGELOG is updated with new version header
- Creates git commit and tag (v1.0.10034)
- Pushes commits and tags

**Letter-Suffix Repackage** (when no changelog changes exist):
- Version bump: `1.0.10033` → `1.0.10033a` (or b, c, etc.)
- Uses same CHANGELOG version (no new entry)
- Creates git commit and tag (v1.0.10033a)
- Pushes commits and tags
- Designed for repackaging after build failures

#### Workflow Details

**The buildrelease script performs these steps:**

1. **Verify working tree is clean**
   - Ensures no uncommitted changes before starting

2. **Build and Test** (CRITICAL - happens BEFORE git operations)
   - `npm run compile` - TypeScript compilation
   - `npm run lint` - Code quality checks
   - `npm run test` - Test suite
   - If any step fails, the script exits with error (no git changes made)

3. **Check Changelog**
   - Reads CHANGELOG.md Unreleased section
   - Determines if there are actual changes (not just "Nothing yet")

4. **Determine Release Type**
   - **Has changes**: Standard release with version bump
   - **No changes**: Letter-suffix repackage (with user confirmation)

5. **Update Documentation**
   - Updates CHANGELOG.md (if standard release)
   - Updates docs/memory/shared-memory.md with release entry

6. **Git Operations**
   - Commits CHANGELOG and memory updates
   - Bumps version in package.json (npm version)
   - Creates git tag (vX.Y.Z or vX.Y.Za)
   - Pushes commits and tags to remote

7. **Package Extension**
   - Creates .vsix file using vsce
   - Moves to releases/ directory
   - Excludes vector DBs, docs, scripts, and other bloat per .vscodeignore

#### Letter-Suffix Logic

When repackaging without changelog changes:
- `1.0.10033` → `1.0.10033a` (first repackage)
- `1.0.10033a` → `1.0.10033b` (second repackage)
- `1.0.10033z` → `1.0.10033aa` (continues beyond z)
- `1.0.10033az` → `1.0.10033ba` (increments like Excel columns)

**Why letter suffixes?**
- Indicates a repackage of the same version
- Useful when a previous build/packaging failed
- Maintains clear relationship to base version
- Allows unlimited repackages (a-z, aa-zz, aaa-zzz, etc.)

#### Important Changes from Previous Workflow

**OLD workflow (confusing and error-prone):**
- Agent had to manually run update-changelog-for-release.js first
- Agent had to verify version prediction
- Build happened AFTER version bump and git operations
- No support for repackaging

**NEW workflow (simple and robust):**
- Single command: `npm run buildrelease`
- Build happens FIRST (prevents broken tags)
- Automatic changelog detection
- Built-in letter-suffix support
- All git operations handled automatically

#### Pre-Release Requirements

Before running the release workflow:

1. **Update CHANGELOG.md**: Add all changes to the "Unreleased" section with proper categorization (Added, Changed, Fixed, Removed)
   - Use "Nothing yet" placeholder if there are no changes
2. **Ensure working tree is clean**: All changes should be committed or stashed
3. **Update user-facing documentation**: Update [`README.md`](README.md) if user-facing changes were made

**Note**: Tests, compilation, and linting are now run automatically by the buildrelease script BEFORE any git operations.

#### Version Incrementing

The release workflow uses semantic versioning:
- **Patch version** (X.Y.Z): Bug fixes and minor improvements that don't break existing functionality
- The workflow automatically increments the patch version
- For major or minor version changes, manually update the version in [`package.json`](package.json) and run the workflow separately

#### Output Location

After running `npm run buildrelease`, the packaged extension is placed in:

```
releases/synthetic-usage-tracker-X.Y.Z.vsix
```

Where `X.Y.Z` is the new version number.

#### Important Notes

- The release workflow creates multiple git commits (CHANGELOG, memory, version bump)
- The version bump commit is tagged with the new version number
- All commits and tags are pushed to the remote repository
- The `.vsix` file can be uploaded to VSCode Marketplace or Open VSX Registry
- Always test the `.vsix` file in a clean VSCode instance before publishing

### Build Troubleshooting

#### TypeScript Compilation Errors

If you encounter TypeScript errors:

1. **Check strict mode settings**: The project uses strict TypeScript configuration. Common issues:
   - `noImplicitAny`: All variables must have explicit types
   - `noImplicitReturns`: All code paths must return a value
   - `noUnusedLocals`: Unused local variables cause errors

2. **Verify type definitions**: Ensure all VSCode API types are imported correctly:
   ```typescript
   import * as vscode from "vscode";
   ```

3. **Check compiled output**: Review the `out/` directory to ensure compilation succeeded

#### Linting Errors

If ESLint reports issues:

1. **Run auto-fix**: Try `npm run lint:fix` for automatically fixable issues
2. **Review ESLint configuration**: Check [`eslint.config.mjs`](eslint.config.mjs) for rules
3. **Check import patterns**: Ensure consistent import ordering and naming

#### Test Failures

If tests fail:

1. **Check test environment**: Ensure VSCode test runner is properly configured
2. **Review test setup**: Check [`.vscode-test.mjs`](.vscode-test.mjs) for configuration
3. **Verify test isolation**: Ensure tests don't depend on shared state

---

## Incremental Development Approach

### Making Incremental Changes

When working on this project, follow this incremental development workflow:

#### Step 1: Understand the Current State

Before making changes:

1. **Read relevant files**: Understand the existing implementation
2. **Review documentation**: Check [`docs/`](docs/) for architecture and design decisions
3. **Identify impact**: Determine which components will be affected

#### Step 2: Make Small, Focused Changes

Follow these principles:

- **One change at a time**: Make the smallest possible change that achieves your goal
- **Atomic commits**: Each change should be independently testable and reviewable
- **Clear scope**: Focus on a single feature, bug fix, or improvement

#### Step 3: Verify Compilation

After each change:

```bash
npm run compile
```

Ensure TypeScript compilation succeeds without errors. This catches:
- Type errors
- Import issues
- Syntax errors
- Missing dependencies

#### Step 4: Run Linter

Check code quality:

```bash
npm run lint
```

Fix any linting issues before proceeding. This ensures:
- Consistent code style
- Adherence to best practices
- No obvious bugs or anti-patterns

#### Step 5: Test Your Changes

Run the test suite:

```bash
npm run test
```

If tests fail:
1. Identify the failing test
2. Understand why it failed
3. Fix the issue or update the test if the behavior change is intentional

#### Step 6: Manual Testing

Launch the extension in VSCode:

1. Press `F5` to launch the Extension Development Host
2. Test the specific functionality you changed
3. Verify edge cases and error conditions

### Testing Strategies

#### Unit Testing

- Test individual functions and methods in isolation
- Mock external dependencies (API calls, VSCode APIs)
- Verify both success and error paths

#### Integration Testing

- Test interactions between components
- Verify configuration changes trigger appropriate updates
- Test cross-window synchronization

#### Manual Testing Checklist

When testing changes:

- [ ] Extension activates without errors
- [ ] Status bar displays correctly
- [ ] API key configuration works
- [ ] Usage data refreshes successfully
- [ ] Auto-refresh functions as expected
- [ ] Error handling is appropriate
- [ ] Configuration changes take effect
- [ ] Cross-window synchronization works
- [ ] Notifications display correctly
- [ ] Extension deactivates cleanly

### Code Compilation Verification

Always verify compilation after changes:

```bash
npm run compile
```

**What to check:**
- No TypeScript errors
- Output files generated in `out/`
- Source maps present
- Declaration files generated

**Common compilation issues:**

1. **Missing imports**: Add required imports at the top of files
2. **Type mismatches**: Ensure types match declared interfaces
3. **Unused variables**: Remove or use all declared variables
4. **Implicit any**: Add explicit type annotations

### Running and Debugging the Extension

#### Launch Configuration

The project uses VSCode's launch configuration for debugging. Press `F5` to:

1. Compile the extension
2. Launch a new VSCode instance (Extension Development Host)
3. Attach the debugger
4. Load the extension automatically

#### Debugging Tips

1. **Set breakpoints**: Click in the gutter to set breakpoints in TypeScript files
2. **Check console**: Use the Developer Tools console (Help → Toggle Developer Tools)
3. **View output channels**: Check the "Output" panel for extension logs
4. **Inspect state**: Use the debugger to inspect variables and call stacks

#### Common Debugging Scenarios

**Extension fails to activate:**
- Check the `activate()` function in [`src/extension.ts`](src/extension.ts)
- Review console for error messages
- Verify all dependencies are properly imported

**Status bar not updating:**
- Check [`UsageIndicator`](src/statusBar/usageIndicator.ts) methods
- Verify update logic is called
- Check for caching issues (see [`lastText`](src/statusBar/usageIndicator.ts:38))

**API calls failing:**
- Review [`SyntheticService`](src/api/syntheticService.ts) error handling
- Check API key configuration
- Verify network connectivity
- Review retry logic

### Workflow for Small, Testable Changes

Example workflow for adding a new configuration option:

1. **Add to package.json**:
   - Add the new property to the `contributes.configuration` section
   - Define appropriate type and default value

2. **Update Configuration interface**:
   - Add the new property to [`Configuration`](src/config/configuration.ts:6) interface
   - Add default value in [`getConfig()`](src/config/configuration.ts:46)

3. **Implement functionality**:
   - Add logic to use the new configuration
   - Update UI if needed
   - Handle edge cases

4. **Test incrementally**:
   ```bash
   npm run compile  # Verify types
   npm run lint     # Check code quality
   npm run test     # Run tests
   ```

5. **Manual test**:
   - Launch extension with `F5`
   - Configure the new setting
   - Verify behavior

6. **Update documentation**:
   - Update [`README.md`](README.md) if user-facing
   - Update [`docs/`](docs/) if technical
   - Add entry to [`CHANGELOG.md`](CHANGELOG.md)

---

## Documentation Practices

### When to Update Documentation

Update documentation **every time** you make changes that affect:

- User-facing features
- API interfaces
- Configuration options
- Architecture or design decisions
- Installation or setup procedures
- Troubleshooting information

### Which Files to Update

#### README.md

Update [`README.md`](README.md) for:

- **New features**: Add to feature list with description
- **Configuration changes**: Update configuration section
- **Breaking changes**: Add migration guide
- **New commands**: Document in commands section
- **Screenshots**: Update if UI changes

**Example**:
```markdown
## Configuration

### New Setting: `syntheticUsageTracker.customThreshold`

Allows setting a custom threshold for usage alerts. Default: 75.
```

#### docs/ Directory

Update files in [`docs/`](docs/) for:

- **[`docs/architecture.md`](docs/architecture.md)**: When changing system architecture
- **[`docs/api.md`](docs/api.md)**: When modifying API interfaces or adding new services
- **[`docs/development.md`](docs/development.md)**: When changing development workflows
- **[`docs/installation.md`](docs/installation.md)**: When changing installation procedures
- **[`docs/troubleshooting.md`](docs/troubleshooting.md)**: When adding common issues or solutions

#### CHANGELOG.md

Update [`CHANGELOG.md`](CHANGELOG.md) for:

- **All changes**: Every commit should have an entry
- **Categorize properly**: Use sections like "Added", "Changed", "Fixed", "Removed"
- **Version bumps**: Update version number following semantic versioning
- **Date entries**: Include date for each version

**Important**: Use the "Unreleased" section for pending changes. Only create version headers after running `npm run buildrelease`.

**Format for Unreleased section**:
```markdown
## Unreleased

### Added
- New configuration option for custom thresholds

### Changed
- Improved error handling for API failures

### Fixed
- Fixed status bar not updating after configuration change
```

**Format for Released versions** (after `npm run buildrelease`):
```markdown
## [1.0.3] - 2026-01-25

### Added
- New configuration option for custom thresholds

### Changed
- Improved error handling for API failures

### Fixed
- Fixed status bar not updating after configuration change
```

**CHANGELOG Workflow**:

1. **During development**: Add all new changes to the "Unreleased" section at the top of CHANGELOG.md
2. **Before release**: Ensure the "Unreleased" section is complete and accurate
3. **Run release**: Execute `npm run buildrelease` which:
   - Automatically updates CHANGELOG to move Unreleased to `## [X.Y.Z] - YYYY-MM-DD`
   - Commits CHANGELOG and memory updates
   - Increments version in package.json
   - Creates git tag (e.g., v1.0.3)
   - Pushes commits and tags to remote
   - Compiles and packages the extension

**Design decision: Using an "Unreleased" section and automating the release workflow helps distinguish between formally released changes (with git tags) and changes still in development. This prevents confusion about which features are available in published versions.**

### CHANGELOG Update Process

The `buildrelease` workflow now **automatically** updates the CHANGELOG before version bumping. This process ensures the version history accurately matches the git tags and published releases.

#### Automated UPDATE Process

The `buildrelease` command runs `scripts/update-changelog-for-release.js` which:

1. Reads the current version from package.json
2. Predicts the next version by incrementing the patch number (e.g., 1.0.10023 → 1.0.10024)
3. Reads the "Unreleased" section from CHANGELOG.md
4. Returns early if the Unreleased section is empty or only contains "Nothing yet"
5. Creates a new version header with format `## [X.Y.Z] - YYYY-MM-DD` using the PREDICTED version
6. Moves all Unreleased content under the new version header
7. Creates a new empty "Unreleased" section with "Nothing yet"
8. Writes the updated CHANGELOG.md

The workflow then commits this change, followed by memory update, version bump (which increments to the predicted version), git tag creation, and git push.

**Version matching**: The CHANGELOG version will match the .vsix package version because the script predicts what npm version patch will produce.

#### Manual CHANGELOG Updates During Development

**During development**: Add all new changes to the "Unreleased" section at the top of CHANGELOG.md:
- Use "Nothing yet" placeholder if there are no changes
- Categorize properly: "Added", "Changed", "Fixed", "Removed"
- Include detailed descriptions

**Before running buildrelease**:
- Ensure the "Unreleased" section contains all changes for the release
- Verify all changes are accurate and complete
- Make sure user-facing changes are described clearly

#### Version Header Format

The automated script uses this format:

```markdown
## [X.Y.Z] - YYYY-MM-DD
```

Where:
- `X.Y.Z` is the predicted version number (current version + 1 patch)
- `YYYY-MM-DD` is the current date (ISO 8601 format)

**Important**: The script predicts the next version BEFORE the version bump occurs and uses it in the CHANGELOG. This means:
- If package.json is at v1.0.10022, the script predicts 1.0.10023 and tags the changelog with v1.0.10023
- After `npm version patch` runs, it bumps package.json to 1.0.10023
- The CHANGELOG version (1.0.10023) matches the package.json version (1.0.10023) exactly
- This ensures the changelog accurately reflects the published .vsix package

#### Example

**Before update**:
```markdown
## Unreleased

### Added
- New configuration option for custom thresholds

### Changed
- Improved error handling for API failures

### Fixed
- Fixed status bar not updating after configuration change

## [1.0.12] - 2026-01-25
...
```

**After update** (assuming version 1.0.13 released on 2026-01-25):
```markdown
## Unreleased

Nothing yet

## [1.0.13] - 2026-01-25

### Added
- New configuration option for custom thresholds

### Changed
- Improved error handling for API failures

### Fixed
- Fixed status bar not updating after configuration change

## [1.0.12] - 2026-01-25
...
```

#### Important Notes

- **Timing**: Update the CHANGELOG only after `npm run buildrelease` completes successfully
- **Version matching**: The version header must match the git tag (e.g., `v1.0.13` tag → `[1.0.13]` header)
- **Date format**: Use ISO 8601 format (YYYY-MM-DD) for the date
- **Placeholder**: Use "Nothing yet" as placeholder for the new empty Unreleased section
- **Order**: Unreleased section should always be at the top, followed by version headers in descending order (newest first)

#### Related Documentation

For the full release workflow, see:
- [Release Workflow](#release-workflow) section in Build Instructions
- [CHANGELOG Workflow](#changelog-workflow) in Documentation Practices section

### Documentation Standards

#### Clear and Professional

- **Use active voice**: "Click the button" not "The button should be clicked"
- **Be concise**: Get to the point without unnecessary fluff
- **Use examples**: Show, don't just tell
- **Be consistent**: Use the same terminology throughout

#### Relevant and Up-to-Date

- **Remove outdated information**: Delete old procedures that no longer apply
- **Update examples**: Ensure code examples work with current version
- **Cross-reference**: Link to related documentation
- **Version-specific**: Note when features require specific versions

#### Structure and Formatting

- **Use headers**: Organize with `##` and `###` headers
- **Use code blocks**: Format code with backticks
- **Use lists**: Use bullet points for multiple items
- **Use tables**: For configuration options or parameters

**Example table**:
```markdown
| Configuration | Type | Default | Description |
|--------------|------|---------|-------------|
| refreshInterval | number | 60 | Auto-refresh interval in seconds |
| warningThreshold | number | 80 | Warning threshold percentage |
```

#### Code Documentation

Source code should follow these comment standards (see [Memory and Decision Logic](#memory-and-decision-logic)).

### Removing Outdated Information

When removing outdated documentation:

1. **Check references**: Search for references to the documentation you're removing
2. **Update links**: Fix broken links or redirects
3. **Archive if needed**: Move to a separate file if historical reference is needed
4. **Commit message**: Clearly indicate what was removed and why

**Example commit message**:
```
docs: Remove deprecated API configuration section

The old API endpoint configuration is no longer supported.
Users should use the new configuration format.
```

---

## Coding Practices

### TypeScript Best Practices

This project follows strict TypeScript configuration. Key practices:

#### Type Safety

**Always use explicit types**:
```typescript
// Good
const interval: number = config.refreshInterval;

// Bad - relies on inference
const interval = config.refreshInterval;
```

**Use interfaces for data structures**:
```typescript
interface UsageInfo {
  limit: number;
  requests: number;
  remaining: number;
  percentageUsed: number;
  renewsAt: Date;
}
```

**Use enums for fixed sets**:
```typescript
enum DisplayState {
  Loading = "loading",
  Idle = "idle",
  Success = "success",
  Warning = "warning",
  Error = "error",
}
```

#### Null and Undefined Handling

**Use strict null checks**:
```typescript
// Good - explicit null check
if (this.apiKey !== undefined) {
  // use apiKey
}

// Good - optional chaining
const message = error instanceof Error ? error.message : "Unknown error";

// Bad - loose equality
if (this.apiKey) {
  // might fail for empty string or 0
}
```

**Use non-null assertion sparingly**:
```typescript
// Only use when you're certain the value is not null
const keys = JSON.parse(keysJson) as Array<{ key: string }>;
if (keys.length > 0) {
  return keys[0]!.key; // ! is acceptable here due to length check
}
```

#### Error Handling

**Use custom error types**:
```typescript
export class ApiError extends Error {
  constructor(
    public type: ApiErrorType,
    message: string,
    public originalError?: Error,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
```

**Handle errors at appropriate levels**:
```typescript
// Catch and handle at the top level (extension.ts)
async activate(): Promise<void> {
  try {
    await this.initialize();
  } catch (error) {
    console.error("Failed to activate extension:", error);
    this.usageIndicator.setError("Failed to initialize extension");
  }
}
```

**Provide meaningful error messages**:
```typescript
throw new ApiError(
  ApiErrorType.Authentication,
  "Authentication failed. Please check your API key."
);
```

### Comment Standards

This project emphasizes **decision-logic comments** over descriptive comments. The goal is to explain **why** code is written a certain way, not **what** the code does.

#### What to Comment

**DO comment:**

1. **Design decisions and rationale**:
```typescript
/**
 * Design decision: We catch errors at this level to prevent extension failures from
 * bubbling up and crashing VS Code. The extension should remain functional even if
 * initial API calls fail, allowing users to configure settings and retry manually.
 */
async activate(): Promise<void> {
  try {
    await this.initialize();
  } catch (error) {
    console.error("Failed to activate extension:", error);
    this.usageIndicator.setError("Failed to initialize extension");
  }
}
```

2. **Non-obvious implementation choices**:
```typescript
// Track initialization state to prevent race conditions during early lifecycle events
private isInitialized: boolean = false;
```

3. **Trade-offs and alternatives considered**:
```typescript
/**
 * Design rationale:
 * - maxRetries: 3 attempts balance reliability with responsiveness
 * - initialDelay: 1000ms gives transient failures time to recover
 * - maxDelay: 10000ms prevents excessively long wait times
 * - backoffFactor: 2 follows standard exponential backoff to reduce server load
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
};
```

4. **Cross-file dependencies or contracts**:
```typescript
/**
 * Watch for changes in shared state (for cross-window key updates)
 * Uses polling to detect changes from other windows
 */
watchSharedStateChanges(pollInterval: number = 5000): vscode.Disposable
```

5. **Performance considerations**:
```typescript
// Cache to prevent unnecessary redraws
// Design rationale: VS Code status bar updates can cause visual flickering
// if done too frequently. Caching the last rendered values allows us to skip
// redundant updates when data hasn't changed, improving UX and performance.
private lastText: string | null = null;
```

**DON'T comment:**

1. **Obvious code**:
```typescript
// Bad - the code is self-explanatory
const sum = a + b;  // Add a and b together

// Good - no comment needed
const sum = a + b;
```

2. **What the code does (not why)**:
```typescript
// Bad - describes what, not why
if (usage.percentageUsed >= config.criticalThreshold) {
  this.displayState = DisplayState.Critical;  // Set display state to critical
}

// Good - explains the design decision
// Critical takes precedence over warning, which takes precedence over success
if (usage.percentageUsed >= config.criticalThreshold) {
  this.displayState = DisplayState.Critical;
}
```

3. **Redundant type information**:
```typescript
// Bad - type is obvious
const apiKey: string = await this.getApiKey();  // Get API key as string

// Good - no comment needed
const apiKey = await this.getApiKey();
```

#### Comment Format

**Use JSDoc for public APIs**:
```typescript
/**
 * Fetch quota information from Synthetic.new API
 * @returns Usage information including limit, requests used, and renewal date
 */
async fetchQuota(): Promise<UsageInfo>
```

**Use inline comments for decision logic**:
```typescript
// Don't retry on authentication errors - they won't succeed
if (lastError instanceof ApiError && lastError.type === ApiErrorType.Authentication) {
  throw lastError;
}
```

**Use block comments for complex rationale**:
```typescript
/**
 * Design decision: Early return when no API key is present to avoid unnecessary API calls
 * and error notifications. Users expect the extension to be silent until configured.
 */
private async initialize(): Promise<void> {
  const hasApiKey = await this.configManager.hasApiKey();
  if (!hasApiKey) {
    this.usageIndicator.setIdle();
    return;
  }
  // ... rest of initialization
}
```

### Code Organization Principles

#### File Structure

The project follows a clear separation of concerns:

```
src/
├── extension.ts          # Main extension entry point
├── api/                  # API integration layer
│   └── syntheticService.ts
├── config/               # Configuration management
│   └── configuration.ts
└── statusBar/            # UI components
    └── usageIndicator.ts
```

**Principles:**

1. **Single responsibility**: Each file/module has one clear purpose
2. **Layered architecture**: API → Configuration → UI → Main Extension
3. **Export public interfaces**: Only expose what external code needs
4. **Keep files focused**: If a file grows too large, consider splitting

#### Class Design

**Use classes for stateful components**:
```typescript
export class SyntheticUsageTrackerExtension {
  private configManager: ConfigurationManager;
  private usageIndicator: UsageIndicator;
  private isInitialized: boolean = false;
  // ...
}
```

**Use interfaces for contracts**:
```typescript
export interface Configuration {
  apiEndpoint: string;
  refreshInterval: number;
  showPercentage: boolean;
  showRawNumbers: boolean;
  enableNotifications: boolean;
  warningThreshold: number;
  criticalThreshold: number;
}
```

**Use enums for fixed sets**:
```typescript
export enum ApiErrorType {
  Network = "Network",
  Authentication = "Authentication",
  RateLimit = "RateLimit",
  Server = "Server",
  Unknown = "Unknown",
}
```

#### Function Design

**Keep functions focused**:
```typescript
// Good - single responsibility
private async initialize(): Promise<void> {
  const hasApiKey = await this.configManager.hasApiKey();
  if (!hasApiKey) {
    this.usageIndicator.setIdle();
    return;
  }
  await this.refreshUsage();
  // ...
}
```

**Use descriptive names**:
```typescript
// Good - clear intent
private calculateDelay(attempt: number, config: RetryConfig): number

// Bad - vague
private calcDelay(a: number, c: RetryConfig): number
```

**Prefer async/await over callbacks**:
```typescript
// Good - clean async flow
async fetchQuota(): Promise<UsageInfo> {
  const response = await fetch(url, options);
  return this.parseQuotaResponse(await response.json());
}

// Avoid - callback hell
fetchQuota(callback: (result: UsageInfo) => void)
```

### Error Handling Patterns

#### Try-Catch Structure

**Catch specific errors**:
```typescript
try {
  const data = await response.json();
  return this.parseQuotaResponse(data);
} catch (error) {
  if (error instanceof ApiError) {
    throw error;  // Re-throw known errors
  }
  // Wrap unknown errors
  throw new ApiError(
    ApiErrorType.Network,
    "Network error occurred while fetching quota",
    error instanceof Error ? error : undefined,
  );
}
```

**Handle errors at appropriate levels**:
```typescript
// Low level: throw typed errors
throw new ApiError(ApiErrorType.Authentication, "Invalid API key");

// Mid level: handle and transform
try {
  await this.fetchQuota();
} catch (error) {
  if (error instanceof ApiError) {
    this.usageIndicator.setError(error.message);
  }
}

// High level: prevent crashes
async activate(): Promise<void> {
  try {
    await this.initialize();
  } catch (error) {
    console.error("Failed to activate extension:", error);
    this.usageIndicator.setError("Failed to initialize extension");
  }
}
```

#### Error Recovery

**Provide fallback behavior**:
```typescript
// Fallback to legacy format for backward compatibility
const keysJson = await this.context.secrets.get("syntheticApiKeys");
if (keysJson) {
  try {
    const keys = JSON.parse(keysJson) as Array<{ key: string }>;
    if (Array.isArray(keys) && keys.length > 0) {
      return keys[0]!.key;
    }
  } catch {
    // Silent fallthrough to legacy format
  }
}
const legacyKey = await this.context.secrets.get("syntheticApiKey");
if (legacyKey) {
  return legacyKey;
}
```

**Graceful degradation**:
```typescript
// Set idle state instead of error - missing key is expected during initial setup
if (!hasApiKey) {
  this.usageIndicator.setIdle();
  return;
}
```

### Performance Considerations

#### Caching

**Cache expensive operations**:
```typescript
// Cache to prevent unnecessary redraws
private lastText: string | null = null;
private lastTooltip: string | null = null;

private updateStatusBarItem(usage: UsageInfo, config: Config): void {
  const text = this.buildText(usage, config);
  const tooltip = this.buildTooltip(usage);

  // Only update if values have actually changed
  if (this.lastText !== text || this.lastTooltip !== tooltip) {
    this.statusBarItem.text = text;
    this.statusBarItem.tooltip = tooltip;
    this.lastText = text;
    this.lastTooltip = tooltip;
  }
}
```

**Debounce frequent operations**:
```typescript
// Watch for cross-window key updates with polling
watchSharedStateChanges(pollInterval: number = 5000): vscode.Disposable {
  const intervalId = setInterval(async () => {
    const currentTimestamp = await this.getKeysTimestamp();
    if (currentTimestamp > lastKnownTimestamp) {
      lastKnownTimestamp = currentTimestamp;
      this.onKeysRefreshedCallback?.();
    }
  }, pollInterval);
  return { dispose: () => clearInterval(intervalId) };
}
```

#### Avoid Unnecessary Work

**Guard clauses**:
```typescript
// Early return to prevent unnecessary work
private async refreshUsage(): Promise<void> {
  if (this.isFetching) {
    return;  // Don't make concurrent requests
  }
  // ... rest of function
}
```

**Lazy initialization**:
```typescript
// Register callbacks early but initialize only when needed
constructor(private context: vscode.ExtensionContext) {
  this.configManager = new ConfigurationManager(context);
  this.usageIndicator = new UsageIndicator(context);
  // Register early to catch all configuration changes
  this.configManager.onConfigChange(() => this.handleConfigChange());
}
```

### Memory Management

#### Disposable Pattern

**Always dispose of resources**:
```typescript
export class UsageIndicator {
  private statusBarItem: vscode.StatusBarItem;
  private autoRefreshTimer: NodeJS.Timeout | null = null;

  constructor(context: vscode.ExtensionContext) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    context.subscriptions.push(this.statusBarItem);
  }

  dispose(): void {
    this.stopAutoRefresh();  // Clear timer
    this.statusBarItem.dispose();  // Dispose status bar item
  }
}
```

**Track disposables**:
```typescript
export class SyntheticUsageTrackerExtension {
  private sharedStateWatcherDisposable: vscode.Disposable | null = null;

  deactivate(): void {
    this.usageIndicator.dispose();
    this.configManager.dispose();
    this.sharedStateWatcherDisposable?.dispose();  // Safe optional chaining
  }
}
```

#### Timer Cleanup

**Always clear timers**:
```typescript
startAutoRefresh(intervalSeconds: number, refreshCallback: () => void): void {
  this.stopAutoRefresh();  // Clear existing timer first
  this.isAutoRefreshEnabled = true;
  this.autoRefreshTimer = setInterval(() => {
    if (this.isAutoRefreshEnabled) {
      refreshCallback();
    }
  }, intervalSeconds * 1000);
}

stopAutoRefresh(): void {
  if (this.autoRefreshTimer) {
    clearInterval(this.autoRefreshTimer);
    this.autoRefreshTimer = null;
  }
}
```

**Null check before disposal**:
```typescript
dispose(): void {
  this.stopAutoRefresh();  // Handles null check internally
  this.statusBarItem.dispose();
}
```

### Extension Lifecycle Management

#### Activation

**Register commands early**:
```typescript
async activate(): Promise<void> {
  try {
    // Register commands before initialization so they're always available
    this.registerCommands();
    // Start watching for cross-window key updates immediately
    this.sharedStateWatcherDisposable = this.configManager.watchSharedStateChanges();
    await this.initialize();

    this.isInitialized = true;
  } catch (error) {
    console.error("Failed to activate extension:", error);
    this.usageIndicator.setError("Failed to initialize extension");
  }
}
```

**Command registration verification**:
- Always verify that commands declared in package.json are registered in `registerCommands()`
- Search package.json for all `"command": "syntheticUsageTracker.*"` entries
- Search extension.ts for all `vscode.commands.registerCommand()` calls
- Compare lists to ensure all package.json commands are registered
- Before implementing new commands, verify existing commands aren't broken
- Search for any `executeCommand()` calls that might reference the commands you're modifying

**Common pitfall**: Methods can exist but not be registered, causing "command not found" errors. Registration is separate from implementation.

**Handle activation errors gracefully**:
```typescript
try {
  await this.initialize();
} catch (error) {
  console.error("Failed to activate extension:", error);
  this.usageIndicator.setError("Failed to initialize extension");
}
```

#### Deactivation

**Clean up all resources**:
```typescript
deactivate(): void {
  this.usageIndicator.dispose();
  this.configManager.dispose();
  this.sharedStateWatcherDisposable?.dispose();
}
```

**Ensure proper order**:
```typescript
// Dispose in reverse order of creation
deactivate(): void {
  this.sharedStateWatcherDisposable?.dispose();  // Dispose watchers first
  this.usageIndicator.dispose();  // Then UI components
  this.configManager.dispose();  // Finally, configuration
}
```

---

## Memory and Decision Logic

### Documenting Architectural Decisions

Architectural decisions should be documented with clear rationale explaining:

1. **The problem being solved**
2. **The chosen solution**
3. **Alternatives considered and rejected**
4. **Trade-offs made**

#### Example: Retry Logic Configuration

```typescript
/**
 * Retry configuration
 *
 * Design decision: Encapsulate retry parameters to make them configurable
 * and testable. This allows adjustment without modifying core logic.
 */
interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

/**
 * Default retry configuration following exponential backoff pattern
 *
 * Design rationale:
 * - maxRetries: 3 attempts balance reliability with responsiveness
 *   - Too few: transient failures cause unnecessary errors
 *   - Too many: users wait too long for timeout
 * - initialDelay: 1000ms gives transient failures time to recover
 *   - Based on typical server recovery times
 * - maxDelay: 10000ms prevents excessively long wait times
 *   - Users expect responsive feedback
 * - backoffFactor: 2 follows standard exponential backoff to reduce server load
 *   - Industry standard for retry logic
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
};
```

### What to Comment

**Comment:**

1. **Design decisions and rationale**
2. **Non-obvious implementation choices**
3. **Trade-offs and alternatives considered**
4. **Cross-file dependencies or contracts**
5. **Performance considerations**
6. **Security considerations**
7. **Migration paths or backward compatibility**

**Don't comment:**

1. **Obvious code**
2. **What the code does (not why)**
3. **Redundant type information**
4. **Outdated comments**
5. **Workarounds that should be fixed**

### Examples of Good Decision-Logic Comments

#### Example 1: State Management

```typescript
/**
 * Track initialization state to prevent race conditions during early lifecycle events
 *
 * Design decision: This flag prevents multiple initialization attempts and ensures
 * configuration changes are only handled after the extension is fully initialized.
 * Without this, early configuration events could cause errors or inconsistent state.
 */
private isInitialized: boolean = false;
```

#### Example 2: Error Handling Strategy

```typescript
/**
 * Design decision: We catch errors at this level to prevent extension failures from
 * bubbling up and crashing VS Code. The extension should remain functional even if
 * initial API calls fail, allowing users to configure settings and retry manually.
 *
 * Alternative considered: Let errors propagate to VS Code's error handler
 * Rejected: This would make the extension unusable until the next restart,
 * which is a poor user experience for configuration errors.
 */
async activate(): Promise<void> {
  try {
    await this.initialize();
  } catch (error) {
    console.error("Failed to activate extension:", error);
    this.usageIndicator.setError("Failed to initialize extension");
  }
}
```

#### Example 3: Caching Strategy

```typescript
// Cache to prevent unnecessary redraws
// Design rationale: VS Code status bar updates can cause visual flickering
// if done too frequently. Caching the last rendered values allows us to skip
// redundant updates when data hasn't changed, improving UX and performance.
//
// Alternative considered: Always update on every refresh
// Rejected: Causes noticeable flickering and unnecessary DOM updates,
// especially problematic during auto-refresh cycles.
private lastText: string | null = null;
private lastTooltip: string | null = null;
private lastDisplayState: DisplayState | null = null;
```

#### Example 4: Cross-Window Synchronization

```typescript
/**
 * Watch for changes in shared state (for cross-window key updates)
 * Uses polling to detect changes from other windows
 *
 * Design decision: Polling is used instead of event-based synchronization because
 * VS Code's globalState doesn't support change events across windows. Polling every
 * 5 seconds provides a good balance between responsiveness and performance.
 *
 * Alternative considered: Use workspace state with onDidChangeConfiguration
 * Rejected: Configuration events don't fire for globalState changes, only for
 * workspace configuration changes.
 */
watchSharedStateChanges(pollInterval: number = 5000): vscode.Disposable
```

#### Example 5: API Key Storage Strategy

```typescript
/**
 * Design decision: Support both new and legacy API key formats for backward compatibility
 *
 * New format: Array of keys with labels (for future multi-key support)
 * Legacy format: Single key string
 *
 * Rationale: Existing users shouldn't lose their API keys when upgrading the extension.
 * By checking both formats, we handle both new installations and upgrades seamlessly.
 *
 * Migration path: When users set a new key, we delete the legacy format to avoid
 * storing duplicate data.
 */
async getApiKey(): Promise<string | undefined> {
  // Try new format first
  const keysJson = await this.context.secrets.get("syntheticApiKeys");
  if (keysJson) {
    try {
      const keys = JSON.parse(keysJson) as Array<{ key: string; label?: string }>;
      if (Array.isArray(keys) && keys.length > 0) {
        return keys[0]!.key;
      }
    } catch {
      // Silent fallthrough to legacy format
    }
  }

  // Fallback to legacy format
  const legacyKey = await this.context.secrets.get("syntheticApiKey");
  if (legacyKey) {
    return legacyKey;
  }

  return undefined;
}
```

---

## Project-Specific Guidelines

### VSCode Extension API Usage Patterns

#### Command Registration

**Register commands in constructor**:
```typescript
private registerCommands(): void {
  const refreshCommand = vscode.commands.registerCommand(
    "syntheticUsageTracker.refresh",
    () => this.refreshUsage(),
  );
  this.context.subscriptions.push(refreshCommand);
  // ... register other commands
}
```

**Use consistent naming**:
- Command IDs: `syntheticUsageTracker.actionName`
- Handler methods: `actionName()` (camelCase)
- Display titles: "Action Name" (title case)

#### Status Bar Management

**Create status bar items properly**:
```typescript
constructor(context: vscode.ExtensionContext) {
  this.statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,  // Priority: higher numbers appear further right
  );
  context.subscriptions.push(this.statusBarItem);
  this.statusBarItem.show();
}
```

**Use theme colors for consistency**:
```typescript
this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
this.statusBarItem.backgroundColor = undefined;  // Default
```

**Set appropriate commands**:
```typescript
this.statusBarItem.command = "syntheticUsageTracker.showUsage";
```

#### Configuration Management

**Watch for configuration changes**:
```typescript
private watchConfigurationChanges(): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("syntheticUsageTracker")) {
      this.onConfigChangeCallback?.();
    }
  });
}
```

**Get configuration values**:
```typescript
const config = vscode.workspace.getConfiguration("syntheticUsageTracker");
const refreshInterval = config.get<number>("refreshInterval", 60);
```

#### Secret Storage

**Store sensitive data securely**:
```typescript
await this.context.secrets.store("syntheticApiKey", apiKey);
```

**Retrieve sensitive data**:
```typescript
const apiKey = await this.context.secrets.get("syntheticApiKey");
```

**Delete sensitive data**:
```typescript
await this.context.secrets.delete("syntheticApiKey");
```

### Status Bar Update Patterns

#### Caching to Prevent Redraws

**Cache previous values**:
```typescript
private lastText: string | null = null;
private lastTooltip: string | null = null;
private lastDisplayState: DisplayState | null = null;
```

**Compare before updating**:
```typescript
private updateStatusBarItem(usage: UsageInfo, config: Config): void {
  const text = this.buildText(usage, config);
  const tooltip = this.buildTooltip(usage);

  // Only update if values have actually changed
  const needsUpdate =
    this.lastText !== text ||
    this.lastTooltip !== tooltip ||
    this.lastDisplayState !== this.displayState;

  if (needsUpdate) {
    this.statusBarItem.text = text;
    this.statusBarItem.tooltip = tooltip;
    this.updateStatusColor();

    // Update cache
    this.lastText = text;
    this.lastTooltip = tooltip;
    this.lastDisplayState = this.displayState;
  }
}
```

**Clear cache on state changes**:
```typescript
private clearCache(): void {
  this.lastText = null;
  this.lastTooltip = null;
  this.lastDisplayState = null;
}

setLoading(): void {
  this.displayState = DisplayState.Loading;
  this.statusBarItem.text = "$(loading~spin) Synthetic.new";
  this.clearCache();  // Force update
}
```

### Cross-Window Synchronization Approach

#### Shared State Pattern

**Use globalState for cross-window data**:
```typescript
const SHARED_STATE_KEYS = {
  KEY_UPDATE_TIMESTAMP: 'syntheticApiKeyUpdateTimestamp',
} as const;
```

**Update timestamp on changes**:
```typescript
private async updateKeysTimestamp(): Promise<void> {
  const timestamp = Date.now();
  await this.context.globalState.update(SHARED_STATE_KEYS.KEY_UPDATE_TIMESTAMP, timestamp);
}
```

**Poll for changes**:
```typescript
watchSharedStateChanges(pollInterval: number = 5000): vscode.Disposable {
  let lastKnownTimestamp = 0;

  this.getKeysTimestamp().then(timestamp => {
    lastKnownTimestamp = timestamp;
  });

  const intervalId = setInterval(async () => {
    const currentTimestamp = await this.getKeysTimestamp();
    if (currentTimestamp > lastKnownTimestamp) {
      lastKnownTimestamp = currentTimestamp;
      this.onKeysRefreshedCallback?.();
    }
  }, pollInterval);

  return {
    dispose: () => clearInterval(intervalId),
  };
}
```

**Handle cross-window updates**:
```typescript
private async handleKeysRefreshed(): Promise<void> {
  if (!this.isInitialized) {
    return;
  }

  try {
    const hasKey = await this.configManager.hasApiKey();
    if (!hasKey) {
      this.usageIndicator.setIdle();
      return;
    }

    await this.refreshUsage();

    const config = this.configManager.getConfig();
    if (config.enableNotifications) {
      vscode.window.showInformationMessage(
        "API key updated in another window. Usage data refreshed."
      );
    }
  } catch (error) {
    console.error("Failed to handle key refreshed:", error);
  }
}
```

### API Integration Patterns

#### Service Class Design

**Stateful service instances**:
```typescript
/**
 * Synthetic.new API service client
 * Handles API communication with retry logic and error handling
 *
 * Design decision: Each instance is stateful and bound to a specific API key.
 * This design allows for easy testing with different keys and supports scenarios
 * where multiple keys might be used (e.g., testing vs production).
 */
export class SyntheticService {
  private apiKey: string;
  private apiEndpoint: string;
  private retryConfig: RetryConfig;

  constructor(apiKey: string, apiEndpoint: string = "https://api.synthetic.new/v2") {
    this.apiKey = apiKey;
    this.apiEndpoint = apiEndpoint;
    this.retryConfig = DEFAULT_RETRY_CONFIG;
  }
}
```

**Create new instances for each request**:
```typescript
async refreshUsage(): Promise<void> {
  // ...
  const config = this.configManager.getConfig();
  const service = new SyntheticService(apiKey, config.apiEndpoint);
  const usage = await service.fetchQuota();
  // ...
}
```

#### Error Handling

**Custom error types**:
```typescript
export enum ApiErrorType {
  Network = "Network",
  Authentication = "Authentication",
  RateLimit = "RateLimit",
  Server = "Server",
  Unknown = "Unknown",
}

export class ApiError extends Error {
  constructor(
    public type: ApiErrorType,
    message: string,
    public originalError?: Error,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
```

**Handle HTTP errors appropriately**:
```typescript
private async handleErrorResponse(response: Response): Promise<never> {
  let errorType = ApiErrorType.Unknown;
  let message = `API request failed with status ${response.status}`;

  switch (response.status) {
    case 401:
    case 403:
      errorType = ApiErrorType.Authentication;
      message = "Authentication failed. Please check your API key.";
      break;
    case 429:
      errorType = ApiErrorType.RateLimit;
      message = "Rate limit exceeded. Please try again later.";
      break;
    case 500:
    case 502:
    case 503:
    case 504:
      errorType = ApiErrorType.Server;
      message = "Server error occurred. Please try again later.";
      break;
  }

  throw new ApiError(errorType, message);
}
```

#### Retry Logic

**Exponential backoff**:
```typescript
private async retryFetch<T>(fetchFn: () => Promise<T>): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < this.retryConfig.maxRetries; attempt++) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on authentication errors
      if (lastError instanceof ApiError && lastError.type === ApiErrorType.Authentication) {
        throw lastError;
      }

      // Don't retry on the last attempt
      if (attempt === this.retryConfig.maxRetries - 1) {
        break;
      }

      // Calculate delay and wait before retry
      const delay = calculateDelay(attempt, this.retryConfig);
      await sleep(delay);
    }
  }

  throw lastError || new Error("Max retries exceeded");
}
```

### Configuration Management

#### Configuration Interface

**Define clear configuration schema**:
```typescript
export interface Configuration {
  apiEndpoint: string;
  refreshInterval: number;
  showPercentage: boolean;
  showRawNumbers: boolean;
  enableNotifications: boolean;
  warningThreshold: number;
  criticalThreshold: number;
}
```

**Provide sensible defaults**:
```typescript
getConfig(): Configuration {
  const config = vscode.workspace.getConfiguration("syntheticUsageTracker");
  return {
    apiEndpoint: config.get<string>("apiEndpoint", "https://api.synthetic.new/v2"),
    refreshInterval: config.get<number>("refreshInterval", 60),
    showPercentage: config.get<boolean>("showPercentage", true),
    showRawNumbers: config.get<boolean>("showRawNumbers", false),
    enableNotifications: config.get<boolean>("enableNotifications", true),
    warningThreshold: config.get<number>("warningThreshold", 80),
    criticalThreshold: config.get<number>("criticalThreshold", 90),
  };
}
```

#### Validation

**Validate user input**:
```typescript
const input = await vscode.window.showInputBox({
  prompt: "Enter your Synthetic.new API key",
  placeHolder: placeholder,
  password: true,
  validateInput: (value) => {
    if (!value || value.trim().length === 0) {
      return "API key cannot be empty";
    }
    if (!SyntheticService.validateApiKey(value)) {
      return "Invalid API key format. API keys should start with 'syn_'";
    }
    return null;
  },
});
```

**Validation methods**:
```typescript
static validateApiKey(apiKey: string): boolean {
  return apiKey.length > 0 && apiKey.startsWith("syn_");
}
```

### Security Considerations

#### API Key Storage

**Always use SecretStorage for sensitive data**:
```typescript
// Good - secure storage
await this.context.secrets.store("syntheticApiKey", apiKey);

// Bad - insecure
await this.context.globalState.update("apiKey", apiKey);
```

**Never log sensitive data**:
```typescript
// Good - don't log the key
console.log("API key configured");

// Bad - exposes the key in logs
console.log("API key:", apiKey);
```

**Validate input before storage**:
```typescript
if (!SyntheticService.validateApiKey(apiKey)) {
  throw new Error("Invalid API key format");
}
await this.context.secrets.store("syntheticApiKey", apiKey);
```

#### Error Messages

**Don't expose sensitive information in error messages**:
```typescript
// Good - generic error message
vscode.window.showErrorMessage(
  "Failed to fetch Synthetic.new usage. Please check your API key."
);

// Bad - could expose the key
vscode.window.showErrorMessage(`Failed with key: ${apiKey}`);
```

---

## Conclusion

This guide provides a comprehensive reference for AI agents working on the Synthetic Usage Tracker VSCode extension. By following these practices, you can:

- Build and test the extension reliably
- Make incremental, testable changes
- Maintain clear and up-to-date documentation
- Write clean, maintainable code
- Document architectural decisions effectively
- Follow project-specific patterns and conventions

Remember: The goal is to write code that is **clear, maintainable, and well-documented**. Focus on explaining **why** code is written a certain way, not just **what** it does.

For additional information, refer to:
- [`README.md`](README.md) - User-facing documentation
- [`docs/`](docs/) - Technical documentation
- [`CHANGELOG.md`](CHANGELOG.md) - Version history
- [`package.json`](package.json) - Extension manifest and scripts
- [`tsconfig.json`](tsconfig.json) - TypeScript configuration
