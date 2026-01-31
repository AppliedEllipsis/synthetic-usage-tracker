# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Fixed
- Status bar now displays red background when API key is not configured or cleared, making the lack of configuration more prominent to users

### Added
- Multi-key cycling infrastructure for managing multiple Synthetic.new API keys
- Four key cycling strategies: RoundRobin, LeastUsed, Random, and Priority
- Key health scoring system (0-100) based on failures, quota availability, and key age
- Automatic key cycling when health scores fall below threshold
- Six new commands for key management: Add Key, Remove Key, Select Key, Cycle Keys, List Keys, Reset Statistics
- Three new configuration options: Enable Key Cycling, Cycling Strategy, Auto-Cycle Threshold
- Status bar displays current key index (e.g., [1/3]) when multiple keys are configured
- Status bar tooltip shows key label, health score, and cycling status when multi-key is enabled
- Key statistics tracking: usage count, success count, failure count, last used timestamp, activation history
- Comprehensive multi-key architecture documentation in `docs/multi-key-architecture.md`
- Key manager service for secure storage and retrieval of multiple API keys with labels
- Cross-window synchronization for key cycling state changes
- Backward compatibility with legacy single-key storage format
- Enhanced tooltips with ASCII progress bars for category breakdowns (tools, search, chat, other)
- Unicode block characters (█ for filled, ░ for empty) for visual progress representation
- Warning emoji (⚠️) displayed when a category exceeds its limit (≥100% usage)
- API key suffix display showing last 4 characters in tooltips (format: `Key: ****x7b9`)
- Quota warning symbols: ⚠️ (warning emoji) for warning level (≥80%), 🔴 (red circle emoji) for critical level (≥90%)
- Category-specific warnings with abbreviations: T=tools, S=search, C=chat, O=other (max 2 category warnings, 3 total symbols)
- API models endpoint (`/openai/v1/models`) returning 18 available models with `hf:` prefix
- Comprehensive unit test suite with 93 tests covering all new functionality
- New API types: UsageCategory enum, CategoryUsage interface, ApiKey interface, CyclingStrategy enum
- Updated QuotaResponse and UsageInfo interfaces to include optional categories field
- KeyManager class for managing multiple API keys with health tracking
- KeyCyclingService class for automatic key cycling with multiple strategies
- Three new mermaid sequence diagrams in architecture documentation (Key Cycling Flow, Cross-Window Synchronization Flow)

### Changed
- Updated status bar display to show key index when multiple keys are configured
- Enhanced tooltip to include multi-key information when available
- Improved error handling for key authentication failures in multi-key context
- Updated status bar component description to include new visual features (ASCII progress bars, warning symbols, API key suffix display)
- Updated API layer documentation to include new interfaces and models endpoint
- Updated architecture diagram to include Key Manager, Key Cycling Service, GlobalState API, and Models endpoint
- API uses mixed versioning: v2 for quotas, v1/OpenAI-compatible for models endpoint

## [1.0.14] - 2026-01-26

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
