# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.8] - 2026-01-25

### Added
- API key erase command to allow users to remove stored API key
- First-launch setup prompt for API key configuration
- "Please Set Key" status when API key is explicitly set to "none"
- Screenshots section to README with status bar, warning, and details views
- Comprehensive documentation index and links in README
- VSCode launch configuration for extension debugging (`.vscode/launch.json`)
- Detailed debugging guide with common scenarios and solutions

### Changed
- Improved tooltip formatting with better visual separators
- Updated icon definitions to use object syntax format
- Improved command categorization in package.json
- Enhanced setup flow with better user onboarding

### Removed
- Refresh keys command and related functionality

## [1.0.7] - 2026-01-25

### Fixed
- Resolved filename escaping in release script for PowerShell commands
- Ensured Move-Item handles versioned filenames correctly

### Changed
- Added build release process documentation to README
- Documented buildrelease command workflow
- Explained version increment and packaging steps
- Added referral link for synthetic.new promotion

## [1.0.6] - 2026-01-25

### Changed
- Moved icon files from project root to image/icon/ directory
- Updated package.json to reference new icon path
- Updated README.md to reference icon_128

## [1.0.5] - 2026-01-25

### Changed
- Version bump to 1.0.5

## [1.0.4] - 2026-01-25

### Fixed
- Fixed status bar tooltip to show detailed usage information on hover

## [Unreleased]

### Added
- Screenshots section to README with visual documentation of extension features
- Documentation section to README linking all project documentation files
- Links to Architecture, API Reference, Development Guide, Installation Guide, Troubleshooting, and CHANGELOG

## [1.0.3] - 2026-01-25

### Added
- Added icon.png for extension marketplace display
- Added icon-bw.png for status bar icon display

## [1.0.1] - 2025-01-25

### Changed
- Format time remaining display as "3h 2m" (hours and minutes only, no seconds)
- Remove auto-refresh from tooltip and popup displays

### Added
- Time remaining information to popup display

## [Unreleased]

### Added
- Initial release of Synthetic.new Usage Tracker extension
- Real-time API usage monitoring in VSCode status bar
- Auto-refresh functionality with configurable intervals
- Secure API key storage using VSCode SecretStorage
- Color-coded status indicators based on usage thresholds
- Configurable warning and critical thresholds
- Notifications for quota warnings and API errors
- Commands for refresh, configuration, and viewing details
- Comprehensive error handling with exponential backoff retry
- Full TypeScript implementation with strict type checking
- ESLint configuration for code quality
- Automated testing with @vscode/test-electron
- Pre-commit hooks for linting
- Conventional commit enforcement with commitlint
- Semantic release configuration for automated versioning

### Security
- API keys stored securely using VSCode SecretStorage
- API key validation before storage
- No sensitive data logged or exposed

## [0.0.0] - Unreleased

- Initial development version
