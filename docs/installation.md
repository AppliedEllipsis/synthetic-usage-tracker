# Installation Guide

This guide covers installing the Synthetic.ai Usage Tracker extension in VSCode.

## Prerequisites

- VSCode 1.96.0 or higher
- A Synthetic.ai API key (get one from [https://dev.synthetic.new/](https://dev.synthetic.new/))

## Installation Methods

### Method 1: VSCode Marketplace (Recommended)

1. Open VSCode
2. Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on macOS) to open the Extensions view
3. Search for "Synthetic.ai Usage Tracker"
4. Click the **Install** button
5. Wait for the installation to complete

### Method 2: From .vsix File

1. Download the latest `.vsix` file from the [Releases](https://github.com/your-username/synthetic-usage-tracker/releases) page
2. Open VSCode
3. Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on macOS) to open the Extensions view
4. Click the **...** (three dots) menu in the top-right corner
5. Select **Install from VSIX...**
6. Navigate to and select the downloaded `.vsix` file

### Method 3: Command Line

Using the `code` command-line tool:

```bash
code --install-extension synthetic-usage-tracker-x.x.x.vsix
```

Or directly from the marketplace:

```bash
code --install-extension synthetic-usage-tracker.synthetic-usage-tracker
```

## Initial Setup

### 1. Configure Your API Key

After installation, you need to configure your Synthetic.ai API key:

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) to open the Command Palette
2. Type and select **Synthetic Usage Tracker: Configure API Key**
3. Enter your Synthetic.ai API key (it should start with `syn_`)
4. The extension will automatically fetch your usage data

### 2. Verify Installation

After configuring your API key:

- Look at the status bar on the right side of VSCode
- You should see a "Synthetic" indicator with your usage percentage
- Click on the indicator to view detailed usage information

## Configuration

### Accessing Settings

1. Press `Ctrl+,` (or `Cmd+,` on macOS) to open Settings
2. Search for "Synthetic Usage Tracker"
3. Adjust the settings as needed

### Recommended Settings

For most users, the default settings work well. However, you may want to adjust:

- **Refresh Interval**: Set to a value that balances freshness and API rate limits (default: 60 seconds)
- **Warning Threshold**: Set to when you want to be notified of approaching limits (default: 80%)
- **Critical Threshold**: Set to when you want urgent notifications (default: 90%)

## Uninstallation

### From VSCode

1. Open the Extensions view (`Ctrl+Shift+X`)
2. Search for "Synthetic.ai Usage Tracker"
3. Click the **gear** icon next to the extension
4. Select **Uninstall**

### From Command Line

```bash
code --uninstall-extension synthetic-usage-tracker.synthetic-usage-tracker
```

## Troubleshooting

### Extension Not Appearing

1. Ensure VSCode is restarted after installation
2. Check that VSCode version is 1.96.0 or higher
3. Try reinstalling the extension

### API Key Issues

1. Verify your API key starts with `syn_`
2. Check that your API key is valid at [https://dev.synthetic.new/](https://dev.synthetic.new/)
3. Try reconfiguring the API key using the command palette

### Usage Not Updating

1. Check your internet connection
2. Verify the API endpoint is correct (default: `https://api.synthetic.new/v2`)
3. Try manually refreshing using the command palette

## Getting Your API Key

1. Visit [https://dev.synthetic.new/](https://dev.synthetic.new/)
2. Sign in or create an account
3. Navigate to your account settings or API keys section
4. Copy your API key (it should start with `syn_`)

## Next Steps

- Read the [Architecture Documentation](architecture.md) to understand how the extension works
- Check the [API Documentation](api.md) for advanced usage
- See the [Troubleshooting Guide](troubleshooting.md) for common issues
