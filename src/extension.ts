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
  private sharedStateWatcherDisposable: vscode.Disposable | null = null;

  constructor(private context: vscode.ExtensionContext) {
    this.configManager = new ConfigurationManager(context);
    this.usageIndicator = new UsageIndicator(context);

    this.configManager.onConfigChange(() => this.handleConfigChange());
    this.configManager.onKeysRefreshed(() => this.handleKeysRefreshed());
  }

  /**
   * Activate the extension
   */
  async activate(): Promise<void> {
    try {
      this.registerCommands();
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
   */
  private async initialize(): Promise<void> {
    const hasApiKey = await this.configManager.hasApiKey();

    if (!hasApiKey) {
      this.usageIndicator.setIdle();
      return;
    }

    await this.refreshUsage();

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
    const refreshCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.refresh",
      () => this.refreshUsage(),
    );
    this.context.subscriptions.push(refreshCommand);

    const refreshKeysCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.refreshKeys",
      () => this.refreshKeys(),
    );
    this.context.subscriptions.push(refreshKeysCommand);

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
   */
  private async refreshUsage(): Promise<void> {
    if (this.isFetching) {
      return;
    }

    this.isFetching = true;
    this.usageIndicator.setLoading();

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
      this.usageIndicator.setError(message);

      const config = this.configManager.getConfig();
      if (config.enableNotifications) {
        vscode.window.showErrorMessage(`Failed to fetch Synthetic.new usage: ${message}`);
      }
    } finally {
      this.isFetching = false;
    }
  }

  /**
   * Refresh API key from shared store
   * This allows the extension to detect the key updated in other VS Code windows
   */
  private async refreshKeys(): Promise<void> {
    try {
      const result = await this.configManager.refreshKeys();

      if (!result.hasKey) {
        vscode.window.showInformationMessage("No API key configured.");
        return;
      }

      vscode.window.showInformationMessage("API key refreshed successfully.");

      await this.refreshUsage();
    } catch (error) {
      console.error("Failed to refresh key:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      vscode.window.showErrorMessage(`Failed to refresh API key: ${message}`);
    }
  }

  /**
   * Configure the API key
   */
  private async configureApiKey(): Promise<void> {
    const currentApiKey = await this.configManager.getApiKey();
    const placeholder = currentApiKey || "syn_...";

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
   * Show usage details in a message box
   */
  private async showUsageDetails(): Promise<void> {
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
   * Subscribe with discount - opens the referral link
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
