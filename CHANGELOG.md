# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Version Format Change**: Starting with v1.0.10016, this project uses extended patch numbering (X.Y.10000+)
where patch versions start at 10000 instead of 0. This is compatible with SemVer, VS Code Marketplace, and Open VSX Registry.

## Unreleased

Nothing yet

## [1.0.10016] - 2026-01-31

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

### Changed
- Tooltips now temporarily clear on user interactions (status bar click, set key, clear key, show commands)
- Status bar text continues to update normally even when tooltip updates are prevented
- Improved tooltip management provides cleaner UX by preventing persistent tooltips after interactions

### Documentation
- Added decision-logic comments explaining tooltip restoration behavior
- Documented tooltip prevention system in UsageIndicator class

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
