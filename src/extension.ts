import * as vscode from "vscode";
import { ConfigurationManager } from "./config/configuration";
import { SyntheticService } from "./api/syntheticService";
import { UsageIndicator } from "./statusBar/usageIndicator";

/**
 * Main extension class
 */
export class SyntheticUsageTrackerExtension {
  private configManager: ConfigurationManager;
  private usageIndicator: UsageIndicator;
  private isInitialized: boolean = false;
  private isFetching: boolean = false;
  private currentAggregatedUsage: {
    totalLimit: number;
    totalRequests: number;
    totalRemaining: number;
    averagePercentageUsed: number;
    keyCount: number;
    keys: Array<{
      key: string;
      label?: string;
      usage: {
        limit: number;
        requests: number;
        remaining: number;
        percentageUsed: number;
        renewsAt: Date;
        renewsAtString: string;
      };
      error?: string;
    }>;
  } | null = null;
  private sharedStateWatcherDisposable: vscode.Disposable | null = null;

  constructor(private context: vscode.ExtensionContext) {
    this.configManager = new ConfigurationManager(context);
    this.usageIndicator = new UsageIndicator(context);

    // Watch for configuration changes
    this.configManager.onConfigChange(() => this.handleConfigChange());

    // Watch for keys refreshed from other windows
    this.configManager.onKeysRefreshed(() => this.handleKeysRefreshed());
  }

  /**
   * Activate the extension
   */
  async activate(): Promise<void> {
    try {
      // Register commands
      this.registerCommands();

      // Start watching for shared state changes (cross-window key updates)
      this.sharedStateWatcherDisposable = this.configManager.watchSharedStateChanges();

      // Initialize the extension
      await this.initialize();

      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to activate extension:", error);
      this.usageIndicator.setError("Failed to initialize extension");
    }
  }

  /**
   * Initialize the extension
   */
  private async initialize(): Promise<void> {
    // Check if API key is configured
    const hasApiKey = await this.configManager.hasApiKey();

    if (!hasApiKey) {
      this.usageIndicator.setIdle();
      return;
    }

    // Fetch initial usage data
    await this.refreshUsage();

    // Start auto-refresh
    const config = this.configManager.getConfig();
    this.usageIndicator.startAutoRefresh(
      config.refreshInterval,
      () => this.refreshUsage(),
    );
  }

  /**
   * Register extension commands
   */
  private registerCommands(): void {
    // Refresh usage command
    const refreshCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.refresh",
      () => this.refreshUsage(),
    );
    this.context.subscriptions.push(refreshCommand);

    // Refresh keys command (for cross-window key sharing)
    const refreshKeysCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.refreshKeys",
      () => this.refreshKeys(),
    );
    this.context.subscriptions.push(refreshKeysCommand);

    // Configure API key command
    const configureCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.configure",
      () => this.configureApiKey(),
    );
    this.context.subscriptions.push(configureCommand);

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

    // Open dashboard command
    const openDashboardCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.openDashboard",
      () => this.openDashboard(),
    );
    this.context.subscriptions.push(openDashboardCommand);
  }

  /**
   * Refresh usage data from the API
   */
  private async refreshUsage(): Promise<void> {
    if (this.isFetching) {
      return;
    }

    this.isFetching = true;
    this.usageIndicator.setLoading();

    try {
      // Get API keys
      const apiKeys = await this.configManager.getApiKeys();
      if (apiKeys.length === 0) {
        this.usageIndicator.setIdle();
        return;
      }

      // Get configuration
      const config = this.configManager.getConfig();

      // Fetch quota for all keys using the static method
      const aggregatedUsage = await SyntheticService.fetchQuotaForMultipleKeys(
        apiKeys,
        config.apiEndpoint
      );

      // Store aggregated usage
      this.currentAggregatedUsage = aggregatedUsage;

      // Update indicator with aggregated data
      this.usageIndicator.updateAggregatedUsage(aggregatedUsage, {
        showPercentage: config.showPercentage,
        showRawNumbers: config.showRawNumbers,
        warningThreshold: config.warningThreshold,
        criticalThreshold: config.criticalThreshold,
        enableNotifications: config.enableNotifications,
      });

      // Show error notification if any keys failed
      const failedKeys = aggregatedUsage.keys.filter(k => k.error);
      if (failedKeys.length > 0 && config.enableNotifications) {
        const errorMessages = failedKeys.map(k => {
          const label = k.label ? `${k.label} (${k.key.substring(0, 8)}...)` : k.key.substring(0, 8) + '...';
          return `${label}: ${k.error}`;
        }).join('\n');
        vscode.window.showWarningMessage(
          `Some API keys failed to fetch usage:\n${errorMessages}`
        );
      }
    } catch (error) {
      console.error("Failed to fetch usage:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      this.usageIndicator.setError(message);

      // Show error notification
      const config = this.configManager.getConfig();
      if (config.enableNotifications) {
        vscode.window.showErrorMessage(`Failed to fetch Synthetic.ai usage: ${message}`);
      }
    } finally {
      this.isFetching = false;
    }
  }

  /**
   * Refresh API keys from shared store
   * This allows the extension to detect keys added/updated in other VS Code windows
   */
  private async refreshKeys(): Promise<void> {
    try {
      // Refresh keys from shared store
      const result = await this.configManager.refreshKeys();

      if (result.keyCount === 0) {
        vscode.window.showInformationMessage("No API keys configured.");
        return;
      }

      // Show success message
      const message = result.keyCount === 1
        ? "API key refreshed successfully."
        : `${result.keyCount} API keys refreshed successfully.`;
      vscode.window.showInformationMessage(message);

      // Refresh usage data with the updated keys
      await this.refreshUsage();
    } catch (error) {
      console.error("Failed to refresh keys:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      vscode.window.showErrorMessage(`Failed to refresh API keys: ${message}`);
    }
  }

  /**
   * Configure the API key
   */
  private async configureApiKey(): Promise<void> {
    const currentApiKey = await this.configManager.getApiKey();
    const placeholder = currentApiKey || "syn_...";

    const input = await vscode.window.showInputBox({
      prompt: "Enter your Synthetic.ai API key",
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

    if (input === undefined) {
      // User cancelled
      return;
    }

    const apiKey = input.trim();

    // Store the API key (adds to existing keys)
    await this.configManager.setApiKey(apiKey);

    // Show success message
    const keyCount = await this.configManager.getApiKeyCount();
    const message = keyCount > 1 
      ? `API key added successfully (${keyCount} keys configured)`
      : "API key saved successfully";
    vscode.window.showInformationMessage(message);

    // Refresh usage
    await this.refreshUsage();

    // Update auto-refresh if needed
    const config = this.configManager.getConfig();
    this.usageIndicator.updateAutoRefreshInterval(
      config.refreshInterval,
      () => this.refreshUsage(),
    );
  }

  /**
   * Show usage details in a message box or webview
   */
  private async showUsageDetails(): Promise<void> {
    // Check if we have aggregated usage data
    const aggregatedUsage = this.usageIndicator.getCurrentAggregatedUsage();
    if (aggregatedUsage && aggregatedUsage.keyCount > 0) {
      await this.showAggregatedUsageDetails();
      return;
    }

    // Fallback to single key display
    const usage = this.usageIndicator.getCurrentUsage();
    if (!usage) {
      vscode.window.showInformationMessage("No usage data available. Try refreshing.");
      return;
    }

    const percentageUsed = usage.percentageUsed.toFixed(1);
    const percentageRemaining = ((1 - usage.percentageUsed / 100) * 100).toFixed(1);

    const message = `
Synthetic.ai Usage Details
━━━━━━━━━━━━━━━━━━━━━
Requests Used: ${usage.requests.toLocaleString()}
Requests Limit: ${usage.limit.toLocaleString()}
Requests Remaining: ${usage.remaining.toLocaleString()}

Percentage Used: ${percentageUsed}%
Percentage Remaining: ${percentageRemaining}%

Renews At: ${usage.renewsAtString}
`.trim();

    const result = await vscode.window.showInformationMessage(
      message,
      { modal: true },
      "Refresh",
      "Open Dashboard",
    );

    if (result === "Refresh") {
      await this.refreshUsage();
    } else if (result === "Open Dashboard") {
      this.openDashboard();
    }
  }

  /**
   * Show aggregated usage details for multiple API keys
   */
  private async showAggregatedUsageDetails(): Promise<void> {
    if (!this.currentAggregatedUsage) {
      return;
    }

    const { totalLimit, totalRequests, totalRemaining, averagePercentageUsed, keyCount, keys } = this.currentAggregatedUsage;
    const percentageRemaining = ((1 - averagePercentageUsed / 100) * 100).toFixed(1);

    let message = `
Synthetic.ai Usage Details (${keyCount} key${keyCount > 1 ? 's' : ''})
━━━━━━━━━━━━━━━━━━━━━
Total Requests Used: ${totalRequests.toLocaleString()}
Total Requests Limit: ${totalLimit.toLocaleString()}
Total Requests Remaining: ${totalRemaining.toLocaleString()}

Average Percentage Used: ${averagePercentageUsed.toFixed(1)}%
Average Percentage Remaining: ${percentageRemaining}%
`.trim();

    // Add individual key details
    if (keys.length > 1) {
      message += '\n\nIndividual Keys:\n';
      keys.forEach((keyData, index) => {
        const label = keyData.label || `Key ${index + 1}`;
        const keyPreview = keyData.key.substring(0, 8) + '...';
        if (keyData.error) {
          message += `\n${label} (${keyPreview}): Error - ${keyData.error}`;
        } else {
          message += `\n${label} (${keyPreview}): ${keyData.usage.requests.toLocaleString()}/${keyData.usage.limit.toLocaleString()} (${keyData.usage.percentageUsed.toFixed(1)}%)`;
        }
      });
    }

    // Add renewal info (use the earliest renewal time)
    const validKeys = keys.filter(k => !k.error && k.usage.renewsAt);
    if (validKeys.length > 0) {
      const earliestRenewal = validKeys.reduce((earliest, k) => 
        k.usage.renewsAt < earliest ? k.usage.renewsAt : earliest, 
        validKeys[0]!.usage.renewsAt
      );
      message += `\n\nNext Renewal: ${earliestRenewal.toLocaleString()}`;
    }

    const result = await vscode.window.showInformationMessage(
      message,
      { modal: true },
      "Refresh",
      "Open Dashboard",
    );

    if (result === "Refresh") {
      await this.refreshUsage();
    } else if (result === "Open Dashboard") {
      this.openDashboard();
    }
  }

  /**
   * Toggle auto-refresh
   */
  private toggleAutoRefresh(): void {
    const isEnabled = this.usageIndicator.toggleAutoRefresh();
    const message = isEnabled
      ? "Auto-refresh enabled"
      : "Auto-refresh disabled";
    vscode.window.showInformationMessage(message);
  }

  /**
   * Open the Synthetic.ai dashboard
   */
  private openDashboard(): void {
    vscode.env.openExternal(vscode.Uri.parse("https://dev.synthetic.new/dashboard"));
  }

  /**
   * Handle configuration changes
   */
  private handleConfigChange(): void {
    // Re-initialize to apply new configuration
    if (this.isInitialized) {
      const config = this.configManager.getConfig();
      this.usageIndicator.updateAutoRefreshInterval(
        config.refreshInterval,
        () => this.refreshUsage(),
      );
    }
  }

  /**
   * Handle keys refreshed from another window
   * Automatically refreshes usage data when keys are updated in another VS Code window
   */
  private async handleKeysRefreshed(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      // Get current key count
      const keyCount = await this.configManager.getApiKeyCount();
      
      if (keyCount === 0) {
        // No keys configured, set idle state
        this.usageIndicator.setIdle();
        return;
      }

      // Refresh usage data with the updated keys
      await this.refreshUsage();

      // Show notification that keys were auto-refreshed from another window
      const config = this.configManager.getConfig();
      if (config.enableNotifications) {
        const message = keyCount === 1
          ? "API keys updated in another window. Usage data refreshed."
          : `${keyCount} API keys updated in another window. Usage data refreshed.`;
        vscode.window.showInformationMessage(message);
      }
    } catch (error) {
      console.error("Failed to handle keys refreshed:", error);
      // Don't show error on auto-refresh to avoid spamming the user
    }
  }

  /**
   * Deactivate the extension
   */
  deactivate(): void {
    this.usageIndicator.dispose();
    this.configManager.dispose();
    this.sharedStateWatcherDisposable?.dispose();
  }
}

/**
 * Extension activation function
 */
export function activate(context: vscode.ExtensionContext): void {
  const extension = new SyntheticUsageTrackerExtension(context);
  extension.activate();
}

/**
 * Extension deactivation function
 */
export function deactivate(): void {
  // Cleanup is handled by the extension's dispose method
}
