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
      vscode.window.showInformationMessage("API key saved successfully");

      // Refresh usage immediately after setting key
      await this.refreshUsage();
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
      vscode.window.showInformationMessage("API key cleared");
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
   * Show detailed usage information in a message box
   *
   * Design decision: Provide detailed information in an easily accessible format.
   * Users can quickly check all quota details without leaving their workflow.
   */
  private async showUsageDetails(): Promise<void> {
    if (!this.lastUsageInfo) {
      vscode.window.showInformationMessage("No usage data available. Refresh to get current usage.");
      return;
    }

    const usage = this.lastUsageInfo;

    // Subscription quota (primary usage)
    const sub = usage.subscription;
    const subMessage = `Subscription Quota:\n  Used: ${sub.requests}/${sub.limit} (${sub.percentageUsed.toFixed(1)}%)\n  Remaining: ${sub.remaining}\n  Renews: ${sub.renewAtString}`;

    // Search quota (hourly)
    const search = usage.search;
    const searchMessage = `Search Quota (Hourly):\n  Used: ${search.requests}/${search.limit} (${search.percentageUsed.toFixed(1)}%)\n  Remaining: ${search.remaining}\n  Renews: ${search.renewAtString}`;

    // Tool call discounts quota
    const toolCalls = usage.toolCalls;
    const toolCallMessage = `Tool Call Discounts:\n  Used: ${toolCalls.requests}/${toolCalls.limit} (${toolCalls.percentageUsed.toFixed(1)}%)\n  Remaining: ${toolCalls.remaining}\n  Renews: ${toolCalls.renewAtString}`;

    const fullMessage = `${subMessage}\n\n${searchMessage}\n\n${toolCallMessage}`;

    vscode.window.showInformationMessage(fullMessage);
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

    if (config.refreshInterval > 0) {
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
  private toggleAutoRefresh(): void {
    const config = this.configManager.getConfig();

    if (config.refreshInterval > 0) {
      this.usageIndicator.stopAutoRefresh();
      vscode.window.showInformationMessage("Auto-refresh disabled");
    } else {
      // Set a default refresh interval when re-enabling
      const defaultInterval = 60;
      this.usageIndicator.startAutoRefresh(
        defaultInterval,
        () => this.refreshUsage(),
      );
      vscode.window.showInformationMessage(`Auto-refresh enabled (${defaultInterval}s interval)`);
    }
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
