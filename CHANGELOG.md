# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.5] - 2026-01-25

### Changed
- Version bump to 1.0.5

## [1.0.4] - 2026-01-25

### Fixed
- Fixed status bar tooltip to show detailed usage information on hover

## [Unreleased]

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
