# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Version Format Change**: Starting with v1.0.10016, this project uses extended patch numbering (X.Y.10000+)
where patch versions start at 10000 instead of 0. This is compatible with SemVer, VS Code Marketplace, and Open VSX Registry.

## Unreleased

Nothing yet


## [1.0.10024] - 2026-02-01

### Added
- Multi-key cycling functionality with manual key management
  - Add API Key command with icon $(plus)
  - Remove API Key command with icon $(trash)
  - Cycle to Next Key command with icon $(arrow-right)
  - Clear All Keys command with icon $(circle-slash)
  - Manage API Keys MAE action with icon $(key) for centralized key management
  - KeyManager integration with automatic interface updates on key changes
  - Multi-key configuration settings (enableKeyCycling, cyclingStrategy, autoCycleThreshold)
  - Manual cycling only (no auto-cycling per user request)

### Changed
- KeyManager integrated into extension.ts for multi-key support
- Updated initialize() to use KeyManager instead of ConfigurationManager
- Added handleKeysChanged() callback for automatic interface updates
- Added onKeysChanged() callback to KeyManager for change notifications
- Enhanced command menu with icons for better visual feedback
- Added Manage API Keys submenu with all key management options
- Fixed storage conflicts: Old commands (configure, eraseKey) now redirect to new KeyManager methods
- Updated showCommands() to display multi-key commands with icons
- Updated copyUsageToClipboard() to use KeyManager.getActiveKey()
- Updated showUsageDetails() to use KeyManager.getActiveKey()

### Fixed
- Fixed storage conflict: Old "Configure API Key" command was deleting multi-key collection
- Fixed storage conflict: Old "Erase API Key" command now redirects to "Clear All Keys"
- Fixed command display: "Show Commands" now shows all multi-key commands with icons
- Fixed method calls: Updated all methods to use KeyManager instead of configManager for key operations
- Fixed key forgetting: All API key operations now use KeyManager storage properly


## [1.0.10023] - 2026-01-31

### Fixed
- Fixed CHANGELOG version numbering to predict next version BEFORE bumping
- Changed update-changelog-for-release.js to increment patch version from package.json
- Updated docs to clarify version prediction workflow ensures CHANGELOG matches .vsix package


## [1.0.10022] - 2026-01-31

### Changed
- Fixed CHANGELOG versioning to properly display version 1.0.10022
- Added version badge link in README.md pointing to CHANGELOG.md
- Updated README.md to display current version (1.0.10022)
- Removed duplicate version entry in CHANGELOG that was causing confusion
- Cleaned up CHANGELOG structure to match package.json version

## [1.0.10021] - 2026-01-31

### Fixed
- Fixed API key tooltip to properly display mask with dots (•) and last 4 characters
- Tooltip now shows format like `syn_••••••••••••x789` for proper identification
- Cached config to preserve API key during tooltip restoration
- Fixed package.json buildrelease script to remove manual git tag creation (npm version patch creates it automatically)

### Added
- Created automated changelog update script (scripts/update-changelog-for-release.js)
- Enhanced buildrelease workflow with complete 10-step automated process

### Changed
- Buildrelease workflow now automates entire release cycle:
  * Update CHANGELOG (moves Unreleased to version header)
  * Commit CHANGELOG
  * Update project memory
  * Commit memory
  * Bump version (npm version patch)
  * Push commits and tags to remote
  * Compile TypeScript
  * Package extension (.vsix)
  * Move to releases/ directory
- Updated agents.md and agents.min.md with comprehensive build documentation
- Cleaned README.md by removing development sections (moved to agents files)
- Updated project memory with buildrelease workflow learnings

## [1.0.10020] - 2026-01-31

### Removed
- Removed unimplemented multi-key commands from command palette (Add API Key, Remove API Key, Select Active Key, Cycle to Next Key, List All API Keys, Reset Key Statistics)
- Removed unused multi-key configuration settings (enableKeyCycling, cyclingStrategy, autoCycleThreshold)

### Fixed
- Fixed API key masking to use consistent longform format with variable asterisks across all displays (tooltip, popup, copy message)
- All displays now show format like `syn_******************x7b9` where asterisks vary based on key length

### Changed
- Copy to clipboard now exactly matches popup view with ASCII progress bars and time remaining for each category
- Usage-related commands (Refresh, Show Details, Copy, Clear) only appear in command palette when API key is configured
- "Show Commands" menu now shows context-appropriate commands based on API key configuration status

## [1.0.10019] - 2026-01-31

### Fixed
- Fixed typo in memory update script (replaced latestTag reference with previousTag)
- Improved memory update script to handle cases with no previous tags gracefully

## [1.0.10018] - 2026-01-31

### Added
- Git commit step added to buildrelease workflow to commit docs/MEMORY.md updates
- Memory updates are now committed before compilation and packaging

### Fixed
- Fixed tag detection in memory update script to correctly skip the npm version patch tag
- Script now identifies the actual previous release tag for change analysis

### Changed
- Buildrelease workflow now: npm version patch → update memory → commit memory → compile → package → move to releases/
- Improved version detection logic to handle extended versioning format correctly

## [1.0.10017] - 2026-01-31

### Added
- Buildrelease memory update script (scripts/update-memory-for-release.js)
- Automatic analysis of git changes since last release
- Categorization of changes: source files, docs, tests, config, scripts
- Automatic sub-task entry generation in docs/MEMORY.md
- Automatic Current Focus section update with release summary

### Changed
- buildrelease workflow now updates project memory before building .vsix
- Memory updates contain factual verification of changes made since last release
- Change notes document actual files modified in each release

## [1.0.10016] - 2026-01-31

### Changed
- Migrated from standard SemVer (X.Y.Z) to extended patch numbering (X.Y.10000+)
- Version format: v1.0.15 → v1.0.10016 (10000 + 16 = 10016)
- Confirmed compatibility with VS Code Marketplace and Open VSX Registry
- All existing functionality preserved, only version format changed

### Fixed
- Removed auto-popup of usage details on extension launch and after setting API key
- Clear API Key command now clears tooltip for 2 seconds to provide clear visual feedback
- Refresh button in usage details popup now reloads data instead of closing the popup
- Show Commands prevents tooltip updates for 5 seconds then restores with current data

### Added
- Configurable tooltip clearing system with delays: 500ms (default), 2s (clear key), 5s (show commands)
- Tooltip update prevention system to block updates during specified time periods
- Automatic tooltip restoration with current data after timeout periods
- Helper method for quick tooltip clearing with optional prevent-update flag

### Documentation
- Added decision-logic comments explaining tooltip restoration behavior
- Documented tooltip prevention system in UsageIndicator class
- Updated CHANGELOG.md with version format change documentation

## [1.0.15] - 2026-01-31

### Added
- Enhanced error handling for API key issues - clicking the status bar in an error state now prompts users to enter a new API key with contextual guidance
- Error state tracking to distinguish between authentication errors and no subscription errors
- Custom prompt messages for API key input when errors occur
- New `NoSubscription` error type to handle accounts without subscription data
- Clear "Please Set Key" message displayed when API key is erased, with full cache clearing

### Fixed
- Status bar now properly clears cache and displays "Please Set Key" after erasing API key
- Improved Network error message to explicitly mention checking internet connection for better offline handling guidance
- Fixed handling of empty API responses for accounts without subscription data - now displays "No subscription data detected. Please check your Synthetic.new account."
- Retry logic now skips retries for NoSubscription errors since account state won't change

## [1.0.13] - 2026-01-25

### Changed
- Removed config schema and refactored documentation structure

### Fixed
- Fixed incorrect organization references in README.md - replaced "zai-org" with "Ellipsis" in all VSCode Marketplace and Open VSX references, and "AppliedEllipsis" for GitHub references. Fixed 7 total references including: badge URLs (version, install count, rating), installation commands, and Open VSX registry links

## [1.0.12] - 2026-01-25

### Added
- Screenshots and documentation additions to README
- VSX Marketplace badges for Open VSX registry
- Comprehensive AGENTS.md development guide

### Changed
- Updated configuration for API endpoint and thresholds
- Improved documentation structure and organization
- Refactored configuration schema documentation

### Fixed
- Various issues and improvements

## [1.0.11] - 2026-01-25

### Added
- New features and improvements

### Changed
- Updated functionality

### Fixed
- Bug fixes and enhancements

## [1.0.9] - 2026-01-25

### Added
- Additional functionality
- Publisher identity updates across package and documentation

## [1.0.8] - 2026-01-25

### Added
- Core features implemented
- Improved setup flow and documentation

## [1.0.7] - 2026-01-25

### Added
- Feature additions
- Fixed script escaping and updated documentation

## [1.0.6] - 2026-01-25

### Added
- Initial features
- Buildrelease workflow and documentation
- Improved cache control and code safety
- Cleaned up assets and improved tooltips
- Added dedicated loading icon for status bar

---

[Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
[Semantic Versioning](https://semver.org/spec/v2.0.0.html)
