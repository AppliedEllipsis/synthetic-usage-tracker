import * as vscode from "vscode";
import { ConfigurationManager } from "./config/configuration";
import { UsageIndicator } from "./statusBar/usageIndicator";
import { SyntheticService } from "./api/syntheticService";
import type { UsageInfo as APIUsageInfo } from "./api/syntheticService";

/**
 * Main extension class for Synthetic Usage Tracker
 *
 * Design decision: This class orchestrates the extension lifecycle, managing
 * configuration, API communication, and status bar updates. It coordinates
 * between different components while maintaining clean separation of concerns.
 */
export class SyntheticUsageTrackerExtension {
  private configManager: ConfigurationManager;
  private usageIndicator: UsageIndicator;
  private isInitialized: boolean = false;
  private context: vscode.ExtensionContext;
  private sharedStateWatcherDisposable: vscode.Disposable | null = null;

  // Track the last usage info for comparisons
  private lastUsageInfo: APIUsageInfo | null = null;

  // Track auto-refresh state (separate from config to allow toggle functionality)
  private isAutoRefreshEnabled: boolean = true;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.configManager = new ConfigurationManager(context);
    this.usageIndicator = new UsageIndicator(context);

    // Register configuration change callback
    this.configManager.onConfigChange(() => this.handleConfigChange());

    // Register cross-window key update callback
    this.configManager.onKeysRefreshed(() => this.handleKeysRefreshed());
  }

  /**
   * Activate the extension
   *
   * Design decision: We catch errors at this level to prevent extension failures from
   * bubbling up and crashing VS Code. The extension should remain functional even if
   * initial API calls fail, allowing users to configure settings and retry manually.
   */
  async activate(): Promise<void> {
    try {
      // Register commands before initialization so they're always available
      this.registerCommands();

      // Start watching for cross-window key updates immediately
      this.sharedStateWatcherDisposable = this.configManager.watchSharedStateChanges();

      await this.initialize();

      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to activate extension:", error);
      this.usageIndicator.setError("Failed to initialize extension");
    }
  }

  /**
   * Initialize the extension
   *
   * Design decision: Early return when no API key is present to avoid unnecessary API calls
   * and error notifications. Users expect the extension to be silent until configured.
   */
  private async initialize(): Promise<void> {
    const hasApiKey = await this.configManager.hasApiKey();
    if (!hasApiKey) {
      this.usageIndicator.setIdle();
      return;
    }

    await this.refreshUsage();
    this.setupAutoRefresh();
  }

  /**
   * Register all extension commands
   *
   * Design decision: Commands are registered in the constructor/activate phase so they're
   * available immediately after activation, even if the extension hasn't fully initialized.
   * This provides better user experience as commands don't fail on first use.
   */
  private registerCommands(): void {
    // Set API key command
    const setKeyCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.setApiKey",
      () => this.setApiKey(),
    );
    this.context.subscriptions.push(setKeyCommand);

    // Refresh usage command
    const refreshCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.refresh",
      () => this.refreshUsage(),
    );
    this.context.subscriptions.push(refreshCommand);

    // Clear API key command
    const clearKeyCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.clearApiKey",
      () => this.clearApiKey(),
    );
    this.context.subscriptions.push(clearKeyCommand);

    // Show usage details command
    const showUsageCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.showUsage",
      () => this.showUsageDetails(),
    );
    this.context.subscriptions.push(showUsageCommand);

    // Toggle auto-refresh command
    const toggleAutoRefreshCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.toggleAutoRefresh",
      () => this.toggleAutoRefresh(),
    );
    this.context.subscriptions.push(toggleAutoRefreshCommand);

    // Copy usage to clipboard command
    const copyUsageCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.copyUsage",
      () => this.copyUsageToClipboard(),
    );
    this.context.subscriptions.push(copyUsageCommand);

    // Set refresh interval command
    const setRefreshIntervalCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.setRefreshInterval",
      () => this.setRefreshInterval(),
    );
    this.context.subscriptions.push(setRefreshIntervalCommand);
  }

  /**
   * Set API key through VS Code input box
   *
   * Design decision: Use interactive input dialog for better UX compared to editing
   * settings directly. This approach is familiar to users and provides immediate feedback.
   */
  private async setApiKey(): Promise<void> {
    // Generate a random placeholder for visual guidance
    const placeholder = `syn_${Math.random().toString(36).substring(2, 8)}`;

    const input = await vscode.window.showInputBox({
      prompt: "Enter your Synthetic.new API key",
      placeHolder: placeholder,
      password: true,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return "API key cannot be empty";
        }
        if (!SyntheticService.validateApiKey(value)) {
          return "Invalid API key format. API keys should start with 'syn_'";
        }
        return null;
      },
    });

    if (input) {
      await this.configManager.setApiKey(input);
      // Design decision: Don't show notification - status bar updates automatically
      // Notifications covering UI are intrusive

      // Refresh usage immediately after setting key
      await this.refreshUsage();
      // Design decision: Clear tooltip temporarily after key is set
      // Tooltip restores after 500ms to keep it available most of the time
      this.usageIndicator.clearTooltip(500);
    }
  }

  /**
   * Clear the stored API key
   *
   * Design decision: Require user confirmation to prevent accidental deletion.
   * This is important because users can't recover the key from the extension.
   */
  private async clearApiKey(): Promise<void> {
    const confirm = await vscode.window.showWarningMessage(
      "Are you sure you want to clear your API key?",
      "Clear",
      "Cancel",
    );

    if (confirm === "Clear") {
      await this.configManager.deleteApiKey();
      this.usageIndicator.setIdle();
      // Design decision: Clear tooltip for 2 seconds after key is cleared
      // Provides clear visual feedback that the key has been removed
      this.usageIndicator.clearTooltip(2000);
    }
  }

  /**
   * Refresh usage data from the API
   *
   * Design decision: Update the status bar even if the refresh fails to provide
   * immediate feedback. Users see an error state rather than stale data.
   */
  private async refreshUsage(): Promise<void> {
    const apiKey = await this.configManager.getApiKey();

    if (!apiKey) {
      this.usageIndicator.setIdle();
      return;
    }

    this.usageIndicator.setLoading();

    try {
      const config = this.configManager.getConfig();
      const service = new SyntheticService(apiKey, config.apiEndpoint);
      const usage = await service.fetchQuota();

      // Store the usage info for later comparison
      this.lastUsageInfo = usage;

      // Update the status bar with the new usage data
      // Design decision: Create a Config object that includes the API key for tooltip masking
      const indicatorConfig: { apiKey: string; showPercentage: boolean; showRawNumbers: boolean; warningThreshold: number; criticalThreshold: number } = {
        apiKey,
        showPercentage: config.showPercentage,
        showRawNumbers: config.showRawNumbers,
        warningThreshold: config.warningThreshold,
        criticalThreshold: config.criticalThreshold,
      };
      this.usageIndicator.updateUsage(usage, indicatorConfig);

      // Check for critical usage and show notification if needed
      if (config.enableNotifications) {
        this.checkUsageThresholds(usage, config);
      }
    } catch (error) {
      console.error("Failed to refresh usage:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.usageIndicator.setError(errorMessage);
    }
  }

  /**
   * Check usage thresholds and show notifications
   *
   * Design decision: Only show notifications when thresholds are crossed, not on every
   * refresh. This prevents spamming users with repeated warnings. We track the last
   * known usage info to detect threshold crossings.
   */
  private checkUsageThresholds(usage: APIUsageInfo, config: { enableNotifications: boolean; warningThreshold: number; criticalThreshold: number }): void {
    if (!config.enableNotifications) {
      return;
    }

    const subscriptionUsage = usage.subscription;
    if (!subscriptionUsage) {
      return;
    }

    // Check critical threshold
    if (subscriptionUsage.percentageUsed >= config.criticalThreshold) {
      vscode.window.showWarningMessage(
        `Critical: ${subscriptionUsage.percentageUsed.toFixed(0)}% API quota used. ${subscriptionUsage.remaining} requests remaining.`,
      );
    }
    // Check warning threshold (but don't show if critical was already shown)
    else if (subscriptionUsage.percentageUsed >= config.warningThreshold) {
      vscode.window.showInformationMessage(
        `Warning: ${subscriptionUsage.percentageUsed.toFixed(0)}% API quota used. ${subscriptionUsage.remaining} requests remaining.`,
      );
    }
  }

  /**
   * Show detailed usage information in a message box with action buttons
   *
   * Design decision: Display detailed quota information with time remaining and
   * progress bars, and provide action buttons for quick access to common tasks.
   * This matches the version 1.4 behavior with buttons: Refresh, Open Dashboard,
   * Subscribe with Discount, Show Commands.
   */
  private async showUsageDetails(): Promise<void> {
    await this.showUsageDetailsInternal(false);
  }

  /**
   * Internal method to show usage details with optional refresh loop
   *
   * Design decision: Support refresh button within popup by loop showing updated data.
   * This keeps the popup open and shows fresh usage information when refresh is clicked.
   */
  private async showUsageDetailsInternal(refreshed: boolean): Promise<void> {
    if (!this.lastUsageInfo && !refreshed) {
      vscode.window.showInformationMessage("No usage data available. Refresh to get current usage.");
      return;
    }

    // Only clear tooltip on first open, not on refresh
    if (!refreshed) {
      this.usageIndicator.clearTooltip(500);
    }

    const usage = this.lastUsageInfo;
    if (!usage) {
      vscode.window.showInformationMessage("No usage data available. Refresh to get current usage.");
      return;
    }

    const message = this.buildDetailedUsageMessage(usage);

    // Show information message with action buttons
    const result = await vscode.window.showInformationMessage(
      message,
      { modal: true },
      "Refresh",
      "Open Dashboard",
      "Subscribe with Discount",
      "Show Commands"
    );

    // Handle button clicks
    if (result === "Refresh") {
      await this.refreshUsage();
      // Show popup again with updated data
      await this.showUsageDetailsInternal(true);
    } else if (result === "Open Dashboard") {
      this.openDashboard();
    } else if (result === "Subscribe with Discount") {
      this.subscribeWithDiscount();
    } else if (result === "Show Commands") {
      await this.showCommands();
    }
    // Cancel is automatically handled by VSCode
  }

  /**
   * Build detailed usage message with time remaining and progress bars for all categories
   *
   * Design decision: Format information consistently across all categories with
   * both the reset time, time remaining, and visual progress bars displayed for clarity.
   */
  private buildDetailedUsageMessage(usage: APIUsageInfo): string {
    const sub = usage.subscription;
    const search = usage.search;
    const toolCalls = usage.toolCalls;

    // Helper function to calculate time remaining
    const formatTimeRemaining = (renewAt: Date): string => {
      const now = new Date();
      const diffMs = renewAt.getTime() - now.getTime();

      if (diffMs <= 0) return "now";

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (hours >= 24) {
        const days = Math.floor(hours / 24);
        return `${days}d ${hours % 24}h from now`;
      } else if (hours > 0) {
        return `${hours}h ${minutes}m from now`;
      } else if (minutes > 0) {
        return `${minutes}m from now`;
      } else {
        return "now";
      }
    };

    return `### Synthetic.new Usage Details

**Subscription**
Requests: ${sub.requests.toLocaleString()} / ${sub.limit.toLocaleString()} (${sub.percentageUsed.toFixed(1)}%)
Remaining: ${sub.remaining.toLocaleString()} (${(100 - sub.percentageUsed).toFixed(1)}%)
Renews: ${sub.renewAtString}
Time Remaining: ${formatTimeRemaining(sub.renewAt)}
${this.usageIndicator.buildAsciiProgressBar(sub.percentageUsed)}

**Search (hourly)**
Requests: ${search.requests.toLocaleString()} / ${search.limit.toLocaleString()} (${search.percentageUsed.toFixed(1)}%)
Remaining: ${search.remaining.toLocaleString()} (${(100 - search.percentageUsed).toFixed(1)}%)
Renews: ${search.renewAtString}
Time Remaining: ${formatTimeRemaining(search.renewAt)}
${this.usageIndicator.buildAsciiProgressBar(search.percentageUsed)}

**Tool Calls**
Requests: ${toolCalls.requests.toLocaleString()} / ${toolCalls.limit.toLocaleString()} (${toolCalls.percentageUsed.toFixed(1)}%)
Remaining: ${toolCalls.remaining.toLocaleString()} (${(100 - toolCalls.percentageUsed).toFixed(1)}%)
Renews: ${toolCalls.renewAtString}
Time Remaining: ${formatTimeRemaining(toolCalls.renewAt)}
${this.usageIndicator.buildAsciiProgressBar(toolCalls.percentageUsed)}`;
  }

  /**
   * Open the Synthetic.new billing dashboard
   */
  private openDashboard(): void {
    vscode.env.openExternal(vscode.Uri.parse("https://synthetic.new/billing"));
  }

  /**
   * Open Synthetic.new subscribe page with referral discount
   */
  private subscribeWithDiscount(): void {
    vscode.env.openExternal(vscode.Uri.parse("https://synthetic.new/?referral=4JZcLOKgRmZ4o6k"));
  }

  /**
   * Show extension commands in a QuickPick menu
   *
   * Design decision: Display all extension commands in a QuickPick for easy access
   * to all functionality without needing to use the command palette (Ctrl+Shift+P)
   */
  private async showCommands(): Promise<void> {
    // Design decision: Clear tooltip for 5 seconds when showing commands
    // Prevent updates during this time, then restore with current data
    this.usageIndicator.clearTooltip(5000, true);

    const isAutoRefreshEnabled = this.getIsAutoRefreshEnabled();

    const commands = [
      {
        label: "$(refresh) Refresh Usage",
        description: "Manually refresh usage data",
        command: "syntheticUsageTracker.refresh",
      },
      {
        label: "$(key) Set API Key",
        description: "Configure your Synthetic.new API key",
        command: "syntheticUsageTracker.setApiKey",
      },
      {
        label: "$(clear-all) Clear API Key",
        description: "Remove the stored API key",
        command: "syntheticUsageTracker.clearApiKey",
      },
      {
        label: "$(clock) Set Refresh Interval",
        description: "Change auto-refresh interval (30s-30min)",
        command: "syntheticUsageTracker.setRefreshInterval",
      },
      {
        label: isAutoRefreshEnabled ? "$(circle-slash) Disable Auto-Refresh" : "$(play) Enable Auto-Refresh",
        description: isAutoRefreshEnabled ? "Turn off automatic refresh" : "Turn on automatic refresh",
        command: "syntheticUsageTracker.toggleAutoRefresh",
      },
      {
        label: "$(copy) Copy Usage to Clipboard",
        description: "Copy usage information to clipboard for sharing",
        command: "syntheticUsageTracker.copyUsage",
      },
      {
        label: "$(dashboard) Open Synthetic Dashboard",
        description: "Open billing dashboard in browser",
        command: "syntheticUsageTracker.openDashboard",
      },
      {
        label: "$(discount) Subscribe with Discount",
        description: "Get subscription with referral discount",
        command: "syntheticUsageTracker.subscribeWithDiscount",
      },
      {
        label: "$(info) Show Usage Details",
        description: "Display detailed usage information",
        command: "syntheticUsageTracker.showUsage",
      },
    ];

    const selected = await vscode.window.showQuickPick(commands, {
      placeHolder: "Select a Synthetic Usage Tracker command",
    });

    if (selected) {
      await vscode.commands.executeCommand(selected.command);
    }
  }

  /**
   * Copy usage information to clipboard
   *
   * Design decision: Provide formatted usage information that users can easily paste
   * into bug reports, share with team, or use for documentation. The format is plain text
   * for maximum compatibility with other applications.
   */
  private async copyUsageToClipboard(): Promise<void> {
    if (!this.lastUsageInfo) {
      vscode.window.showErrorMessage("No usage data available. Refresh first to get current usage.");
      return;
    }

    const usage = this.lastUsageInfo;
    
    // Check if tooltip clearing is needed
    this.usageIndicator.clearTooltip(500);

    const apiKey = await this.configManager.getApiKey();
    const maskedKey = apiKey ? `${apiKey.substring(0, 4)}****${apiKey.substring(apiKey.length - 4)}` : "Not configured";

    const text = `Synthetic.new Usage Tracker
=====================

## Subscription
Requests: ${usage.subscription.requests.toFixed(1)} / ${usage.subscription.limit}
Remaining: ${(usage.subscription.limit - usage.subscription.requests).toFixed(1)}
Percentage: ${usage.subscription.percentageUsed.toFixed(1)}%
Renews At: ${usage.subscription.renewAt.toLocaleString()}
Time Remaining: ${this.calculateTimeRemainingString(usage.subscription.renewAt)}

## Search (Hourly)
Requests: ${usage.search.requests.toFixed(1)} / ${usage.search.limit}
Remaining: ${(usage.search.limit - usage.search.requests).toFixed(1)}
Percentage: ${usage.search.percentageUsed.toFixed(1)}%
Renews At: ${usage.search.renewAt.toLocaleString()}
Time Remaining: ${this.calculateTimeRemainingString(usage.search.renewAt)}

## Tool Calls
Requests: ${usage.toolCalls.requests.toFixed(1)} / ${usage.toolCalls.limit}
Remaining: ${(usage.toolCalls.limit - usage.toolCalls.requests).toFixed(1)}
Percentage: ${usage.toolCalls.percentageUsed.toFixed(1)}%
Renews At: ${usage.toolCalls.renewAt.toLocaleString()}
Time Remaining: ${this.calculateTimeRemainingString(usage.toolCalls.renewAt)}

API Key: ${maskedKey}
Timestamp: ${new Date().toISOString()}`;

    try {
      await vscode.env.clipboard.writeText(text);
      vscode.window.showInformationMessage("✓ Usage information copied to clipboard!");
    } catch (error) {
      vscode.window.showErrorMessage("Failed to copy to clipboard: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  /**
   * Calculate human-readable time remaining string
   *
   * Design decision: Provides easy-to-understand time calculations
   * in the same format as the tooltip for consistency across the extension.
   */
  private calculateTimeRemainingString(renewAt: Date): string {
    const now = new Date();
    const diffMs = renewAt.getTime() - now.getTime();

    if (diffMs <= 0) {
      return "Now";
    }

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);

    return parts.join(" ") + " from now";
  }

  /**
   * Set refresh interval with validation
   *
   * Design decision: Accepts both seconds (as number) or minutes with 'min' suffix.
   * Minimum 30 seconds, maximum 30 minutes. Only whole numbers accepted.
   * Spaces in 'min' format are ignored for user convenience.
   */
  private async setRefreshInterval(): Promise<void> {
    const input = await vscode.window.showInputBox({
      prompt: "Set refresh interval",
      placeHolder: "e.g., 60 (seconds) or 5min (5 minutes)",
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return "Value cannot be empty";
        }

        // Remove all spaces from input (to handle "5 min" type formats)
        const sanitized = value.replace(/\s+/g, '');
        
        let seconds: number | null = null;

        // Check if it ends with 'min' (case-insensitive)
        const minMatch = sanitized.match(/^(\d+)min$/i);
        if (minMatch && minMatch[1]) {
          seconds = parseInt(minMatch[1], 10) * 60; // Convert minutes to seconds
        } else {
          // Try to parse as plain seconds (must be a whole number)
          const numMatch = sanitized.match(/^\d+$/);
          if (numMatch) {
            seconds = parseInt(sanitized, 10);
          }
        }

        if (seconds === null) {
          return "Invalid format. Use seconds (e.g., 60) or minutes with 'min' (e.g., 5min)";
        }

        if (seconds < 30) {
          return "Minimum interval is 30 seconds";
        }

        if (seconds > 1800) {
          return "Maximum interval is 30 minutes (1800 seconds)";
        }

        return null;
      },
    });

    if (!input) {
      return; // User cancelled
    }

    // Parse and validate the input (same logic as validateInput)
    const sanitized = input.replace(/\s+/g, '');
    let seconds: number;

    if (sanitized.match(/^\d+min$/i)) {
      seconds = parseInt(sanitized.replace(/min$/i, ''), 10) * 60;
    } else {
      seconds = parseInt(sanitized, 10);
    }

    // Update the configuration
    const config = vscode.workspace.getConfiguration("syntheticUsageTracker");
    await config.update("refreshInterval", seconds, vscode.ConfigurationTarget.Global);

    const minutes = Math.round(seconds / 60 * 10) / 10; // Round to 1 decimal place
    vscode.window.showInformationMessage(`✓ Refresh interval set to ${seconds} seconds (${minutes} min)`);

    // Restart auto-refresh with new interval if enabled
    if (this.getIsAutoRefreshEnabled()) {
      this.usageIndicator.stopAutoRefresh();
      this.usageIndicator.startAutoRefresh(seconds, () => this.refreshUsage());
    }
  }

  /**
   * Handle configuration changes
   *
   * Design decision: Refresh usage when configuration changes to ensure the extension
   * reflects the new settings immediately. This provides better UX than waiting for
   * the next auto-refresh interval.
   */
  private async handleConfigChange(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    const config = this.configManager.getConfig();

    // Update auto-refresh settings
    if (config.refreshInterval > 0) {
      this.usageIndicator.startAutoRefresh(
        config.refreshInterval,
        () => this.refreshUsage(),
      );
    } else {
      this.usageIndicator.stopAutoRefresh();
    }

    // Refresh usage with new configuration
    await this.refreshUsage();
  }

  /**
   * Handle cross-window key updates
   *
   * Design decision: When the key is updated in another window, refresh the usage data
   * to stay in sync. This ensures all windows show consistent information.
   */
  private async handleKeysRefreshed(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      const hasKey = await this.configManager.hasApiKey();
      if (!hasKey) {
        this.usageIndicator.setIdle();
        return;
      }

      await this.refreshUsage();

      const config = this.configManager.getConfig();
      if (config.enableNotifications) {
        vscode.window.showInformationMessage(
          "API key updated in another window. Usage data refreshed.",
        );
      }
    } catch (error) {
      console.error("Failed to handle key refreshed:", error);
    }
  }

  /**
   * Setup auto-refresh based on configuration
   *
   * Design decision: Auto-refresh is enabled by default to keep usage data current.
   * Users can disable it in settings if they prefer manual refreshes.
   */
  private setupAutoRefresh(): void {
    const config = this.configManager.getConfig();

    // Only start auto-refresh if interval is greater than 0 and auto-refresh is enabled
    if (config.refreshInterval > 0 && this.isAutoRefreshEnabled) {
      this.usageIndicator.startAutoRefresh(
        config.refreshInterval,
        () => this.refreshUsage(),
      );
    }
  }

  /**
   * Toggle auto-refresh on/off
   *
   * Design decision: Provide a quick command to toggle auto-refresh without
   * navigating through settings. This improves convenience for users who
   * need to temporarily disable auto-refresh.
   */
  private async toggleAutoRefresh(): Promise<void> {
    const config = this.configManager.getConfig();
    const defaultInterval = 60;

    if (this.isAutoRefreshEnabled) {
      // Disable auto-refresh
      this.usageIndicator.stopAutoRefresh();
      this.isAutoRefreshEnabled = false;
      vscode.window.showInformationMessage("Auto-refresh disabled");
    } else {
      // Enable auto-refresh
      this.isAutoRefreshEnabled = true;
      if (config.refreshInterval > 0) {
        this.usageIndicator.startAutoRefresh(
          config.refreshInterval,
          () => this.refreshUsage(),
        );
        vscode.window.showInformationMessage(`Auto-refresh enabled (${config.refreshInterval}s interval)`);
      } else {
        // Use default interval if not configured
        this.usageIndicator.startAutoRefresh(
          defaultInterval,
          () => this.refreshUsage(),
        );
        vscode.window.showInformationMessage(`Auto-refresh enabled (${defaultInterval}s interval - default)`);
      }
    }
  }

  /**
   * Check if auto-refresh is currently enabled
   *
   * Design decision: Provide a method to query the auto-refresh state for display purposes.
   * This allows the UI to show the correct toggle state in menus and commands.
   */
  private getIsAutoRefreshEnabled(): boolean {
    return this.isAutoRefreshEnabled;
  }

  /**
   * Deactivate the extension
   *
   * Design decision: Dispose all resources in reverse order of creation to prevent
   * issues with dependencies. This ensures clean shutdown without memory leaks.
   */
  deactivate(): void {
    this.usageIndicator.dispose();
    this.configManager.dispose();
    this.sharedStateWatcherDisposable?.dispose();
  }
}

// Global extension instance
let extensionInstance: SyntheticUsageTrackerExtension | undefined;

/**
 * Extension activation function
 *
 * Design decision: Create a single global instance of the extension for the lifetime
 * of the VS Code session. This simplifies state management and ensures consistent behavior.
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    extensionInstance = new SyntheticUsageTrackerExtension(context);
    await extensionInstance.activate();
  } catch (error) {
    console.error("Failed to activate Synthetic Usage Tracker extension:", error);
    throw error;
  }
}

/**
 * Extension deactivation function
 *
 * Design decision: Clean up all resources when the extension is deactivated.
 * This prevents memory leaks and ensures proper cleanup of timers and event listeners.
 */
export function deactivate(): void {
  if (extensionInstance) {
    extensionInstance.deactivate();
    extensionInstance = undefined;
  }
}
