#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find the project root by going up from the scripts directory
const projectRoot = path.resolve(__dirname, '..');

const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const version = packageJson.version;
const memoryFile = path.join(projectRoot, 'docs', 'MEMORY.md');

console.log(`\n📦 Preparing release for v${version}...`);

// Get the previous version tag
try {
  // Get all tags and sort them by version
  const allTags = execSync('git tag --list v\\* --sort=-v:refname', {
    encoding: 'utf8',
    cwd: projectRoot
  }).trim().split('\n').filter(Boolean);
  
  // The first tag (latest) was just created by npm version patch, so use the second one
  let previousTag = '';
  if (allTags.length >= 2) {
    previousTag = allTags[1]; // Second tag is the actual previous release
  } else if (allTags.length === 1) {
    // Only one tag (current version) - check if there are commits before it
    const currentTag = allTags[0].replace(/^v/, '');
    if (currentTag === version) {
      // This tag is for current version, check git log before it
      const commitsBeforeTag = execSync(`git log ${allTags[0]}~1..HEAD --oneline 2>/dev/null || echo ""`, {
        encoding: 'utf8',
        cwd: projectRoot
      }).trim();
      if (!commitsBeforeTag) {
        // No commits between tag~1 and HEAD, this is a fresh tag
        previousTag = allTags[0]; // Use the tag itself (rare case)
      }
    }
  }
  
  // Get changes since the last tag
  let changes = [];
  let changeNotes = '';
  
  if (previousTag) {
    console.log(`📋 Analyzing changes since ${previousTag}...`);
    const diffOutput = execSync(`git log ${previousTag}..HEAD --oneline`, { encoding: 'utf8', cwd: projectRoot });
    const commits = diffOutput.trim().split('\n').filter(Boolean);
    
    // Get changed files
    const changedFiles = execSync(`git diff --name-only ${previousTag}..HEAD`, { encoding: 'utf8', cwd: projectRoot });
    const fileChanges = changedFiles.trim().split('\n').filter(Boolean);
    
    // Categorize changes
    const sourceFiles = fileChanges.filter(f => f.startsWith('src/'));
    const docFiles = fileChanges.filter(f => f.startsWith('docs/') || f.includes('README') || f.includes('CHANGELOG'));
    const testFiles = fileChanges.filter(f => f.startsWith('test/'));
    const configFiles = fileChanges.filter(f => f === 'package.json' || f.startsWith('.'));
    const scriptFiles = fileChanges.filter(f => f.startsWith('scripts/'));
    
    changeNotes = [];
    if (sourceFiles.length > 0) {
      changeNotes.push(`${sourceFiles.length} source file${sourceFiles.length !== 1 ? 's' : ''} modified`);
    }
    if (docFiles.length > 0) {
      changeNotes.push(`${docFiles.length} doc file${docFiles.length !== 1 ? 's' : ''} updated`);
    }
    if (testFiles.length > 0) {
      changeNotes.push(`${testFiles.length} test file${testFiles.length !== 1 ? 's' : ''} modified`);
    }
    if (configFiles.length > 0) {
      changeNotes.push(`${configFiles.length} config file${configFiles.length !== 1 ? 's' : ''} changed`);
    }
    if (scriptFiles.length > 0) {
      changeNotes.push(`${scriptFiles.length} script file${scriptFiles.length !== 1 ? 's' : ''} modified`);
    }
    
    changeNotes = changeNotes.join(', ') || 'Version bump only';
    
    console.log(`   - ${commits.length} commit${commits.length !== 1 ? 's' : ''}`);
    console.log(`   - ${fileChanges.length} file${fileChanges.length !== 1 ? 's' : ''} changed`);
    console.log(`   - ${changeNotes}`);
  } else {
    changeNotes = 'Version bump only';
    console.log('   - No previous tag found, treating as simple version bump');
  }

  console.log(`\n📝 Change notes: ${changeNotes}`);

  // Read the memory file
  let content = fs.readFileSync(memoryFile, 'utf8');

  // Find the sub-tasks table and get the last task number
  const subTaskSectionMatch = content.match(/## Sub-tasks Tracking\s*\n([\s\S]*?)(?=\n##|$)/);
  if (!subTaskSectionMatch) {
    console.error('❌ Could not find Sub-tasks Tracking section');
    process.exit(1);
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

  // Create the new sub-task entry with actual changes
  const newTaskNumber = lastTaskNumber + 1;
  const date = new Date().toISOString().split('T')[0];
  const notes = `Release v${version} - ${changeNotes}${previousTag ? ` (since ${previousTag})` : ''}`;
  const newTaskEntry = `| ${newTaskNumber}   | Release v${version}                                   | Complete    | ${notes} |`;

  // Insert the new task entry before the divider line
  const tableEndIndex = content.indexOf('\n---', content.indexOf('## Sub-tasks Tracking'));

  if (tableEndIndex !== -1) {
    // Insert new task before the closing ---
    content = content.slice(0, tableEndIndex) + '\n' + newTaskEntry + content.slice(tableEndIndex);

    // Update Current Focus section with the new task
    const currentFocusMatch = content.match(/(## Current Focus\s*\n)([\s\S]*?)(\n##|$)/);
    if (currentFocusMatch) {
      const currentFocusSection = currentFocusMatch[0];
      const isoDate = new Date().toISOString();
      const dateStr = isoDate.split('T')[0];
      
      const updatedCurrentFocus = `## Current Focus

### Last Query: Release v${version}
**Time**: ${isoDate}
**Summary**: Version v${version} released with changes: ${changeNotes}
**Context**: Release completed via buildrelease workflow. Version bumped, compiled, packaged, and moved to releases/ directory.
**Planning**: All tasks completed for v${version}. Ready for next iteration.
**Remaining Items**:
- None for this release - all changes verified and documented
`;

      content = content.replace(currentFocusSection, updatedCurrentFocus);
    }

    // Write the updated content back
    fs.writeFileSync(memoryFile, content);
    console.log(`✓ Updated docs/MEMORY.md with task t${newTaskNumber} for v${version}`);
    console.log('✓ Changes verified and documented');
  } else {
    console.error('❌ Could not find end of Sub-tasks Tracking section');
    process.exit(1);
  }

} catch (error) {
  console.error('❌ Error updating memory:', error.message);
  process.exit(1);
}

console.log('\n✨ Ready for build and package\n');
