# Development Guide

This guide covers setting up a development environment and contributing to the Synthetic.new Usage Tracker extension.

## Prerequisites

- **Node.js**: 18.0 or higher
- **npm**: 9.0 or higher (or yarn/pnpm)
- **VSCode**: 1.96.0 or higher
- **Git**: For version control

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/AppliedEllipsis/synthetic-usage-tracker.git
cd synthetic-usage-tracker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Open in VSCode

```bash
code .
```

## Project Structure

```
synthetic-usage-tracker/
├── src/
│   ├── config/
│   │   └── configuration.ts      # Configuration management
│   ├── api/
│   │   └── syntheticService.ts   # API client
│   ├── statusBar/
│   │   └── usageIndicator.ts     # Status bar UI
│   └── extension.ts              # Main entry point
├── test/
│   └── suite/
│       └── extension.test.ts     # Unit tests
├── docs/                         # Documentation
├── .vscode/                      # VSCode configuration
├── .husky/                       # Git hooks
├── package.json                  # Project manifest
├── tsconfig.json                 # TypeScript configuration
├── eslint.config.mjs             # ESLint configuration
└── commitlint.config.mjs         # Commit lint configuration
```

## Development Workflow

### Watch Mode

Run the extension in watch mode for development:

```bash
npm run watch
```

This compiles TypeScript files on save and watches for changes.

### Running Tests

Run the test suite:

```bash
npm test
```

### Linting

Check code for linting errors:

```bash
npm run lint
```

Fix linting errors automatically:

```bash
npm run lint:fix
```

### Building

Compile the extension:

```bash
npm run compile
```

### Packaging

Package the extension as a `.vsix` file:

```bash
npm run package
```

## Running the Extension in Development

### Method 1: Using VSCode Extension Host

1. Press `F5` to launch the Extension Development Host
2. A new VSCode window will open with the extension loaded
3. Make changes to the source code
4. Press `Ctrl+R` (or `Cmd+R` on macOS) to reload the window

### Method 2: Installing from Local Build

1. Build the extension: `npm run compile`
2. Package the extension: `npm run package`
3. Install the `.vsix` file in VSCode

## Debugging the Extension

The project includes a comprehensive debugging configuration to help you troubleshoot issues effectively during development.

### Launch Configuration

The extension uses [`.vscode/launch.json`](.vscode/launch.json) for debugging. This configuration defines how the debugger attaches to the Extension Development Host.

**Configuration Details:**

- **Name**: "Run Extension"
- **Type**: `extensionHost` - VSCode extension host debugging
- **Request**: `launch` - Start a new debugging session
- **Extension Development Path**: `${workspaceFolder}` - Points to the current workspace
- **OutFiles**: `${workspaceFolder}/out/**/*.js` - Compiled JavaScript files for debugging
- **PreLaunchTask**: `${defaultBuildTask}` - Runs the default build task (npm: compile) before launching
- **SourceMaps**: `true` - Enables source maps for debugging TypeScript source files

### Starting a Debug Session

Press `F5` (or select "Run and Debug" from the Run and Debug panel) to start debugging. This will:

1. **Compile the extension** - Runs `npm run compile` to build TypeScript files
2. **Launch Extension Development Host** - Opens a new VSCode window instance
3. **Attach the debugger** - Connects the debugger to the extension host
4. **Load the extension** - Automatically loads your extension in the new window

### Setting Breakpoints

Breakpoints allow you to pause execution at specific points in your code to inspect the program state.

**To set a breakpoint:**

1. Open the TypeScript source file you want to debug
2. Click in the left gutter (to the left of the line numbers) at the line where you want execution to pause
3. A red dot will appear, indicating a breakpoint is set
4. Press `F5` to launch the Extension Development Host
5. The debugger will stop execution when it reaches your breakpoint

**Breakpoint Types:**

- **Standard breakpoint**: Click the gutter to set/unset
- **Conditional breakpoint**: Right-click the gutter → "Add Conditional Breakpoint" → Enter a condition
- **Logpoint**: Right-click the gutter → "Add Logpoint" → Enter a message to log without pausing

### Using the Debugger Interface

When the debugger stops at a breakpoint, you can use the debugging controls:

- **Continue (F5)**: Resume execution until the next breakpoint
- **Step Over (F10)**: Execute the current line and move to the next line
- **Step Into (F11)**: Step into function calls on the current line
- **Step Out (Shift+F11)**: Step out of the current function
- **Restart (Ctrl+Shift+F5)**: Restart the debug session
- **Stop (Shift+F5)**: Stop the debug session

### Inspecting Variables and State

While debugging, you can inspect the current state of your application:

**Variables Panel:**
- Shows local variables, parameters, and globals in the current scope
- Expand objects to view their properties
- Hover over variables in the code editor to see their values

**Watch Panel:**
- Add expressions to watch their values as you step through code
- Useful for tracking specific variables or evaluating expressions
- Click the "+" button to add a watch expression

**Call Stack Panel:**
- Shows the current call stack
- Click on a frame to navigate to that point in the code
- Helps understand the execution path that led to the current breakpoint

### Developer Tools Console

The Developer Tools provide additional debugging capabilities for inspecting the extension host environment.

**To open Developer Tools:**

In the Extension Development Host window:
- Press `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Shift+I` (macOS)
- Or navigate to **Help → Toggle Developer Tools**

**Developer Tools Features:**

- **Console**: Shows `console.log()`, `console.error()`, and other console output from your extension
- **Network Tab**: Monitor network requests (useful for debugging API calls)
- **Elements Tab**: Inspect the DOM structure of the extension host
- **Sources Tab**: View and debug the compiled JavaScript files
- **Performance Tab**: Profile performance to identify bottlenecks

### Output Channels

VSCode provides output channels for viewing logs from different parts of the extension.

**To view output channels:**

1. In the Extension Development Host, open the Output panel (`Ctrl+Shift+U` or `View → Output`)
2. Select the appropriate channel from the dropdown:
   - **Extension Host**: Shows general extension activation and lifecycle events
   - **Synthetic Usage Tracker**: Shows custom logs from this extension

**Adding custom logs:**

```typescript
console.log("Extension activated successfully");
console.error("Failed to fetch usage data:", error);
console.warn("API key not configured");
```

### Common Debugging Scenarios

#### Extension Fails to Activate

**Symptoms:**
- Extension doesn't appear in the status bar
- Commands don't work
- No error messages visible

**Debugging Steps:**

1. Check the [`activate()`](src/extension.ts) function in [`src/extension.ts`](src/extension.ts)
2. Set a breakpoint at the start of `activate()`
3. Start debugging with `F5`
4. Step through the activation code to identify where it fails
5. Check the Output panel for error messages
6. Verify all dependencies are properly imported:
   ```typescript
   import * as vscode from "vscode";
   ```

**Common Issues:**
- Missing or incorrect `activationEvents` in [`package.json`](package.json)
- Incorrect `main` field pointing to wrong entry point
- Unhandled errors during initialization
- Missing dependencies in `package.json`

#### Status Bar Not Updating

**Symptoms:**
- Status bar shows outdated information
- Status bar doesn't refresh after configuration changes
- Status bar shows loading state indefinitely

**Debugging Steps:**

1. Check [`UsageIndicator`](src/statusBar/usageIndicator.ts) methods
2. Set breakpoints in update methods:
   - `updateUsage()`
   - `updateStatusBarItem()`
   - `setLoading()`, `setSuccess()`, `setError()`, etc.
3. Verify that update logic is being called
4. Check for caching issues in [`lastText`](src/statusBar/usageIndicator.ts:38), [`lastTooltip`](src/statusBar/usageIndicator.ts:39), and [`lastDisplayState`](src/statusBar/usageIndicator.ts:40)
5. Inspect the `usage` object to ensure it contains valid data

**Common Issues:**
- Cache preventing updates (check cache comparison logic)
- Update method not being called after configuration changes
- Invalid or missing usage data
- Auto-refresh timer not started

#### API Calls Failing

**Symptoms:**
- Status bar shows error state
- No usage data displayed
- Error notifications appear

**Debugging Steps:**

1. Review [`SyntheticService`](src/api/syntheticService.ts) error handling
2. Set breakpoints in:
   - `fetchQuota()` - Main API fetching method
   - `handleErrorResponse()` - HTTP error handling
   - `retryFetch()` - Retry logic
3. Check API key configuration in [`ConfigurationManager`](src/config/configuration.ts)
4. Verify network connectivity using the Developer Tools Network tab
5. Inspect the `error` object to understand the failure reason
6. Check retry logic to see if retries are being attempted

**Common Issues:**
- Invalid or missing API key
- Incorrect API endpoint configuration
- Network connectivity problems
- API server errors (500, 502, 503, 504)
- Authentication failures (401, 403)
- Rate limiting (429)

**Debugging API Requests:**

Open Developer Tools → Network tab to see:
- Request URL and method
- Request headers (including Authorization header)
- Request payload
- Response status and headers
- Response body

#### Configuration Changes Not Taking Effect

**Symptoms:**
- Changing settings in VSCode settings doesn't update behavior
- Extension continues using old configuration values

**Debugging Steps:**

1. Check the configuration change watcher in [`ConfigurationManager`](src/config/configuration.ts)
2. Set breakpoint in the configuration change callback
3. Modify a setting in the Extension Development Host
4. Verify the callback is triggered
5. Check that `getConfig()` returns updated values
6. Ensure the callback properly handles the change

**Common Issues:**
- Configuration change watcher not registered
- Callback not properly updating internal state
- Configuration schema mismatch in [`package.json`](package.json)
- Caching preventing configuration updates

### Debugging Tips and Best Practices

**Use Descriptive Logging:**

```typescript
console.log(`Fetching usage data for API key: ${apiKey.substring(0, 8)}...`);
console.debug(`Current display state: ${this.displayState}`);
console.error(`API request failed: ${error.message}`, error);
```

**Use Conditional Breakpoints:**

Set breakpoints that only trigger under specific conditions:

```typescript
// Only break when usage exceeds 90%
if (usage.percentageUsed > 90) { breakpoint }
```

**Inspect VSCode API State:**

Use the debugger to inspect VSCode API objects:

```typescript
// Inspect configuration object
const config = vscode.workspace.getConfiguration("syntheticUsageTracker");

// Inspect secrets storage
const apiKey = await this.context.secrets.get("syntheticApiKey");
```

**Debug Async Code:**

For async functions, use async-aware debugging:

- Set breakpoints inside async functions
- Use "Step Over" to await promises
- Check the Promise state in the Variables panel

**Test Error Conditions:**

Intentionally trigger error conditions to verify error handling:

- Use an invalid API key
- Disconnect network during API calls
- Modify configuration to invalid values

### Debugging Cross-Window Synchronization

The extension supports cross-window API key updates. To debug this:

1. Open two Extension Development Host windows (run `F5` twice)
2. Set breakpoints in [`watchSharedStateChanges()`](src/config/configuration.ts)
3. Update the API key in one window
4. Observe the polling mechanism detecting the change in the other window
5. Verify the callback is triggered and usage data refreshes

### Performance Profiling

To identify performance bottlenecks:

1. Open Developer Tools → Performance tab
2. Click "Record" to start profiling
3. Perform the action you want to profile
4. Click "Stop" to end recording
5. Analyze the flame chart to identify slow functions

**Common Performance Issues:**
- Too frequent status bar updates (use caching)
- Excessive API calls (respect refresh intervals)
- Blocking operations in event handlers
- Memory leaks (check for undisposed resources)

### Debugging Tests

To debug tests:

1. Open the test file in [`test/suite/`](test/suite/)
2. Set breakpoints in the test code
3. Click the "Debug" button next to the test in the Test Explorer
4. The debugger will stop at your breakpoints when the test runs

### Resetting the Debug Environment

If you encounter persistent issues:

1. **Stop the debug session**: Press `Shift+F5` or click the stop button
2. **Close the Extension Development Host**: Close the new VSCode window
3. **Clear caches**: Delete the `out/` directory and rebuild:
   ```bash
   npm run compile
   ```
4. **Restart VSCode**: Close and reopen VSCode
5. **Disable other extensions**: Temporarily disable other extensions to rule out conflicts

## Code Style

### TypeScript Configuration

The project uses strict TypeScript settings:

- `strict: true` - All strict type-checking options enabled
- `noImplicitAny: true` - Disallows implicit any types
- `noUnusedLocals: true` - Reports errors on unused locals
- `noUnusedParameters: true` - Reports errors on unused parameters

### ESLint Rules

The project uses ESLint with TypeScript support:

- Follow Airbnb style guide
- TypeScript-specific rules
- Custom rules for this project

### Code Formatting

The project uses Prettier for code formatting (recommended extension: `esbenp.prettier-vscode`).

## Testing

### Writing Tests

Tests are located in the `test/suite/` directory:

```typescript
import * as vscode from "vscode";
import * as assert from "assert";
import { ConfigurationManager } from "../../src/config/configuration";

suite("ConfigurationManager Tests", () => {
  test("should create configuration manager", () => {
    const context = {
      secrets: {
        get: async () => undefined,
        store: async () => undefined,
        delete: async () => undefined,
      },
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;

    const configManager = new ConfigurationManager(context);
    assert.ok(configManager);
    configManager.dispose();
  });
});
```

### Running Tests

Run all tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test -- --watch
```

## Git Workflow

### Branching Strategy

- `main` - Production branch
- `develop` - Development branch
- `feature/*` - Feature branches
- `bugfix/*` - Bug fix branches
- `hotfix/*` - Hotfix branches

### Commit Messages

The project uses conventional commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test changes
- `build`: Build system changes
- `ci`: CI configuration changes
- `chore`: Other changes

**Examples:**

```
feat(api): add retry logic with exponential backoff

Implements retry logic for API requests with exponential backoff
to handle transient failures gracefully.

Closes #123
```

```
fix(config): handle missing API key gracefully

Fixes crash when API key is not configured.
```

### Pre-commit Hooks

Pre-commit hooks are configured to:
- Run ESLint
- Enforce conventional commit format

To bypass hooks (use with caution):

```bash
git commit --no-verify -m "message"
```

## Release Process

The project uses semantic-release for automated versioning:

1. Make commits following conventional commit format
2. Push to the `main` branch
3. Semantic-release will:
   - Determine the next version number
   - Update `package.json`
   - Generate CHANGELOG.md
   - Create a git tag
   - Publish to npm (if configured)

## Common Development Tasks

### Adding a New Configuration Option

1. Update `package.json` in the `contributes.configuration` section
2. Update the `Configuration` interface in `src/config/configuration.ts`
3. Update `getConfig()` in `ConfigurationManager` class
4. Update the design document and README

### Adding a New Command

1. Register the command in `src/extension.ts`:

```typescript
const command = vscode.commands.registerCommand(
  "syntheticUsageTracker.yourCommand",
  () => {
    // Your command logic
  },
);
this.context.subscriptions.push(command);
```

2. Add the command to `package.json` in the `contributes.commands` section

3. Add tests for the command

### Adding a New Setting

1. Add to `package.json` configuration schema
2. Add to `Configuration` interface
3. Implement logic to use the setting
4. Update documentation

## Troubleshooting

### Build Errors

**Problem**: TypeScript compilation fails

**Solution**:
```bash
npm run compile
# Check the error messages
# Fix the reported issues
```

**Problem**: ESLint errors

**Solution**:
```bash
npm run lint:fix
# Manually fix remaining issues
```

### Extension Not Loading

**Problem**: Extension doesn't appear in the Extension Development Host

**Solution**:
1. Check the Output panel for errors
2. Verify `package.json` is valid
3. Ensure `main` field points to compiled file
4. Check that `activationEvents` are correct

### Tests Failing

**Problem**: Tests fail in CI but pass locally

**Solution**:
1. Ensure all dependencies are installed
2. Check Node.js version matches CI
3. Verify test environment setup
4. Check for platform-specific issues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Run linter and tests
6. Commit with conventional commit message
7. Push to your fork
8. Create a pull request

## Resources

- [VSCode Extension API](https://code.visualstudio.com/api)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Release](https://semantic-release.gitbook.io/semantic-release/)

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/AppliedEllipsis/synthetic-usage-tracker/issues)
- **Discussions**: [GitHub Discussions](https://github.com/AppliedEllipsis/synthetic-usage-tracker/discussions)
- **Documentation**: [Full Documentation](README.md)
