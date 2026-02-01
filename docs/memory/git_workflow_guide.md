# Enhanced Git Workflow Guide

This guide provides best practices for git operations, branching strategies, and collaboration workflows in the Synthetic Usage Tracker project.

## Branching Strategy

### Branch Types

```bash
# Main branches (long-lived)
main              # Production-ready code
develop            # Integration branch for features

# Feature branches (short-lived)
feature/feature-name      # New features
enhancement/feature-name  # Enhancements to existing features

# Bug fix branches (short-lived)
bugfix/issue-description  # Bug fixes
hotfix/critical-issue     # Urgent production fixes

# Release branches (for versioning)
release/v1.0.23           # Prepare for release
hotfix/v1.0.24           # Production hotfix
```

### Branch Lifecycle

1. **Feature Branch Workflow**
   ```bash
   # Start from develop or latest main
   git checkout develop
   git pull origin develop

   # Create feature branch
   git checkout -b feature/add-progress-bars

   # Work on feature
   # Make commits with enhanced conventional format
   git commit -m "~ [ add progress bars ]:

   ✨ feat(ui): add progress bars to tooltip

   - implement ASCII progress bars for usage types
   - show percentage to right of each bar
   "

   # Push to remote
   git push origin feature/add-progress-bars

   # Create PR (target: develop)
   # PR will be reviewed and merged
   ```

2. **Hotfix Workflow** (urgent production fix)
   ```bash
   # Create hotfix from main
   git checkout main
   git pull origin main
   git checkout -b hotfix/critical-bug

   # Fix the issue
   # Make commit
   git commit -m "~ [ fix critical bug in prod ]:

   🐛 fix(auth): prevent crash on invalid API key

   - add null check before key validation
   - return empty config instead of throwing error
   "

   # Push and create PR (target: main)
   git push origin hotfix/critical-bug

   # PR reviewed and merged quickly
   ```

3. **Release Workflow**
   ```bash
   # Create release branch from develop
   git checkout develop
   git checkout -b release/v1.0.23

   # Update CHANGELOG
   # Bump version in package.json
   # Run tests
   npm run test

   # Merge to main
   git checkout main
   git merge --no-ff release/v1.0.23

   # Tag release
   git tag -a v1.0.23 -m "Release v1.0.23"

   # Merge back to develop
   git checkout develop
   git merge --no-ff release/v1.0.23

   # Push tags and branches
   git push origin main develop --tags
   ```

## Commit Best Practices

### Enhanced Conventional Commit Format

Follow format from [`git_commit_format.md`](git_commit_format.md):

```
~ [ short up to 8 word summary ]:

<emoji> <type>(<scope>): <subject>

<body>

<footer>
```

### Commit Message Examples

**Feature Addition**
```bash
~ [ add two-factor authentication ]:

✨ feat(auth): add two-factor authentication support

- implement 2FA check in login flow
- return requiresTwoFactor flag when 2FA is enabled
- maintain backward compatibility for existing users
```

**Bug Fix**
```bash
~ [ fix email validation regex pattern ]:

🐛 fix(validation): fix email validation for single-char domains

- update regex to require minimum 2 characters for domain extension
- prevents false positives for invalid emails like user@domain.a
```

**Breaking Change**
```bash
~ [ change user api response structure ]:

✨ feat(api): enhance user endpoint with metadata

- include user metadata in getUser response
- wrap user data in structured response object

BREAKING CHANGE: getUser now returns { user, metadata } instead of User object directly
```

**Refactoring**
```bash
~ [ extract common validation logic ]:

♻️ refactor(utils): extract common validation to shared module

- move email and phone validation to validators.ts
- update all modules to use shared validators
- reduce code duplication by 40%
```

### Commit Discipline

**Do:**
- Make atomic commits (one logical change per commit)
- Write clear, descriptive commit messages
- Use present tense in summary
- Explain "what" and "why" in body
- Reference issues in footer

**Don't:**
- Commit whitespace or formatting changes separately
- Use generic messages like "update code" or "fix stuff"
- Mix multiple unrelated changes in one commit
- Commit large binary files
- Commit sensitive data (API keys, secrets)

## Rebase vs Merge

### When to Use Rebase

**Use Rebase:**
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

### When to Use Merge

**Use Merge:**
- Merging PR into main/develop
- Preserving history of integration
- When PR should appear as single commit

```bash
# Squash and merge PR (for clean history)
git checkout main
git merge --squash --no-ff feature/add-progress-bars

# Create merge commit with PR description
```

### Interactive Rebase

**For Cleaning Up History:**

```bash
# Interactive rebase last 3 commits
git rebase -i HEAD~3

# Commands available:
# pick  = use commit
# reword  = use commit, but edit commit message
# edit  = use commit, but stop for amending
# squash  = combine with previous commit
# fixup  = like squash, but discard commit message
# exec  = run command (useful for fixes)
# drop  = remove commit

# Example:
pick 123abc ~ [ add login page ]:
reword 456def ~ [ fix login bug ]:
squash 789ghi ~ [ add logout button ]:

# Result: Single commit with combined changes
```

## Collaboration Workflows

### Code Review Process

1. **Before Creating PR**
   ```bash
   # Ensure you're on correct branch
   git branch  # Should show feature/your-feature

   # Sync with upstream
   git fetch upstream
   git rebase upstream/main

   # Run tests
   npm run lint
   npm run test
   npm run compile

   # Push changes
   git push origin feature/your-feature
   ```

2. **Creating Effective PRs**
   - Use descriptive title: `feat(ui): add progress bars to tooltip`
   - Write clear description explaining what and why
   - Include screenshots for UI changes
   - Link to related issues: `Closes #123`
   - Add appropriate labels (bug, enhancement, documentation)
   - Fill out PR template completely

3. **Addressing Review Feedback**
   ```bash
   # Make changes based on feedback
   # Commit to same branch
   git add .
   git commit -m "~ [ address review feedback ]:

   🐛 fix(config): handle edge case in config parsing

   - fix null reference in config update
   - add validation for edge case
   "

   # Force push to same PR branch
   git push origin feature/your-feature --force-with-lease
   ```

### Handling Conflicts

**When Conflicts Occur:**

```bash
# 1. Fetch latest changes
git fetch upstream
git rebase upstream/main

# 2. Conflicts will appear
CONFLICT (content): src/config/configuration.ts
Auto-merging src/extension.ts
Automatic merge failed; fix conflicts and then commit the result.

# 3. Open conflicting files
# Files will show conflict markers:
<<<<<<< HEAD
Your changes
=======
Upstream changes
>>>>>>> upstream/main

# 4. Resolve conflicts manually
# Edit file to keep correct changes
# Remove conflict markers

# 5. Stage resolved files
git add src/config/configuration.ts

# 6. Continue rebase
git rebase --continue

# 7. If more conflicts, repeat steps 2-6

# 8. When complete, verify tests still pass
npm run test

# 9. Force push to your branch
git push origin feature/your-feature --force-with-lease
```

### Managing Multiple PRs

**When Working on Multiple Features:**

```bash
# Create separate branches
git checkout develop
git checkout -b feature/feature-a
git checkout develop
git checkout -b feature/feature-b

# Keep PRs small and focused
# One feature per PR
# Easier to review and merge
```

**When PR Depends on Another:**

```bash
# Use GitHub's "Required reviewers" to indicate dependency
# Or add to PR description:
"This PR depends on #123 - please review and merge that first"

# Once dependent PR is merged:
# Rebase your branch on latest main
git checkout feature/feature-b
git fetch upstream
git rebase upstream/main
git push origin feature/feature-b --force-with-lease
```

## Best Practices

### For Individual Contributors

1. **Keep Branches Updated**
   ```bash
   # Daily sync with upstream
   git fetch upstream
   git checkout develop
   git pull upstream develop

   # Rebase feature branches
   git checkout feature/your-feature
   git rebase upstream/develop
   ```

2. **Write Good Commit Messages**
   - Read before committing: `git diff --cached`
   - Make changes small and focused
   - Use conventional commit format
   - Include issue references

3. **Test Before Pushing**
   ```bash
   # Run full test suite
   npm run lint
   npm run test
   npm run compile

   # Only push if all pass
   git push origin feature/your-feature
   ```

4. **Clean Up After Merging**
   ```bash
   # Delete local branch after merge
   git branch -d feature/your-feature

   # Delete remote branch after merge
   git push origin --delete feature/your-feature

   # Clean up stale branches
   git remote prune origin
   ```

### For Maintainers

1. **Review PRs Promptly**
   - Set expectations on response time (24-48 hours)
   - Provide constructive, specific feedback
   - Use "Request Changes" for necessary fixes
   - Use "Approve" for ready-to-merge

2. **Merge Strategy**
   - Use squash merge for most PRs
   - Preserve authorship in merge commit
   - Update CHANGELOG on merge to main
   - Create release tag for version bumps

3. **Handle Stale PRs**
   ```bash
   # Mark as stale after 14 days of no activity
   # Comment to prompt for updates
   # Close after 30 days if no response
   ```

## GitHub CLI (gh) Best Practices

### Common gh Commands

**View PRs**
```bash
# List all PRs
gh pr list

# View specific PR
gh pr view 123

# Check PR status
gh pr checks 123
```

**Create PR from CLI**
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

**Manage PRs**
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

## Troubleshooting

### Common Issues

**Push Rejected Due to Branch Protection**
```bash
# Solution: Rebase on latest main
git fetch upstream
git checkout feature/your-feature
git rebase upstream/main
git push origin feature/your-feature --force-with-lease
```

**Cannot Fast-Forward**
```bash
# Solution: Use --no-ff to create merge commit
git merge --no-ff feature/your-feature
```

**Lost Commits**
```bash
# Solution: Use reflog to recover
git reflog

# Find lost commit hash
# Checkout lost commit
git checkout <commit-hash>

# Create new branch from it
git checkout -b recovered-branch

# Push to remote
git push origin recovered-branch
```

**Large File in History**
```bash
# Solution: Use BFG Repo-Cleaner (better than git filter-branch)
# Or use git filter-repo for more recent versions
git filter-repo --path path/to/large/file --force
```

## Resources

- [Pro Git](https://git-scm.com/book/en/v2/)
- [GitHub CLI Manual](https://cli.github.com/manual/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- Project-specific guides:
  - [`pull_request_guidelines.md`](pull_request_guidelines.md) - PR workflow
  - [`git_commit_format.md`](git_commit_format.md) - Commit message format
