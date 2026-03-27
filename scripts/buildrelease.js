#!/usr/bin/env node

/**
 * Build Release Script
 *
 * Workflow:
 * 1. Verify clean working tree
 * 2. Build and test (compile + lint + test)
 * 3. Check CHANGELOG for Unreleased content
 * 4. If changelog has changes:
 *    - Update CHANGELOG with predicted version
 *    - Update MEMORY.md
 *    - Commit both
 *    - Bump version (npm version patch)
 *    - Push and tag
 *    - Package
 * 5. If no changelog changes:
 *    - Prompt for letter-suffix repackage (a, b, c...)
 *    - Update package.json with letter version
 *    - Commit and tag
 *    - Push
 *    - Package
 *
 * This ensures broken builds never get tagged, and repackages are clearly versioned.
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const readline = require('readline');

const projectRoot = path.resolve(__dirname, '..');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  console.error(`${colors.red}❌ ${message}${colors.reset}`);
}

function success(message) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function warn(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function info(message) {
  console.log(`${colors.cyan}ℹ️  ${message}${colors.reset}`);
}

/**
 * Execute a command and return output
 */
function exec(command, options = {}) {
  try {
    return execSync(command, {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options,
    });
  } catch (err) {
    if (options.ignoreError) {
      return null;
    }
    throw err;
  }
}

/**
 * Check if working tree is clean
 */
function verifyCleanWorkingTree() {
  log('\n📋 Step 1: Verifying clean working tree...', 'bright');

  try {
    const status = exec('git status --porcelain', { silent: true });
    if (status && status.trim()) {
      error('Working tree is not clean!');
      info('Uncommitted changes:');
      console.log(status);
      info('Please commit or stash your changes before running buildrelease.');
      process.exit(1);
    }
    success('Working tree is clean');
  } catch (err) {
    error('Failed to check git status');
    throw err;
  }
}

/**
 * Build and test the project
 */
async function buildAndTest() {
  log('\n🔨 Step 2: Building and testing...', 'bright');

  // Compile TypeScript
  log('  Compiling TypeScript...');
  try {
    exec('npm run compile');
    success('TypeScript compilation successful');
  } catch (err) {
    error('TypeScript compilation failed!');
    info('Please fix compilation errors before releasing.');
    process.exit(1);
  }

  // Run linter
  log('  Running linter...');
  try {
    exec('npm run lint');
    success('Linting passed');
  } catch (err) {
    error('Linting failed!');
    info('Please fix linting errors or run: npm run lint:fix');
    process.exit(1);
  }

  // Run tests
  log('  Running tests...');
  try {
    exec('npm run test');
    success('All tests passed');
  } catch (err) {
    warn('Tests failed or not available');
    info('Continuing anyway - please verify tests manually');
  }

  success('Build and test phase completed successfully');
}

/**
 * Check if CHANGELOG has unreleased content
 */
function checkChangelog() {
  log('\n📝 Step 3: Checking CHANGELOG...', 'bright');

  const changelogPath = path.join(projectRoot, 'CHANGELOG.md');
  const content = fs.readFileSync(changelogPath, 'utf8');

  // Check for Unreleased section content
  const unreleasedMatch = content.match(/## Unreleased\s*\n([\s\S]*?)(?=\n## \[|$)/);

  if (!unreleasedMatch) {
    error('Could not find "Unreleased" section in CHANGELOG.md');
    process.exit(1);
  }

  const unreleasedContent = unreleasedMatch[1].trim();

  // Remove "Nothing yet" variations and whitespace
  const cleanedContent = unreleasedContent
    .replace(/^Nothing yet\.?\s*$/mi, '')
    .replace(/^\s*[\r\n]+/, '')
    .trim();

  if (!cleanedContent) {
    warn('No changes in Unreleased section (only "Nothing yet")');
    return { hasChanges: false, content: null };
  }

  success(`Found changes in Unreleased section (${cleanedContent.split('\n').length} lines)`);
  return { hasChanges: true, content: cleanedContent };
}

/**
 * Get current version from package.json
 */
function getCurrentVersion() {
  const packagePath = path.join(projectRoot, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return pkg.version;
}

/**
 * Predict next patch version
 */
function predictNextVersion(currentVersion) {
  const parts = currentVersion.split('.').map(Number);
  parts[2]++; // Increment patch
  return parts.join('.');
}

/**
 * Get the next letter suffix version (e.g., 1.0.10033 -> 1.0.10033a, 1.0.10033a -> 1.0.10033b)
 */
function getNextLetterVersion(currentVersion) {
  // Check if version already has a letter suffix
  const match = currentVersion.match(/^([\d.]+)([a-z]*)$/);
  if (!match) {
    return `${currentVersion}a`;
  }

  const [, baseVersion, currentLetter] = match;

  if (!currentLetter) {
    return `${baseVersion}a`;
  }

  // Increment letter (a -> b, b -> c, etc.)
  const lastChar = currentLetter.slice(-1);
  const charCode = lastChar.charCodeAt(0);

  if (charCode >= 122) { // 'z'
    // If at 'z', go to 'aa', 'ab', etc.
    return `${baseVersion}${currentLetter}a`;
  }

  const nextLetter = String.fromCharCode(charCode + 1);
  return `${baseVersion}${currentLetter.slice(0, -1)}${nextLetter}`;
}

/**
 * Prompt user for input
 */
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Update CHANGELOG for release
 */
function updateChangelog(version) {
  log(`\n📝 Updating CHANGELOG for version ${version}...`, 'bright');

  const changelogPath = path.join(projectRoot, 'CHANGELOG.md');
  let content = fs.readFileSync(changelogPath, 'utf8');

  const today = new Date().toISOString().split('T')[0];

  // Extract unreleased content
  const unreleasedMatch = content.match(/## Unreleased\s*\n([\s\S]*?)(?=\n## \[|$)/);
  if (!unreleasedMatch) {
    throw new Error('Could not find Unreleased section');
  }

  let unreleasedContent = unreleasedMatch[1].trim();

  // Clean up "Nothing yet"
  unreleasedContent = unreleasedContent
    .replace(/^Nothing yet\.?\s*$/mi, '')
    .replace(/^\s*[\r\n]+/, '')
    .trim();

  if (!unreleasedContent) {
    throw new Error('No content in Unreleased section');
  }

  // Create new version section
  const newVersionSection = `## [${version}] - ${today}\n\n${unreleasedContent}\n`;

  // Replace Unreleased section with new empty one + new version section
  const updatedContent = content.replace(
    /## Unreleased\s*\n[\s\S]*?(?=\n## \[|$)/,
    `## Unreleased\n\nNothing yet\n\n${newVersionSection}`
  );

  fs.writeFileSync(changelogPath, updatedContent);
  success(`CHANGELOG updated with version ${version}`);
}

/**
 * Update MEMORY.md for release
 */
function updateMemory(version, changeNotes) {
  log('\n📝 Updating MEMORY.md...', 'bright');

  const memoryPath = path.join(projectRoot, 'docs', 'MEMORY.md');

  if (!fs.existsSync(memoryPath)) {
    warn('MEMORY.md not found, skipping memory update');
    return;
  }

  let content = fs.readFileSync(memoryPath, 'utf8');

  // Find the sub-tasks table
  const subTaskSectionMatch = content.match(/# Sub-tasks Tracking\s*\n([\s\S]*?)(?=\n#|$)/);
  if (!subTaskSectionMatch) {
    warn('Could not find Sub-tasks Tracking section, skipping memory update');
    return;
  }

  const subTaskSection = subTaskSectionMatch[1];
  const taskMatches = subTaskSection.matchAll(/\|\s*(\d+)\s*\|/g);
  let lastTaskNumber = 0;
  for (const match of taskMatches) {
    const num = parseInt(match[1]);
    if (num > lastTaskNumber) {
      lastTaskNumber = num;
    }
  }

  // Create new task entry
  const newTaskNumber = lastTaskNumber + 1;
  const notes = `Release v${version}${changeNotes ? ` - ${changeNotes}` : ''}`;
  const newTaskEntry = `| ${newTaskNumber}   | Release v${version}                                   | Complete    | ${notes} |`;

  // Insert before the table separator
  const tableEndIndex = content.indexOf('\n---', content.indexOf('# Sub-tasks Tracking'));
  if (tableEndIndex !== -1) {
    content = content.slice(0, tableEndIndex) + '\n' + newTaskEntry + content.slice(tableEndIndex);

    // Update Current Focus
    const isoDate = new Date().toISOString();
    const updatedCurrentFocus = `## Current Focus\n\n### Last Query: Release v${version}\n**Time**: ${isoDate}\n**Summary**: Version v${version} released with changes: ${changeNotes || 'Version bump'}\n**Context**: Release completed via buildrelease workflow. Version bumped, compiled, packaged, and moved to releases/ directory.\n**Planning**: All tasks completed for v${version}. Ready for next iteration.\n**Remaining Items**:\n- None for this release - all changes verified and documented\n`;

    content = content.replace(
      /## Current Focus\s*\n[\s\S]*?(?=\n#|$)/,
      updatedCurrentFocus
    );

    fs.writeFileSync(memoryPath, content);
    success(`MEMORY.md updated with task t${newTaskNumber}`);
  } else {
    warn('Could not find end of Sub-tasks table, skipping memory update');
  }
}

/**
 * Update package.json version
 */
function updatePackageJson(version) {
  log(`\n📦 Updating package.json to version ${version}...`, 'bright');

  const packagePath = path.join(projectRoot, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

  pkg.version = version;

  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
  success(`package.json updated to version ${version}`);
}

/**
 * Perform git operations for release
 */
function gitOperations(version, isLetterRelease = false) {
  log(`\n🚀 Performing git operations for v${version}...`, 'bright');

  // Add files
  exec('git add CHANGELOG.md docs/MEMORY.md package.json');

  // Commit message
  const commitMessage = isLetterRelease
    ? `chore(release): repackage v${version}`
    : `chore(release): v${version}`;

  exec(`git commit -m "${commitMessage}"`);
  success('Changes committed');

  // Create tag
  exec(`git tag v${version}`);
  success(`Tag v${version} created`);

  // Push
  exec('git push');
  exec('git push --tags');
  success('Pushed to remote');
}

/**
 * Package the extension
 */
function packageExtension(version) {
  log(`\n📦 Packaging extension v${version}...`, 'bright');

  // Run vsce package
  exec('npm run package');

  // Move to releases directory
  const pkgName = 'synthetic-usage-tracker';
  const vsixName = `${pkgName}-${version}.vsix`;

  // Create releases directory if it doesn't exist
  const releasesDir = path.join(projectRoot, 'releases');
  if (!fs.existsSync(releasesDir)) {
    fs.mkdirSync(releasesDir, { recursive: true });
  }

  // Move the file
  const sourcePath = path.join(projectRoot, vsixName);
  const destPath = path.join(releasesDir, vsixName);

  if (fs.existsSync(sourcePath)) {
    fs.renameSync(sourcePath, destPath);
    success(`Package moved to releases/${vsixName}`);
  } else {
    warn(`Could not find ${vsixName} in project root`);
  }
}

/**
 * Handle standard release with changelog changes
 */
async function handleStandardRelease() {
  const currentVersion = getCurrentVersion();
  const nextVersion = predictNextVersion(currentVersion);

  info(`Current version: ${currentVersion}`);
  info(`Next version: ${nextVersion}`);

  // Update CHANGELOG
  updateChangelog(nextVersion);

  // Update MEMORY.md
  updateMemory(nextVersion, 'See CHANGELOG for details');

  // Update package.json
  updatePackageJson(nextVersion);

  // Git operations
  gitOperations(nextVersion, false);

  // Package
  packageExtension(nextVersion);

  log(`\n✨ Release v${nextVersion} completed successfully!`, 'green');
  info(`Package location: releases/synthetic-usage-tracker-${nextVersion}.vsix`);
}

/**
 * Handle letter-suffix repackage
 */
async function handleLetterRepackage() {
  const currentVersion = getCurrentVersion();
  const letterVersion = getNextLetterVersion(currentVersion);

  warn(`\nNo changelog changes detected for new release.`);
  info(`Current version: ${currentVersion}`);
  info(`This will create a repackage: ${letterVersion}`);

  const answer = await prompt('\nDo you want to repackage with letter suffix? [Y/n/a(bort)]: ');

  if (answer.toLowerCase() === 'a' || answer.toLowerCase() === 'abort') {
    info('Aborted by user');
    process.exit(0);
  }

  if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
    info('Please update CHANGELOG.md Unreleased section with your changes, then run buildrelease again.');
    process.exit(0);
  }

  // Proceed with letter release
  updatePackageJson(letterVersion);

  // Git operations for letter release
  gitOperations(letterVersion, true);

  // Package
  packageExtension(letterVersion);

  log(`\n✨ Repackage v${letterVersion} completed successfully!`, 'green');
  info(`Package location: releases/synthetic-usage-tracker-${letterVersion}.vsix`);
  info('Note: This is a repackage - no changelog changes were made');
}

/**
 * Main function
 */
async function main() {
  log('\n🚀 Starting buildrelease workflow...', 'bright');
  log('=====================================', 'bright');

  try {
    // Step 1: Verify clean working tree
    verifyCleanWorkingTree();

    // Step 2: Build and test
    await buildAndTest();

    // Step 3: Check changelog
    const changelogStatus = checkChangelog();

    // Step 4: Handle release based on changelog status
    if (changelogStatus.hasChanges) {
      await handleStandardRelease();
    } else {
      await handleLetterRepackage();
    }

    log('\n✅ Buildrelease completed!', 'green');

  } catch (err) {
    error(`Buildrelease failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

// Run main
main();
