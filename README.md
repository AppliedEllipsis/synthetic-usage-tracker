![Extension Icon](image/icon/icon_128.png)

# Synthetic.new Usage Tracker

A VSCode extension that monitors your Synthetic.new API usage and quotas directly from the status bar.

![Version](https://img.shields.io/visual-studio-marketplace/v/synthetic-usage-tracker.synthetic-usage-tracker)
![Downloads](https://img.shields.io/visual-studio-marketplace/d/synthetic-usage-tracker.synthetic-usage-tracker)
![Rating](https://img.shields.io/visual-studio-marketplace/r/synthetic-usage-tracker.synthetic-usage-tracker)

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

1. Open VSCode
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Synthetic.new Usage Tracker"
4. Click Install

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

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting a pull request.

## License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Help Us Grow!

Invite your friends to **Synthetic.new** and both of you will receive:

- **$10.00** for standard signups
- **$20.00** for pro signups

In subscription credit when they subscribe!

[Sign up with referral link](https://synthetic.new/?referral=4JZcLOKgRmZ4o6k)

## Support

- Report issues: [GitHub Issues](https://github.com/AppliedEllipsis/synthetic-usage-tracker/issues)
- Documentation: [Full Documentation](docs/README.md)
- API Docs: [Synthetic.new API Documentation](https://dev.synthetic.new/docs/synthetic/quotas)

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
