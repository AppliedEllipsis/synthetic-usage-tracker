import * as vscode from "vscode";
import { ConfigurationManager } from "./config/configuration";
import { SyntheticService, ApiError, ApiErrorType } from "./api/syntheticService";
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
    // If the key is explicitly set to "none", don't prompt and show "Please Set Key" status
    if (!apiKey || apiKey.trim().length === 0) {
      // Prompt user to set API key
      await this.configureApiKey();
    } else if (apiKey === "none") {
      // User explicitly set key to "none", show prompt status without asking
      this.usageIndicator.setPleaseSetKey();
      return;
    }

    // Re-check key configuration after prompt attempt
    const finalApiKey = await this.configManager.getApiKey();
    if (!finalApiKey || finalApiKey.trim().length === 0 || finalApiKey === "none") {
      this.usageIndicator.setPleaseSetKey();
      return;
    }

    // Fetch initial usage data before starting auto-refresh to ensure UI has valid data immediately
    await this.refreshUsage();

    const config = this.configManager.getConfig();
    // Start auto-refresh only after successful initial fetch to avoid continuous error cycles
    this.usageIndicator.startAutoRefresh(
      config.refreshInterval,
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

      /**
       * Extract last 4 characters of API key for display in tooltip
       *
       * Design decision: Only display the last 4 characters to help users identify
       * which key they're using without exposing the full key for security reasons.
       * This is particularly useful when users cycle through multiple API keys.
       *
       * Security considerations:
       * - Only the last 4 characters are extracted and passed
       * - The full key is never logged or exposed
       * - If the key is shorter than 4 characters, use all available characters
       *
       * Alternative considered: Display full key
       * Rejected: Major security risk - full keys could be captured in screenshots,
       * logs, or shared inadvertently.
       */
      const apiKeySuffix: string | undefined = apiKey.length >= 4
        ? apiKey.slice(-4)
        : apiKey.length > 0
          ? apiKey
          : undefined;

      this.usageIndicator.updateUsage(usage, {
        showPercentage: config.showPercentage,
        showRawNumbers: config.showRawNumbers,
        warningThreshold: config.warningThreshold,
        criticalThreshold: config.criticalThreshold,
        enableNotifications: config.enableNotifications,
      }, apiKeySuffix);
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
 * Cleanup is handled by the extension instance's deactivate method
 */
export function deactivate(): void {
}
