# Pull Request and Commit Format Guide

This guide documents the enhanced format for pull requests, commits, and merges - focusing on overall PR differences/merges for branches or forks.

## Enhanced Commit Format

This project uses an enhanced conventional commit format with emojis and summary prefixes.

### Format Structure

```
~ [ short up to 8 word summary ]:

<emoji> <type>(<scope>): <subject>

<body>

<footer>
```

### Components

**Summary Line (~)**:
- Maximum 8 words
- Capture essence of change
- Use present tense
- Keep it concise and clear

**Type + Emoji**:
- `feat` ✨ - New feature or functionality
- `fix` 🐛 - Bug fix or error correction
- `docs` 📝 - Documentation changes
- `style` 🎨 - Code style changes
- `refactor` ♻️ - Code refactoring
- `perf` ⚡️ - Performance improvements
- `test` ✅ - Testing changes
- `build` 📦 - Build system changes
- `ci` 🚀 - CI/CD configuration
- `chore` 🔧 - Maintenance tasks
- `revert` ⏪ - Reverting previous commits
- `i18n` 🌐 - Internationalization

**Subject**:
- Use imperative mood ("add" not "added")
- Start with lowercase letter
- No period at end
- Maximum 50 characters
- Be specific but concise

**Body**:
- Start one blank line after subject
- Use bullet points with "-"
- Maximum 72 characters per line
- Explain "what" and "why", not "how"
- Use 【】brackets for grouping different types of changes
- Focus on business impact when relevant

**Footer**:
- Start one blank line after body
- Breaking Changes: `BREAKING CHANGE: <description>`
- Issue References: `Closes #123`, `Fixes #456`
- Co-authors: `Co-authored-by: Name <email>`

### Examples

**Feature Addition**
```
~ [ add two-factor authentication ]:

✨ feat(auth): add two-factor authentication support

- implement 2FA check in login flow
- return requiresTwoFactor flag when 2FA is enabled
- maintain backward compatibility for existing users
```

**Bug Fix**
```
~ [ fix email validation regex pattern ]:

🐛 fix(validation): fix email validation for single-char domains

- update regex to require minimum 2 characters for domain extension
- prevents false positives for invalid emails like user@domain.a
```

**Breaking Change**
```
~ [ change user api response structure ]:

✨ feat(api): enhance user endpoint with metadata

- include user metadata in getUser response
- wrap user data in structured response object

BREAKING CHANGE: getUser now returns { user, metadata } instead of User object directly
```

**Multiple Changes**
```
~ [ add loading state to button component ]:

✨ feat(ui): add loading state to button component

【Component Enhancement】
- add loading prop to ButtonProps interface
- implement LoadingSpinner component for visual feedback
- conditionally render spinner when loading is true

✅ test(ui): add loading state test coverage

【Test Coverage】
- verify loading spinner renders when loading prop is true
- ensure button remains accessible during loading state
```

**Revert**
```
~ [ revert ghost button variant addition ]:

⏪ revert(ui): remove ghost button variant

- revert commit abc123f that added ghost variant
- ghost variant caused accessibility issues in production
- will be reimplemented with proper contrast ratios
```

## Pull Request Format

### PR Title

Follow enhanced conventional format:

```
<emoji> <type>(<scope>): brief description

Example: ✨ feat(ui): add progress bars to tooltip
```

### PR Body Template

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)

## Testing
- [ ] Unit tests pass locally
- [ ] Integration tests pass locally
- [ ] Manual testing completed
- [ ] ESLint passes (\`npm run lint\`)
- [ ] TypeScript compiles (\`npm run compile\`)

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review of code completed
- [ ] Commented complex logic with decision-logic comments
- [ ] Documentation updated if needed
- [ ] No merge conflicts with target branch
- [ ] Commits follow enhanced conventional commit format
- [ ] All tests pass

## Related Issues
Closes #123
```

### Best Practices for PRs

**Before Submitting**:
- Keep PRs focused: One feature or bug fix per PR
- Small, reviewable changes (ideally < 400 lines)
- Write good descriptions: Explain "what" and "why"
- Include screenshots for UI changes
- Link to related issues
- Document breaking changes clearly

**During Review**:
- Be patient: Allow time for reviewers
- Be responsive to feedback: Address all reviewer comments
- Use draft PRs: Mark as "Draft" for work in progress
- Label appropriately: Add labels (bug, enhancement, documentation, breaking-change)

**After Merging**:
- Delete branch: Remove local and remote branch after merge
- Clean up commits: Squash related commits before merging
- Update documentation: Update relevant docs if needed

## Branching vs Forking Strategies

### When You Have Write Access

**Branch-based workflow**:
```bash
# Create branch from develop or main
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# Work on feature
# Make commits with enhanced format
git commit -m "~ [ add feature ]:"

# Push and create PR
git push origin feature/your-feature-name
# PR created targeting main
```

### When Using Forks

**Fork-based workflow**:
```bash
# Fork repository on GitHub
git clone https://github.com/YOUR_USERNAME/synthetic-usage-tracker.git
cd synthetic-usage-tracker

# Add upstream remote
git remote add upstream https://github.com/AppliedEllipsis/synthetic-usage-tracker.git

# Sync with upstream
git fetch upstream
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Work on feature
# Make commits with enhanced format
git commit -m "~ [ add feature ]:"

# Push to your fork
git push origin feature/your-feature-name

# Create PR from fork
# PR will be from your fork targeting upstream main
```

### Keeping Fork in Sync

```bash
# Regularly sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Or rebase your feature branch
git checkout feature/your-feature-name
git rebase upstream/main
git push origin feature/your-feature-name --force-with-lease
```

## Merge vs Rebase Guidance

### When to Rebase

**Use Rebase**:
- Incorporating upstream changes into feature branch
- Keeping linear history
- Before creating PR to reduce merge commits
- Cleaning up commit history (squashing, reordering)

```bash
# Fetch latest from upstream
git fetch upstream

# Rebase your feature branch
git checkout feature/add-progress-bars
git rebase upstream/main

# Resolve conflicts if any
# Continue rebase
git rebase --continue
```

### When to Merge

**Use Merge**:
- Merging PR into main/develop
- Preserving history of integration
- When PR should appear as single commit

```bash
# Squash and merge PR (for clean history)
git checkout main
git merge --squash --no-ff feature/add-progress-bars

# Create merge commit with PR description
```

### Merge Commit Format for Maintainers

When merging PRs, maintain the enhanced format:

```
~ [ merge feature branch ]:

✨ feat(scope): merge feature/add-progress-bars

-合并 feature branch into main
- squash commits into single merge
- preserve original commit messages in body
```

For squash and merge:
```
~ [ squash and merge feature ]:

✨ feat(scope): squash and merge feature/add-progress-bars

- squash 3 commits from feature branch
- merge into main with single commit
- preserve authorship of original contributor
```

## Automated Tools

### Using gh CLI (GitHub CLI)

**View PRs**:
```bash
# List all PRs
gh pr list

# View specific PR
gh pr view 123

# Check PR status
gh pr checks 123
```

**Create PR from CLI**:
```bash
# Create PR with description
gh pr create --title "feat(ui): add progress bars" \
  --body "Description of changes" \
  --base main \
  --head feature/add-progress-bars

# Create PR with draft
gh pr create --title "WIP: add progress bars" \
  --body "Work in progress..." \
  --draft
```

**Manage PRs**:
```bash
# Add reviewer
gh pr edit 123 --add-reviewer username

# Add label
gh pr edit 123 --add-label enhancement

# Merge PR
gh pr merge 123 --squash --delete-branch

# Convert draft to ready
gh pr ready 123
```

## References

- [`git_commit_format.md`](git_commit_format.md) - Enhanced commit message specification
- [`docs/memory/shared-memory.md`](memory/shared-memory.md) - Shared memory pool
- [`docs/MEMORY.md`](MEMORY.md) - Query memory and task tracking
- [`AGENTS.md`](../AGENTS.md) - AI agent development guide
