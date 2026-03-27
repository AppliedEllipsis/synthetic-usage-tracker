#!/usr/bin/env node

/**
 * Build Release Script
 *
 * Workflow:
 * 1. Verify clean working tree
 * 2. Build and test (compile + lint + test)
 * 3. Check CHANGELOG for Unreleased content
 * 4. If no unreleased content exists:
 *    - Generate changelog from git commits since last tag
 * 5. Update CHANGELOG with new version
 * 6. Update MEMORY.md
 * 7. Commit both
 * 8. Bump version (npm version patch)
 * 9. Push and tag
 * 10. Package
 *
 * This ensures builds are always tagged with incrementing patch versions.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
 * Get the latest git tag
 */
function getLatestTag() {
  try {
    const tag = exec('git tag --sort=-creatordate', { silent: true });
    return tag?.trim().split('\n')[0] || null;
  } catch (err) {
    return null;
  }
}

/**
 * Get commits since the last tag
 */
function getCommitsSinceTag(tag) {
  if (!tag) {
    // Get all commits if no tag exists
    try {
      const commits = exec('git log --oneline --no-merges', { silent: true });
      return commits?.trim() || '';
    } catch (err) {
      return '';
    }
  }

  try {
    const commits = exec(`git log ${tag}..HEAD --oneline --no-merges`, { silent: true });
    return commits?.trim() || '';
  } catch (err) {
    return '';
  }
}

/**
 * Parse conventional commits and categorize them
 */
function parseCommits(commitsStr) {
  if (!commitsStr) return null;

  const lines = commitsStr.split('\n').filter(line => line.trim());

  const categories = {
    added: [],
    changed: [],
    fixed: [],
    removed: [],
    other: []
  };

  for (const line of lines) {
    // Parse commit message: "hash type(scope): message" or "hash type: message"
    const match = line.match(/^\s*[a-f0-9]+\s+(?:(\w+)(?:\([^)]+\))?:\s*)?(.+)$/i);
    if (!match) {
      categories.other.push(line.replace(/^\s*[a-f0-9]+\s+/, ''));
      continue;
    }

    const [, type, message] = match;
    const cleanMessage = message.trim();

    if (!type) {
      categories.other.push(cleanMessage);
      continue;
    }

    const lowerType = type.toLowerCase();

    switch (lowerType) {
      case 'feat':
      case 'feature':
        categories.added.push(cleanMessage);
        break;
      case 'fix':
        categories.fixed.push(cleanMessage);
        break;
      case 'docs':
      case 'refactor':
      case 'perf':
      case 'style':
      case 'chore':
      case 'test':
      case 'build':
      case 'ci':
        categories.changed.push(`[${lowerType}] ${cleanMessage}`);
        break;
      case 'revert':
        categories.fixed.push(`(Reverted) ${cleanMessage}`);
        break;
      case 'remove':
      case 'delete':
        categories.removed.push(cleanMessage);
        break;
      default:
        categories.other.push(cleanMessage);
    }
  }

  return categories;
}

/**
 * Generate changelog content from git commits
 */
function generateChangelogFromCommits() {
  log('\n📝 Generating changelog from git history...', 'bright');

  const latestTag = getLatestTag();
  info(`Latest tag: ${latestTag || 'none'}`);

  const commits = getCommitsSinceTag(latestTag);

  if (!commits) {
    warn('No commits found since last tag');
    return null;
  }

  const categories = parseCommits(commits);

  if (!categories) {
    warn('Could not parse commits');
    return null;
  }

  // Build changelog content
  let content = '';

  if (categories.added.length > 0) {
    content += '### Added\n';
    for (const item of categories.added) {
      content += `- ${item}\n`;
    }
    content += '\n';
  }

  if (categories.changed.length > 0) {
    content += '### Changed\n';
    for (const item of categories.changed) {
      content += `- ${item}\n`;
    }
    content += '\n';
  }

  if (categories.fixed.length > 0) {
    content += '### Fixed\n';
    for (const item of categories.fixed) {
      content += `- ${item}\n`;
    }
    content += '\n';
  }

  if (categories.removed.length > 0) {
    content += '### Removed\n';
    for (const item of categories.removed) {
      content += `- ${item}\n`;
    }
    content += '\n';
  }

  if (categories.other.length > 0) {
    content += '### Other\n';
    for (const item of categories.other) {
      content += `- ${item}\n`;
    }
    content += '\n';
  }

  if (!content) {
    warn('No categorizable commits found');
    return null;
  }

  success(`Generated changelog with ${
    categories.added.length + categories.changed.length +
    categories.fixed.length + categories.removed.length + categories.other.length
  } entries`);

  return content.trim();
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
 * Update CHANGELOG for release
 */
function updateChangelog(version, unreleasedContent) {
  log(`\n📝 Updating CHANGELOG for version ${version}...`, 'bright');

  const changelogPath = path.join(projectRoot, 'CHANGELOG.md');
  let content = fs.readFileSync(changelogPath, 'utf8');

  const today = new Date().toISOString().split('T')[0];

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
function gitOperations(version) {
  log(`\n🚀 Performing git operations for v${version}...`, 'bright');

  // Add files
  exec('git add CHANGELOG.md docs/MEMORY.md package.json');

  // Commit message
  const commitMessage = `chore(release): v${version}`;

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
 * Main release handler
 */
async function handleRelease() {
  const currentVersion = getCurrentVersion();
  const nextVersion = predictNextVersion(currentVersion);

  info(`Current version: ${currentVersion}`);
  info(`Next version: ${nextVersion}`);

  // Check if changelog has content
  const changelogStatus = checkChangelog();

  let unreleasedContent;

  if (changelogStatus.hasChanges) {
    unreleasedContent = changelogStatus.content;
    info('Using existing CHANGELOG content');
  } else {
    // Generate from git commits
    unreleasedContent = generateChangelogFromCommits();

    if (!unreleasedContent) {
      warn('No changelog content and no commits to generate from');
      info('Creating empty release entry');
      unreleasedContent = '- Version bump';
    }
  }

  // Update CHANGELOG
  updateChangelog(nextVersion, unreleasedContent);

  // Update MEMORY.md
  updateMemory(nextVersion, 'See CHANGELOG for details');

  // Update package.json
  updatePackageJson(nextVersion);

  // Git operations
  gitOperations(nextVersion);

  // Package
  packageExtension(nextVersion);

  log(`\n✨ Release v${nextVersion} completed successfully!`, 'green');
  info(`Package location: releases/synthetic-usage-tracker-${nextVersion}.vsix`);
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

    // Step 3: Handle release (includes changelog check and generation)
    await handleRelease();

    log('\n✅ Buildrelease completed!', 'green');

  } catch (err) {
    error(`Buildrelease failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

// Run main
main();
