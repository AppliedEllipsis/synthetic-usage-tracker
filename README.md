![Extension Icon](image/icon/icon_128.png)

# Synthetic.new Usage Tracker

A VSCode extension that monitors your Synthetic.new API usage and quotas directly from the status bar.

![Version](https://img.shields.io/visual-studio-marketplace/v/Ellipsis.synthetic-usage-tracker?cacheSeconds=3600)
![Downloads](https://img.shields.io/visual-studio-marketplace/d/Ellipsis.synthetic-usage-tracker?cacheSeconds=3600)
![Rating](https://img.shields.io/visual-studio-marketplace/r/Ellipsis.synthetic-usage-tracker?cacheSeconds=3600)

## Features

- **Real-time Usage Tracking**: Monitor your Synthetic.new API quota usage directly from the VSCode status bar
- **Auto-refresh**: Automatically updates usage data at configurable intervals
- **Visual Indicators**: Color-coded status bar based on usage thresholds (warning/critical)
- **Secure Storage**: API keys are stored securely using VSCode SecretStorage
- **Configurable Thresholds**: Set custom warning and critical usage percentages
- **Quick Actions**: Refresh, configure, and view details from the command palette or status bar
- **Notifications**: Get notified when approaching quota limits

## Installation

### From VSCode Marketplace

[![Install from VSCode Marketplace](https://img.shields.io/visual-studio-marketplace/v/Ellipsis.synthetic-usage-tracker?label=VSCode%20Marketplace&logo=visual-studio-code&logoColor=white&color=007acc)](https://marketplace.visualstudio.com/items?itemName=Ellipsis.synthetic-usage-tracker)

1. Open VSCode
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Synthetic.new Usage Tracker"
4. Click Install

### From Open VSX Registry

[![Install from Open VSX](https://img.shields.io/badge/Open%20VSX-Install-success?logo=open-vsx)](https://open-vsx.org/extension/Ellipsis/synthetic-usage-tracker)

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

| Setting                                     | Type    | Default                        | Description                                           |
| ------------------------------------------- | ------- | ------------------------------ | ----------------------------------------------------- |
| `syntheticUsageTracker.apiEndpoint`         | string  | `https://api.synthetic.new/v2` | The Synthetic.new API endpoint                        |
| `syntheticUsageTracker.refreshInterval`     | number  | `60`                           | Auto-refresh interval in seconds (min: 10)            |
| `syntheticUsageTracker.statusBarPosition`   | string  | `right`                        | Position of the usage indicator in the status bar     |
| `syntheticUsageTracker.showPercentage`      | boolean | `true`                         | Show usage as percentage in status bar                |
| `syntheticUsageTracker.showRawNumbers`      | boolean | `false`                        | Show raw request numbers in status bar tooltip        |
| `syntheticUsageTracker.enableNotifications` | boolean | `true`                         | Show notifications for API errors and quota warnings  |
| `syntheticUsageTracker.warningThreshold`    | number  | `80`                           | Usage percentage threshold for warning notifications  |
| `syntheticUsageTracker.criticalThreshold`   | number  | `90`                           | Usage percentage threshold for critical notifications |

## Commands

| Command                                             | Description                                      |
| --------------------------------------------------- | ------------------------------------------------ |
| `Synthetic Usage Tracker: Refresh Usage`            | Manually refresh the usage data                  |
| `Synthetic Usage Tracker: Configure API Key`        | Configure or update your API key                 |
| `Synthetic Usage Tracker: Show Usage Details`       | Display detailed usage information               |
| `Synthetic Usage Tracker: Toggle Auto-Refresh`      | Enable/disable auto-refresh                      |
| `Synthetic Usage Tracker: Open Synthetic Dashboard` | Open the Synthetic.new dashboard in your browser |

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
