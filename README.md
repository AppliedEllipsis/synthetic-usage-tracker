![Extension Icon](image/icon/icon_128.png)

# Synthetic.new Usage Tracker

A VSCode extension that monitors your Synthetic.new API usage and quotas directly from the status bar.

[![VSCode Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/Ellipsis.synthetic-usage-tracker?logo=visual-studio-code&label=VSCode%20Marketplace&cacheSeconds=3600)](https://marketplace.visualstudio.com/items?itemName=Ellipsis.synthetic-usage-tracker)
[![VSCode Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/Ellipsis.synthetic-usage-tracker?logo=visual-studio-code&color=007acc&cacheSeconds=3600)](https://marketplace.visualstudio.com/items?itemName=Ellipsis.synthetic-usage-tracker)
[![VSCode Marketplace Rating](https://img.shields.io/visual-studio-marketplace/stars/Ellipsis.synthetic-usage-tracker?logo=visual-studio-code&color=007acc&cacheSeconds=3600)](https://marketplace.visualstudio.com/items?itemName=Ellipsis.synthetic-usage-tracker)

[![Open VSX Version](https://img.shields.io/open-vsx/v/Ellipsis/synthetic-usage-tracker?logo=open-vsx&label=Open%20VSX)](https://open-vsx.org/extension/Ellipsis/synthetic-usage-tracker)
[![Open VSX Downloads](https://img.shields.io/open-vsx/dt/Ellipsis/synthetic-usage-tracker?logo=open-vsx&color=35b0ab)](https://open-vsx.org/extension/Ellipsis/synthetic-usage-tracker)
[![Open VSX Rating](https://img.shields.io/open-vsx/rating/Ellipsis/synthetic-usage-tracker?logo=open-vsx&color=35b0ab)](https://open-vsx.org/extension/Ellipsis/synthetic-usage-tracker)

## Features

- **Real-time Usage Tracking**: Monitor your Synthetic.new API quota usage directly from the VSCode status bar
- **Auto-refresh**: Automatically updates usage data at configurable intervals
- **Visual Indicators**: Color-coded status bar based on usage thresholds (warning/critical)
- **Enhanced Tooltips**: Hover over the status bar to see detailed category breakdowns with ASCII progress bars
- **Quota Warning Symbols**: Visual indicators (⚠️ for warning, 🔴 for critical) in the status bar
- **API Key Suffix Display**: Shows last 4 characters of the active API key in tooltips
- **Secure Storage**: API keys are stored securely using VSCode SecretStorage
- **Configurable Thresholds**: Set custom warning and critical usage percentages
- **Quick Actions**: Refresh, configure, and view details from the command palette or status bar
- **Notifications**: Get notified when approaching quota limits
- **Multi-Key Support**: Add multiple API keys with custom labels for easy identification
- **Key Cycling**: Automatically cycle through keys based on configurable strategies (Round Robin, Least Used, Random, Priority)
- **Health Scoring**: Track key health based on failures, quota availability, and usage patterns
- **Automatic Key Switching**: Automatically switch to the next healthy key when quota limits are reached or errors occur
- **Cross-Window Synchronization**: Key state automatically syncs across multiple VSCode windows

## Installation

### From VSCode Marketplace

[![Install from VSCode Marketplace](https://img.shields.io/visual-studio-marketplace/v/Ellipsis.synthetic-usage-tracker?label=VSCode%20Marketplace&logo=visual-studio-code&logoColor=white&color=007acc)](https://marketplace.visualstudio.com/items?itemName=Ellipsis.synthetic-usage-tracker)

1. Open VSCode
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Synthetic.new Usage Tracker"
4. Click Install

### From Open VSX Registry

[![Install from Open VSX](https://img.shields.io/badge/Open%20VSX-Install-success?logo=open-vsx&color=35b0ab)](https://open-vsx.org/extension/Ellipsis/synthetic-usage-tracker)

1. Open VSCode
2. Go to Extensions (Ctrl+Shift+X)
3. Click the "..." menu in the top right
4. Select "Install from VSIX..."
5. Download the extension from [Open VSX Registry](https://open-vsx.org/extension/Ellipsis/synthetic-usage-tracker)
6. Or install using the command: `code --install-extension Ellipsis.synthetic-usage-tracker`

### From .vsix File

1. Download the latest `.vsix` file from the [Releases](https://github.com/AppliedEllipsis/synthetic-usage-tracker/releases) page
2. Open VSCode
3. Go to Extensions (Ctrl+Shift+X)
4. Click the "..." menu in the top right
5. Select "Install from VSIX..."
6. Select the downloaded `.vsix` file

## Getting Started

1. **Configure your API Key**:
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type `Synthetic Usage Tracker: Configure API Key`
   - Enter your Synthetic.new API key (starts with `syn_`)

2. **View Your Usage**:
   - Look at the status bar on the right side
   - You'll see usage percentage and/or raw numbers
   - Click on the status bar item to see detailed information

3. **Configure Settings**:
   - Press `Ctrl+,` to open Settings
   - Search for "Synthetic Usage Tracker"
   - Adjust settings to your preference

## Multi-Key Management

The extension supports managing multiple API keys with automatic cycling functionality. This is useful for:

- Distributing API load across multiple keys
- Managing quota limits across different accounts
- Automatic failover when keys exceed limits
- Testing with different API keys

### Adding Multiple Keys

You can add multiple API keys with custom labels for easy identification:

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type `Synthetic Usage Tracker: Add API Key`
3. Enter your API key (starts with `syn_`)
4. Enter a label for the key (e.g., "Production", "Testing", "Personal")

The first key you add will be set as the active key automatically.

### Managing Keys

**List all keys**: Use the "Synthetic Usage Tracker: List API Keys" command to see all configured keys with their labels and usage statistics.

**Select a key**: Use the "Synthetic Usage Tracker: Select Active Key" command to manually choose which key to use.

**Remove a key**: Use the "Synthetic Usage Tracker: Remove API Key" command to delete a key from your collection.

**Reset statistics**: Use the "Synthetic Usage Tracker: Reset Key Statistics" command to clear usage statistics for all keys.

### Key Cycling

The extension can automatically cycle through your API keys based on configurable strategies. Enable key cycling in the settings:

```json
{
  "syntheticUsageTracker.enableKeyCycling": true,
  "syntheticUsageTracker.cyclingStrategy": "RoundRobin",
  "syntheticUsageTracker.autoCycleThreshold": 90
}
```

**Cycling Strategies**:

1. **RoundRobin**: Cycles through keys in order (1 → 2 → 3 → 1...)
2. **LeastUsed**: Selects the key with the fewest requests
3. **Random**: Randomly selects a key (good for load distribution)
4. **Priority**: Prioritizes keys based on their order in the list

**Automatic Cycling**: When a key's quota exceeds the `autoCycleThreshold` (default: 90%), the extension automatically switches to the next available key.

**Manual Cycling**: Use the "Synthetic Usage Tracker: Cycle Keys" command to manually cycle to the next key.

### Health Scoring

Each key is assigned a health score (0-100) based on:

- **Failure rate**: Keys with more failures have lower scores
- **Quota availability**: Keys with more remaining quota have higher scores
- **Usage patterns**: Keys used less frequently have higher scores

The health score is displayed in the tooltip when hovering over the status bar. Keys with higher health scores are preferred by the cycling strategies.

### Cross-Window Synchronization

Key state automatically synchronizes across multiple VSCode windows. If you add, remove, or modify keys in one window, all other windows will be updated within a few seconds. This ensures consistency across your development environment.

### Status Bar Display

When using multiple keys, the status bar shows:

- **Key index**: `[1/3]` indicates you're using the first of three keys
- **Key label**: The custom label you assigned to the key
- **Key suffix**: Last 4 characters of the API key for identification
- **Health score**: Current health score of the active key

Example tooltip:
```
Production (syn_****xyz) [1/3]
Health: 92/100
Usage: 850/1000 (85%)
```

## Status Bar Features

The extension provides several visual indicators in the status bar to help you quickly understand your API usage status.

### ASCII Progress Bars in Tooltips

Hover over the status bar to see detailed category breakdowns with visual progress bars:

```
Tools:    ████████████░░░░░░░ 12/20 (60%)
Search:   ████████████████░░ 16/20 (80%)
Chat:     █████████████████ 20/20 (100%) ⚠️
Other:    ██████████░░░░░░░░ 10/20 (50%)
```

- `█` (filled block): Represents used quota
- `░` (empty block): Represents remaining quota
- `⚠️` (warning emoji): Appears when a category exceeds its limit (≥100% usage)

### Quota Warning Symbols

The status bar displays visual warning symbols based on your usage thresholds:

- **⚠️ (Warning)**: Appears when usage reaches the warning threshold (default: 80%)
- **🔴 (Critical)**: Appears when usage reaches the critical threshold (default: 90%)

**Category-specific warnings**: When individual categories exceed their limits, abbreviated warnings appear:
- `T`: Tools category
- `S`: Search category
- `C`: Chat category
- `O`: Other category

The extension displays a maximum of 2 category warnings and 3 total symbols to keep the status bar readable.

### API Key Suffix Display

The tooltip shows the last 4 characters of your active API key for easy identification:

```
Key: ****x7b9
```

This helps you quickly verify which API key is currently active without revealing the full key.

**Edge cases handled**:
- Missing or undefined API keys: Shows "Key: Not configured"
- Short API keys (< 4 characters): Shows available characters with asterisks

### Status Bar Color Indicators

The status bar background color changes based on usage levels:

- **Default**: Normal usage (below warning threshold)
- **Yellow/Warning**: Usage at or above warning threshold (≥80%)
- **Red/Critical**: Usage at or above critical threshold (≥90%)

## Screenshots

### Status Bar & Tooltip
The status bar displays your current usage, and hovering over it shows detailed information including quota limits and renewal dates.

![Status Bar with Tooltip](image/screens/statusbar-tooltip.jpg)

### Warning State
When your usage approaches the warning threshold (default: 80%), the status bar changes color to alert you.

![Warning State](image/screens/warning.jpg)

### Usage Details
Click on the status bar item to view a detailed breakdown of your API usage, including raw numbers and quota information.

![Usage Details](image/screens/details.jpg)

### Commands
Access all extension commands through the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

![Commands](image/screens/commands.jpg)

## Configuration

The extension can be configured through VSCode settings:

> **Note**: Some configuration changes may not be reflected until the next refresh of usage data. You can manually refresh by clicking the status bar item or using the "Synthetic Usage Tracker: Refresh Usage" command.

| Setting                                     | Type    | Default                        | Description                                           |
| ------------------------------------------- | ------- | ------------------------------ | ----------------------------------------------------- |
| `syntheticUsageTracker.apiEndpoint`         | string  | `https://api.synthetic.new/v2` | The Synthetic.new API endpoint                        |
| `syntheticUsageTracker.refreshInterval`     | number  | `60`                           | Auto-refresh interval in seconds (min: 10)            |
| `syntheticUsageTracker.showPercentage`      | boolean | `true`                         | Show usage as percentage in status bar                |
| `syntheticUsageTracker.showRawNumbers`      | boolean | `false`                        | Show raw request numbers in status bar tooltip        |
| `syntheticUsageTracker.enableNotifications` | boolean | `true`                         | Show notifications for API errors and quota warnings  |
| `syntheticUsageTracker.warningThreshold`    | number  | `80`                           | Usage percentage threshold for warning notifications  |
| `syntheticUsageTracker.criticalThreshold`   | number  | `90`                           | Usage percentage threshold for critical notifications |
| `syntheticUsageTracker.enableKeyCycling`    | boolean | `false`                        | Enable automatic key cycling across multiple API keys  |
| `syntheticUsageTracker.cyclingStrategy`     | string  | `RoundRobin`                   | Key cycling strategy: `RoundRobin`, `LeastUsed`, `Random`, or `Priority` |
| `syntheticUsageTracker.autoCycleThreshold`  | number  | `90`                           | Usage percentage threshold for automatic key cycling (0-100) |

## Commands

| Command                                             | Description                                      |
| --------------------------------------------------- | ------------------------------------------------ |
| `Synthetic Usage Tracker: Refresh Usage`            | Manually refresh the usage data                  |
| `Synthetic Usage Tracker: Configure API Key`        | Configure or update your API key                 |
| `Synthetic Usage Tracker: Show Usage Details`       | Display detailed usage information               |
| `Synthetic Usage Tracker: Toggle Auto-Refresh`      | Enable/disable auto-refresh                      |
| `Synthetic Usage Tracker: Open Synthetic Dashboard` | Open the Synthetic.new dashboard in your browser |
| `Synthetic Usage Tracker: Add API Key`              | Add a new API key to the key collection          |
| `Synthetic Usage Tracker: Remove API Key`           | Remove an API key from the key collection        |
| `Synthetic Usage Tracker: Select Active Key`        | Manually select which API key to use             |
| `Synthetic Usage Tracker: Cycle API Keys`           | Manually cycle to the next API key               |
| `Synthetic Usage Tracker: List API Keys`            | List all configured API keys with statistics     |
| `Synthetic Usage Tracker: Reset Key Statistics`     | Reset usage statistics for all keys              |

## Development

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- VSCode

### Setup

```bash
# Clone the repository
git clone https://github.com/AppliedEllipsis/synthetic-usage-tracker.git
cd synthetic-usage-tracker

# Install dependencies
npm install

# Run in watch mode for development
npm run watch

# Run tests
npm run test

# Run linter
npm run lint
```

### Building

```bash
# Compile the extension
npm run compile

# Package as .vsix file
npm run package
```

### Building a Release

The `buildrelease` command automates the complete release process:

```bash
npm run buildrelease
```

This command performs the following steps in sequence:

1. **Increment patch version**: Automatically increments the patch version (e.g., 1.0.5 → 1.0.6)
2. **Compile TypeScript**: Builds the extension
3. **Package extension**: Creates the `.vsix` file
4. **Move to releases**: Moves the `.vsix` file to the `releases/` directory

The packaged extension is placed at `releases/synthetic-usage-tracker-X.Y.Z.vsix`, where `X.Y.Z` is the new version number.

**Note**: This command requires a clean git working directory (no uncommitted changes).

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting a pull request.

## License

GPL-3.0 License - see [LICENSE](LICENSE) for details.

## 🤝 Help Us Grow!

It would help both my development and Synthetic.new if you purchased a month (on a new account) with my referral links and you get an additional discount as well for the first month.

I mean, if you're going to use this extension, you're already wanting to use Synthetic.new and might as well give me some credits. :p

Invite your friends to **Synthetic.new** and both of you will receive:

- **$10.00** for standard signups
- **$20.00** for pro signups

In subscription credit when they subscribe!

[Sign up with referral link](https://synthetic.new/?referral=4JZcLOKgRmZ4o6k)

## Support

- Report issues: [GitHub Issues](https://github.com/AppliedEllipsis/synthetic-usage-tracker/issues)
- Documentation: [Full Documentation](docs/README.md)
- API Docs: [Synthetic.new API Documentation](https://dev.synthetic.new/docs/synthetic/quotas)

## Documentation

For detailed technical documentation, see the following resources:

- **[Documentation Index](docs/README.md)** - Complete documentation overview
- **[Architecture](docs/architecture.md)** - System architecture and design decisions
- **[API Reference](docs/api.md)** - API integration details and service documentation
- **[Development Guide](docs/development.md)** - Development workflow and coding practices
- **[Installation Guide](docs/installation.md)** - Detailed installation instructions
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions
- **[CHANGELOG](CHANGELOG.md)** - Version history and release notes

## Support This Project

If you find this extension useful and would like to support its continued development, there are a couple of ways you can help:

### Join with a Referral

When you subscribe to Synthetic.new through our referral link, you'll receive bonus credits as a welcome bonus:

- **$10.00** in subscription credit for standard signups
- **$20.00** in subscription credit for pro signups

Use the following link to sign up and support this project:

[https://synthetic.new/?referral=4JZcLOKgRmZ4o6k](https://synthetic.new/?referral=4JZcLOKgRmZ4o6k)

This helps support the ongoing development and maintenance of this extension at no extra cost to you!

### Crypto Donation

If you'd prefer to donate directly via cryptocurrency, you can send Bitcoin to:

```
bc1q8nrdytlvms0a0zurp04xwfppflcxwgpyrzw5hn
```

Thank you for your support! ❤️

## Acknowledgments

- Based on the [zai-usage-tracker](https://github.com/melon-hub/zai-usage-tracker) extension
- Built with best practices from [ai-dev-env](https://github.com/AppliedEllipsis/ai-dev-env)

---

_Co-vibe coded with AI - Built with human creativity enhanced by artificial intelligence_
