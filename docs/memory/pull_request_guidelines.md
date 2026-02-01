# Pull Request Guidelines

This guide outlines best practices for creating and managing pull requests in the Synthetic Usage Tracker project.

## PR Workflow

### Creating a PR

1. **Fork and Branch**
   ```bash
   # Fork the repository on GitHub
   git clone https://github.com/YOUR_USERNAME/synthetic-usage-tracker.git
   cd synthetic-usage-tracker
   git remote add upstream https://github.com/AppliedEllipsis/synthetic-usage-tracker.git
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Follow development workflow in [`../development.md`](../development.md)
   - Write tests for new functionality
   - Run linting: `npm run lint`
   - Run tests: `npm run test`
   - Compile: `npm run compile`

3. **Commit with Enhanced Conventional Commits**
   - Use format from [`git_commit_format.md`](git_commit_format.md)
   - Include emoji and summary prefix
   - Write descriptive commit messages

   ```bash
   git add .
   git commit -m "~ [ add new feature ]:

   ✨ feat(ui): add progress bars to tooltip

   - implement ASCII progress bars for usage types
   - show percentage to right of each bar
   - color-code thresholds (green, yellow, red)
   ```

4. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Go to GitHub and click "New Pull Request"
   - Target branch: `main` (or appropriate base branch)
   - Fill out PR template (see below)

### PR Template

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
- [ ] ESLint passes (`npm run lint`)
- [ ] TypeScript compiles (`npm run compile`)

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

## PR Review Process

### For Reviewers

1. **Automated Checks**
   - CI/CD pipeline must pass
   - All tests must pass
   - Linting must pass
   - Code coverage threshold must be met

2. **Code Review Checklist**
   - [ ] Code follows project conventions
   - [ ] TypeScript types are correct
   - [ ] Error handling is appropriate
   - [ ] Tests are adequate
   - [ ] Documentation is updated
   - [ ] No security vulnerabilities
   - [ ] Performance considerations made
   - [ ] Decision-logic comments present for non-obvious code

3. **Review Feedback Guidelines**
   - Be constructive and specific
   - Explain why changes are requested
   - Acknowledge good work
   - Suggest improvements, don't just point out problems
   - Use "Nit", "Minor", and "Major" labels for severity

4. **Approval Criteria**
   - At least one maintainer approval
   - All reviewer comments addressed
   - Automated checks passing
   - No merge conflicts

### For Contributors

1. **Respond to Reviews**
   - Address all reviewer comments
   - Push updates to the same branch
   - Mark comments as "Done" when addressed
   - Ask questions if feedback is unclear

2. **Updating Your PR**
   ```bash
   # Make additional changes
   git add .
   git commit -m "~ [ address review feedback ]:

   🐛 fix(config): handle edge case in config parsing

   - fix null reference in config update
   - add validation for edge case
   "

   # Push to same branch
   git push origin feature/your-feature-name
   ```

3. **Rebase If Needed**
   ```bash
   # Fetch latest changes from upstream
   git fetch upstream

   # Rebase your branch on latest main
   git rebase upstream/main

   # Resolve conflicts if any
   # Push with force flag
   git push origin feature/your-feature-name --force-with-lease
   ```

## Best Practices

### Before Submitting

1. **Keep PRs Focused**
   - One feature or bug fix per PR
   - Small, reviewable changes (ideally < 400 lines)
   - Easier to review and merge

2. **Write Good Descriptions**
   - Explain "what" and "why"
   - Include screenshots for UI changes
   - Link to related issues
   - Document breaking changes clearly

3. **Clean Up Commits**
   - Squash fix-up commits
   - Keep commit history meaningful
   - Use interactive rebase: `git rebase -i HEAD~n`

4. **Test Thoroughly**
   - Test in multiple scenarios
   - Consider edge cases
   - Test cross-platform if applicable
   - Verify no regressions

### During Review

1. **Be Patient**
   - Allow time for reviewers
   - Avoid "pinging" unless PR is stale (7+ days)
   - Be responsive to feedback

2. **Use Draft PRs**
   - Mark as "Draft" for work in progress
   - Request early feedback on design/architecture
   - Convert to ready when complete

3. **Label Appropriately**
   - Add labels for categorization
   - Examples: `bug`, `enhancement`, `documentation`, `breaking-change`
   - Helps with triaging and prioritization

## Merging

### Maintainer Guidelines

1. **Rebase Before Merge**
   ```bash
   # Checkout main
   git checkout main
   git pull upstream main

   # Merge and rebase
   git merge --no-ff feature/your-feature-name
   git rebase -i HEAD~n  # Squash if needed
   ```

2. **Squash Commits**
   - Use "Squash and merge" for non-trivial PRs
   - Combine related commits into meaningful units
   - Preserve authorship of original contributor

3. **Merge Methods**
   - **Create merge commit**: `git merge --no-ff`
   - **Squash and merge**: Best for most PRs
   - **Rebase and merge**: For linear history, careful with shared branches

4. **Delete Branch After Merge**
   ```bash
   # Delete local branch
   git branch -d feature/your-feature-name

   # Delete remote branch
   git push origin --delete feature/your-feature-name
   ```

5. **Update Changelog**
   - Update `CHANGELOG.md` with merged changes
   - Follow changelog format conventions
   - Include PR number in changelog entry

## Troubleshooting

### Common Issues

**Merge Conflicts**
```bash
# Resolve conflicts during rebase
git rebase upstream/main

# Fix conflicts in files
git add <resolved-files>
git rebase --continue

# If rebase fails, abort and try again
git rebase --abort
git fetch upstream
git rebase upstream/main
```

**PR Cannot Be Updated**
- Check if you're on the correct branch
- Verify you have push access to the fork
- Ensure branch name matches PR source branch

**Automated Checks Failing**
- Check CI logs for specific errors
- Fix linting errors: `npm run lint:fix`
- Fix test failures: `npm run test`
- Push fixes to trigger CI again

## Security Considerations

- **Never commit secrets**: API keys, tokens, credentials
- **Review sensitive data**: Ensure no PII in logs
- **Check dependencies**: Review security updates in package.json
- **Validate inputs**: Sanitize all user inputs
- **Follow OWASP guidelines**: For web-facing code

## Resources

- [GitHub Pull Requests Guide](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- Project-specific guides:
  - [`../development.md`](../development.md) - Development workflow
  - [`../git_commit_format.md`](git_commit_format.md) - Commit message format
  - [`../../agents.md`](../../agents.md) - Agent development guide
