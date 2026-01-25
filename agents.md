# AI Agent Development Guide

This guide provides comprehensive instructions for AI agents working on the Synthetic Usage Tracker VSCode extension. It covers build processes, incremental development practices, documentation standards, and coding conventions specific to this project.

## Table of Contents

- [Build Instructions](#build-instructions)
  - [Release Workflow](#release-workflow)
- [Incremental Development Approach](#incremental-development-approach)
- [Documentation Practices](#documentation-practices)
- [Coding Practices](#coding-practices)
- [Memory and Decision Logic](#memory-and-decision-logic)
- [Project-Specific Guidelines](#project-specific-guidelines)

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

The `buildrelease` command automates the complete release process, from version bumping to packaging. Use this workflow when preparing a new release for distribution.

#### Building a Release

Execute the release workflow:

```bash
npm run buildrelease
```

This command performs the following steps in sequence:

1. **Increment patch version**: Runs `npm version patch` to automatically increment the patch version (e.g., 1.0.5 → 1.0.6)
2. **Compile TypeScript**: Runs `npm run compile` to build the extension
3. **Package extension**: Runs `npm run package` to create the `.vsix` file
4. **Move to releases**: Moves the `.vsix` file to the [`releases/`](releases/) directory

#### Version Incrementing

The release workflow uses semantic versioning:
- **Patch version** (X.Y.Z): Bug fixes and minor improvements that don't break existing functionality
- The workflow currently increments the patch version automatically
- For major or minor version changes, update the version manually in [`package.json`](package.json) before running the workflow

#### Output Location

After running `npm run buildrelease`, the packaged extension is placed in:

```
releases/synthetic-usage-tracker-X.Y.Z.vsix
```

Where `X.Y.Z` is the new version number.

#### Release Checklist

Before running the release workflow:

- [ ] All tests pass: `npm run test`
- [ ] Code compiles without errors: `npm run compile`
- [ ] No linting issues: `npm run lint`
- [ ] Update [`CHANGELOG.md`](CHANGELOG.md) with release notes
- [ ] Update [`README.md`](README.md) if user-facing changes were made
- [ ] Ensure working directory is clean (no uncommitted changes)

#### Important Notes

- The release workflow creates a git commit for the version bump
- The commit is tagged with the new version number
- For manual version control, you can use `npm version minor` or `npm version major` instead of the automated workflow
- Always test the `.vsix` file in a clean VSCode instance before distributing

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

**Format**:
```markdown
## [1.0.3] - 2026-01-25

### Added
- New configuration option for custom thresholds

### Changed
- Improved error handling for API failures

### Fixed
- Fixed status bar not updating after configuration change
```

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
  apiKey: string;
  apiEndpoint: string;
  refreshInterval: number;
  // ...
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
  apiKey: string;
  apiEndpoint: string;
  refreshInterval: number;
  statusBarPosition: "left" | "right";
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
    apiKey: config.get<string>("apiKey", ""),
    apiEndpoint: config.get<string>("apiEndpoint", "https://api.synthetic.new/v2"),
    refreshInterval: config.get<number>("refreshInterval", 60),
    statusBarPosition: config.get<"left" | "right">("statusBarPosition", "right"),
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
