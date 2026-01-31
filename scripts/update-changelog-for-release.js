#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Find the project root
const projectRoot = path.resolve(__dirname, '..');

console.log('📝 Updating CHANGELOG for release...');

// Read package.json to get current version, then predict next patch version
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const currentVersion = packageJson.version;

// Predict next patch version by incrementing the last part
const versionParts = currentVersion.split('.').map(Number);
versionParts[2]++; // Increment patch version
const predictedVersion = versionParts.join('.');
const version = predictedVersion;

// Read CHANGELOG.md
const changelogPath = path.join(projectRoot, 'CHANGELOG.md');
const changelogContent = fs.readFileSync(changelogPath, 'utf8');

// Check if there's actually content in the "Unreleased" section
const unreleasedMatch = changelogContent.match(/## Unreleased\s*\n([\s\S]*?)(?=\n##\[|$)/);

if (!unreleasedMatch) {
  console.error('❌ Could not find "Unreleased" section in CHANGELOG.md');
  process.exit(1);
}

const unreleasedContent = unreleasedMatch[1].trim();

// Remove "Nothing yet" variation
const cleanedUnreleased = unreleasedContent
  .replace(/^Nothing yet\.?\s*$/mi, '')
  .replace(/^\s*[\r\n]+/, '')
  .trim();

if (!cleanedUnreleased) {
  console.log('⚠️  Unreleased section is empty or only contains "Nothing yet"');
  console.log('   Skipping changelog update - no changes to document');
  process.exit(0);
}

console.log(`📋 Found changes in Unreleased section for predicted version ${version}`);

// Get current date in ISO 8601 format (YYYY-MM-DD)
const today = new Date().toISOString().split('T')[0];

// Create the new version section
const newVersionSection = `
## [${version}] - ${today}

${cleanedUnreleased}
`;

// Replace the Unreleased section with the new version section and add a new empty Unreleased section
const updatedChangelog = changelogContent.replace(
  /## Unreleased\s*\n[\s\S]*?(?=\n##\[|$)/,
  `## Unreleased

Nothing yet

${newVersionSection}`
);

// Write back to CHANGELOG.md
fs.writeFileSync(changelogPath, updatedChangelog);

console.log(`✓ Updated CHANGELOG.md with version ${version} (dated ${today})`);
console.log('✓ Added new empty "Unreleased" section for next release');
console.log('');

// Verify the update
const updatedContent = fs.readFileSync(changelogPath, 'utf8');
const hasNewSection = updatedContent.includes(`## [${version}]`);
const hasNewUnreleased = updatedContent.includes('## Unreleased\n\nNothing yet');

if (hasNewSection && hasNewUnreleased) {
  console.log('✨ CHANGELOG update verified successfully');
} else {
  console.error('❌ CHANGELOG update verification failed');
  process.exit(1);
}
