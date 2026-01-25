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

## Debugging

### Setting Breakpoints

1. Open the source file you want to debug
2. Click in the gutter to set a breakpoint
3. Press `F5` to launch the Extension Development Host
4. The debugger will stop at your breakpoint

### Debug Console

The Debug Console shows:
- Console.log output
- Error messages
- Debug information

### Developer Tools

In the Extension Development Host:
1. Press `Ctrl+Shift+I` (or `Cmd+Shift+I` on macOS)
2. This opens the browser DevTools for the extension host

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
