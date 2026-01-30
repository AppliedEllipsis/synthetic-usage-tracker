import * as vscode from "vscode";
import { ConfigurationManager } from "./config/configuration";
import { SyntheticService, ApiError, ApiErrorType, type UsageInfo } from "./api/syntheticService";
import { UsageIndicator } from "./statusBar/usageIndicator";

/**
 * Main extension class
 * Coordinates between configuration, API service, and UI components
 */
export class SyntheticUsageTrackerExtension {
  private configManager: ConfigurationManager;
  private usageIndicator: UsageIndicator;
  // Track initialization state to prevent race conditions during early lifecycle events
  private isInitialized: boolean = false;
  // Prevent concurrent API requests that could lead to stale data or unnecessary load
  private isFetching: boolean = false;
  // Watcher for cross-window key updates - kept as reference for proper cleanup on deactivation
  private sharedStateWatcherDisposable: vscode.Disposable | null = null;

  constructor(private context: vscode.ExtensionContext) {
    this.configManager = new ConfigurationManager(context);
    this.usageIndicator = new UsageIndicator(context);

    // Register callbacks early in constructor to ensure we catch all configuration changes,
    // including those that might occur before activation completes
    this.configManager.onConfigChange(() => this.handleConfigChange());
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
      // Register commands before initialization so they're always available, even if API fails
      this.registerCommands();
      // Start watching for cross-window key updates immediately to ensure synchronization
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
    const apiKey = await this.configManager.getApiKey();

    // Design decision: Prompt for API key on first launch if missing or empty
    if (!apiKey || apiKey.trim().length === 0) {
      // Prompt user to set API key
      await this.configureApiKey();
    }

    // Re-check key configuration after prompt attempt
    const finalApiKey = await this.configManager.getApiKey();
    if (!finalApiKey || finalApiKey.trim().length === 0) {
      this.usageIndicator.setIdle();
      return;
    }

    // Fetch initial usage data before starting auto-refresh to ensure UI has valid data immediately
    await this.refreshUsage();

    const refreshConfig = this.configManager.getConfig();
    // Start auto-refresh only after successful initial fetch to avoid continuous error cycles
    this.usageIndicator.startAutoRefresh(
      refreshConfig.refreshInterval,
      () => this.refreshUsage(),
    );
  }

  /**
   * Register extension commands
   */
  private registerCommands(): void {
    const refreshCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.refresh",
      () => this.refreshUsage(),
    );
    this.context.subscriptions.push(refreshCommand);

    const configureCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.configure",
      () => this.configureApiKey(),
    );
    this.context.subscriptions.push(configureCommand);

    const showUsageCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.showUsage",
      () => this.showUsageDetails(),
    );
    this.context.subscriptions.push(showUsageCommand);

    const toggleAutoRefreshCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.toggleAutoRefresh",
      () => this.toggleAutoRefresh(),
    );
    this.context.subscriptions.push(toggleAutoRefreshCommand);

    const eraseKeyCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.eraseKey",
      () => this.eraseKey(),
    );
    this.context.subscriptions.push(eraseKeyCommand);

    const openDashboardCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.openDashboard",
      () => this.openDashboard(),
    );
    this.context.subscriptions.push(openDashboardCommand);

    const subscribeWithDiscountCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.subscribeWithDiscount",
      () => this.subscribeWithDiscount(),
    );
    this.context.subscriptions.push(subscribeWithDiscountCommand);

    // Multi-key cycling commands
    const addKeyCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.addKey",
      () => this.addKey(),
    );
    this.context.subscriptions.push(addKeyCommand);

    const removeKeyCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.removeKey",
      () => this.removeKey(),
    );
    this.context.subscriptions.push(removeKeyCommand);

    const selectKeyCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.selectKey",
      () => this.selectKey(),
    );
    this.context.subscriptions.push(selectKeyCommand);

    const cycleKeysCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.cycleKeys",
      () => this.cycleKeys(),
    );
    this.context.subscriptions.push(cycleKeysCommand);

    const listKeysCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.listKeys",
      () => this.listKeys(),
    );
    this.context.subscriptions.push(listKeysCommand);

    const resetStatisticsCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.resetStatistics",
      () => this.resetStatistics(),
    );
    this.context.subscriptions.push(resetStatisticsCommand);
  }

  /**
   * Refresh usage data from the API
   *
   * Design decision: Do not show loading icon during refresh to avoid visual flickering.
   * The status bar will only update when new data arrives, providing a cleaner user experience.
   */
  private async refreshUsage(): Promise<void> {
    if (this.isFetching) {
      return;
    }

    this.isFetching = true;

    try {
      const apiKey = await this.configManager.getApiKey();
      if (!apiKey) {
        this.usageIndicator.setIdle();
        return;
      }

      const config = this.configManager.getConfig();

      const service = new SyntheticService(apiKey, config.apiEndpoint);
      const usage = await service.fetchQuota();

      this.usageIndicator.updateUsage(usage, {
        showPercentage: config.showPercentage,
        showRawNumbers: config.showRawNumbers,
        warningThreshold: config.warningThreshold,
        criticalThreshold: config.criticalThreshold,
        enableNotifications: config.enableNotifications,
      });
    } catch (error) {
      console.error("Failed to fetch usage:", error);
      const message = error instanceof Error ? error.message : "Unknown error";

      // Map ApiErrorType to UsageIndicator error type strings
      // Design rationale: This mapping enables contextual error handling when users click the status bar.
      // Authentication and NoSubscription errors trigger API key re-entry prompts, while other errors
      // show generic usage details. This provides a clear path for users to fix API key issues.
      let errorType: "authentication" | "noSubscription" | "other" = "other";
      if (error instanceof ApiError) {
        if (error.type === ApiErrorType.Authentication) {
          errorType = "authentication";
        } else if (error.type === ApiErrorType.NoSubscription) {
          errorType = "noSubscription";
        }
      }

      this.usageIndicator.setError(message, errorType);

      const config = this.configManager.getConfig();
      if (config.enableNotifications) {
        vscode.window.showErrorMessage(`Failed to fetch Synthetic.new usage: ${message}`);
      }
    } finally {
      this.isFetching = false;
    }
  }

  /**
   * Configure the API key
   *
   * Design decision: Accept an optional custom prompt message to provide contextual
   * guidance when users are prompted to enter a new API key. This allows reusing
   * the same configuration flow for different scenarios (e.g., initial setup vs.
   * error recovery) with appropriate messaging for each case.
   */
  private async configureApiKey(customPrompt?: string): Promise<void> {
    const currentApiKey = await this.configManager.getApiKey();
    const placeholder = currentApiKey || "syn_...";

    const input = await vscode.window.showInputBox({
      prompt: customPrompt || "Enter your Synthetic.new API key",
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
      return;
    }

    const apiKey = input.trim();

    await this.configManager.setApiKey(apiKey);

    vscode.window.showInformationMessage("API key saved successfully");

    await this.refreshUsage();

    const config = this.configManager.getConfig();
    this.usageIndicator.updateAutoRefreshInterval(
      config.refreshInterval,
      () => this.refreshUsage(),
    );
  }

  /**
   * Erase the stored API key
   */
  private async eraseKey(): Promise<void> {
    // Design decision: Don't explicitly add "Cancel" button - VSCode provides it automatically
    // Adding it explicitly would create duplicate cancel buttons in the dialog
    const result = await vscode.window.showWarningMessage(
      "Are you sure you want to erase your API key? You will need to re-enter it to continue tracking usage.",
      { modal: true },
      "Erase Key",
    );

    if (result === "Erase Key") {
      await this.configManager.deleteApiKey();
      // Design decision: Use setPleaseSetKey() instead of setIdle() to provide clear user guidance
      // This displays "Please Set Key" message and properly clears all cached values
      this.usageIndicator.setPleaseSetKey();
      this.usageIndicator.stopAutoRefresh();
      vscode.window.showInformationMessage("API key erased successfully");
    }
  }

  /**
   * Show usage details in a message box
   *
   * Design decision: Check error state before showing usage details. When the status bar
   * is in an error state due to invalid API key or no subscription, prompt the user to
   * enter a new API key instead of showing usage details. This provides a clear path
   * for users to fix the issue and improves user experience by guiding them to the
   * solution directly.
   */
  private async showUsageDetails(): Promise<void> {
    // Check if status bar is in an error state due to authentication or no subscription
    const errorType = this.usageIndicator.getErrorType();
    if (errorType === "authentication" || errorType === "noSubscription") {
      // Prompt user to enter a new API key with contextual message
      await this.configureApiKey("Invalid API key or no active subscription. Please enter a valid API key.");
      return;
    }

    const usage = this.usageIndicator.getCurrentUsage();
    if (!usage) {
      vscode.window.showInformationMessage("No usage data available. Try refreshing.");
      return;
    }

    const percentageUsed = usage.percentageUsed.toFixed(1);
    const percentageRemaining = ((1 - usage.percentageUsed / 100) * 100).toFixed(1);

    const now = new Date();
    const diff = usage.renewsAt.getTime() - now.getTime();
    let timeRemaining = "0 hours and 0 minutes";
    if (diff > 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const hourText = hours === 1 ? "hour" : "hours";
      const minuteText = minutes === 1 ? "minute" : "minutes";
      timeRemaining = `${hours} ${hourText} and ${minutes} ${minuteText}`;
    }

    const message = `
Synthetic.new Usage Details
━━━━━━━━━━━━━━━━━━━━━
Requests Used: ${usage.requests.toLocaleString()}
Requests Limit: ${usage.limit.toLocaleString()}
Requests Remaining: ${usage.remaining.toLocaleString()}

Percentage Used: ${percentageUsed}%
Percentage Remaining: ${percentageRemaining}%

Time Remaining: ${timeRemaining}
Renews At: ${usage.renewsAtString}
`.trim();

    const result = await vscode.window.showInformationMessage(
      message,
      { modal: true },
      "Refresh",
      "Open Dashboard",
      "Subscribe with Discount",
    );

    if (result === "Refresh") {
      await this.refreshUsage();
    } else if (result === "Open Dashboard") {
      this.openDashboard();
    } else if (result === "Subscribe with Discount") {
      this.subscribeWithDiscount();
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
    vscode.env.openExternal(vscode.Uri.parse("https://synthetic.new/billing"));
  }

  /**
   * Subscribe with Discount - opens the referral link
   */
  private subscribeWithDiscount(): void {
    vscode.env.openExternal(vscode.Uri.parse("https://synthetic.new/?referral=4JZcLOKgRmZ4o6k"));
  }

  /**
   * Handle configuration changes
   */
  private handleConfigChange(): void {
    if (this.isInitialized) {
      const config = this.configManager.getConfig();
      this.usageIndicator.updateAutoRefreshInterval(
        config.refreshInterval,
        () => this.refreshUsage(),
      );
    }
  }

  /**
   * Handle key refreshed from another window
   * Automatically refreshes usage data when the key is updated in another VS Code window
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
        vscode.window.showInformationMessage("API key updated in another window. Usage data refreshed.");
      }
    } catch (error) {
      console.error("Failed to handle key refreshed:", error);
    }
  }

  /**
   * Add a new API key
   * Prompts user for API key and optional label, then adds it to the key collection
   */
  private async addKey(): Promise<void> {
    const keyInput = await vscode.window.showInputBox({
      prompt: "Enter your Synthetic.new API key",
      placeHolder: "syn_xxxxxxxxxx",
      password: true,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return "API key cannot be empty";
        }
        const trimmedValue = value.trim();
        if (!trimmedValue.startsWith("syn_")) {
          return "Invalid API key format. API keys should start with 'syn_'";
        }
        return null;
      },
    });

    if (keyInput === undefined) {
      return;
    }

    const apiKey = keyInput.trim();

    const labelInput = await vscode.window.showInputBox({
      prompt: "Enter a label for this key (optional)",
      placeHolder: "e.g., Production, Development, Backup",
    });

    const label = labelInput?.trim() || undefined;

    try {
      await this.keyManager.addApiKey(apiKey, label, ActivationReason.CollectionModified);
      vscode.window.showInformationMessage("API key added successfully");

      // Refresh usage if this is the first key
      const keys = await this.keyManager.getAllKeys();
      if (keys.length === 1) {
        await this.refreshUsage();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add API key";
      vscode.window.showErrorMessage(message);
    }
  }

  /**
   * Remove an API key
   * Shows list of keys and removes the selected one
   */
  private async removeKey(): Promise<void> {
    const keys = await this.keyManager.getAllKeys();

    if (keys.length === 0) {
      vscode.window.showInformationMessage("No API keys configured");
      return;
    }

    if (keys.length === 1) {
      const result = await vscode.window.showWarningMessage(
        "This is the only configured API key. Removing it will disable tracking until you add another key.",
        { modal: true },
        "Remove Key",
      );

      if (result !== "Remove Key") {
        return;
      }
    }

    const items: vscode.QuickPickItem[] = keys.map((entry) => ({
      label: entry.label ? `${entry.label} (...${entry.key.slice(-4)})` : `...${entry.key.slice(-4)}`,
      description: entry.key,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "Select an API key to remove",
    });

    if (!selected) {
      return;
    }

    const keyToRemove = keys.find((entry) => entry.key === selected.description);
    if (!keyToRemove) {
      return;
    }

    try {
      await this.keyManager.removeApiKey(keyToRemove.id);
      vscode.window.showInformationMessage("API key removed successfully");

      // Update status bar if no keys remain
      const remainingKeys = await this.keyManager.getAllKeys();
      if (remainingKeys.length === 0) {
        this.usageIndicator.setPleaseSetKey();
        this.usageIndicator.stopAutoRefresh();
      } else {
        await this.refreshUsage();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove API key";
      vscode.window.showErrorMessage(message);
    }
  }

  /**
   * Select an API key to use
   * Shows list of keys and activates the selected one
   */
  private async selectKey(): Promise<void> {
    const keys = await this.keyManager.getAllKeys();

    if (keys.length === 0) {
      vscode.window.showInformationMessage("No API keys configured. Add a key first.");
      return;
    }

    if (keys.length === 1) {
      vscode.window.showInformationMessage("Only one API key configured");
      return;
    }

    const activeKey = await this.keyManager.getActiveKey();

    const items: vscode.QuickPickItem[] = keys.map((entry) => ({
      label: entry.label ? `${entry.label} (...${entry.key.slice(-4)})` : `...${entry.key.slice(-4)}`,
      description: entry.key,
      picked: entry.key === activeKey,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "Select an API key to use",
    });

    if (!selected) {
      return;
    }

    const keyToSelect = keys.find((entry) => entry.key === selected.description);
    if (!keyToSelect) {
      return;
    }

    try {
      const selectedIndex = keys.indexOf(keyToSelect);
      await this.keyManager.setActiveKeyByIndex(selectedIndex, ActivationReason.ManualSelection);
      vscode.window.showInformationMessage("API key selected successfully");
      await this.refreshUsage();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to select API key";
      vscode.window.showErrorMessage(message);
    }
  }

  /**
   * Cycle to the next API key
   * Manually cycles to the next key based on the configured strategy
   */
  private async cycleKeys(): Promise<void> {
    const keys = await this.keyManager.getAllKeys();

    if (keys.length === 0) {
      vscode.window.showInformationMessage("No API keys configured. Add a key first.");
      return;
    }

    if (keys.length === 1) {
      vscode.window.showInformationMessage("Only one API key configured");
      return;
    }

    try {
      const activeEntry = await this.keyManager.getActiveEntry();
      const activeIndex = activeEntry ? await this.keyManager.getActiveIndex() : 0;
      const result = await this.keyCyclingService?.cycleKey(keys, activeIndex);
      if (result?.didCycle) {
        vscode.window.showInformationMessage(`Switched to API key: ...${result.entry.key.slice(-4)}`);
        await this.refreshUsage();
      } else {
        vscode.window.showInformationMessage("No other API keys available to cycle to");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to cycle API keys";
      vscode.window.showErrorMessage(message);
    }
  }

  /**
   * List all configured API keys with statistics
   * Shows a formatted list of keys with their usage statistics
   */
  private async listKeys(): Promise<void> {
    const keys = await this.keyManager.getAllKeys();

    if (keys.length === 0) {
      vscode.window.showInformationMessage("No API keys configured");
      return;
    }

    const activeKey = await this.keyManager.getActiveKey();

    let message = `Synthetic.new API Keys (${keys.length} configured)\n`;
    message += `${"=".repeat(40)}\n\n`;

    for (let i = 0; i < keys.length; i++) {
      const entry = keys[i]!; // eslint-disable-line @typescript-eslint/no-non-null-assertion -- Safe: array index is guaranteed by loop bounds
      const isActive = entry.key === activeKey;
      const statistics = await this.keyManager.getKeyStatistics(entry.id);

      message += `${isActive ? "★ " : "  "}Key ${i + 1}: ${entry.label || "No label"}\n`;
      message += `  ID: ...${entry.key.slice(-4)}\n`;
      message += `  Priority: ${entry.priority ?? "Not set"}\n`;
      message += `  Failures: ${statistics?.totalFailures ?? 0}\n`;
      message += `  Activations: ${statistics?.activationHistory?.length ?? 0}\n`;

      if (statistics?.quota) {
        const quota = statistics.quota;
        const percentage = quota.requests / quota.limit * 100;
        message += `  Quota: ${quota.requests.toLocaleString()} / ${quota.limit.toLocaleString()} (${percentage.toFixed(1)}%)\n`;
      } else {
        message += `  Quota: Not available\n`;
      }

      message += "\n";
    }

    const result = await vscode.window.showInformationMessage(
      message,
      { modal: true },
      "Add Key",
      "Remove Key",
      "Select Key",
    );

    if (result === "Add Key") {
      await this.addKey();
    } else if (result === "Remove Key") {
      await this.removeKey();
    } else if (result === "Select Key") {
      await this.selectKey();
    }
  }

  /**
   * Reset usage statistics for all API keys
   * Clears failure counts, quota information, and activation history
   */
  private async resetStatistics(): Promise<void> {
    const keys = await this.keyManager.getAllKeys();

    if (keys.length === 0) {
      vscode.window.showInformationMessage("No API keys configured");
      return;
    }

    const result = await vscode.window.showWarningMessage(
      "This will reset all usage statistics including failure counts, quota information, and activation history for all API keys. This action cannot be undone.",
      { modal: true },
      "Reset Statistics",
    );

    if (result !== "Reset Statistics") {
      return;
    }

    try {
      await this.keyManager.resetAllStatistics();
      vscode.window.showInformationMessage("Statistics reset successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reset statistics";
      vscode.window.showErrorMessage(message);
    }
  }

  /**
   * Deactivate the extension
   */
  deactivate(): void {
    this.usageIndicator.dispose();
    this.configManager.dispose();
    this.keyManager.dispose();
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
 * Cleanup is handled by the extension instance's deactivate method
 */
export function deactivate(): void {
}
