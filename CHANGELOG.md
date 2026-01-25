# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of Synthetic.ai Usage Tracker extension
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
