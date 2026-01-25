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
  private syntheticService: SyntheticService | null = null;
  private isInitialized: boolean = false;
  private isFetching: boolean = false;

  constructor(private context: vscode.ExtensionContext) {
    this.configManager = new ConfigurationManager(context);
    this.usageIndicator = new UsageIndicator(context);

    // Watch for configuration changes
    this.configManager.onConfigChange(() => this.handleConfigChange());
  }

  /**
   * Activate the extension
   */
  async activate(): Promise<void> {
    try {
      // Register commands
      this.registerCommands();

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
      // Get API key
      const apiKey = await this.configManager.getApiKey();
      if (!apiKey) {
        this.usageIndicator.setIdle();
        return;
      }

      // Get configuration
      const config = this.configManager.getConfig();

      // Create or update service
      if (!this.syntheticService) {
        this.syntheticService = new SyntheticService(apiKey, config.apiEndpoint);
      } else {
        this.syntheticService.updateApiKey(apiKey);
        this.syntheticService.updateApiEndpoint(config.apiEndpoint);
      }

      // Fetch quota
      const usage = await this.syntheticService.fetchQuota();

      // Update indicator
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

    // Store the API key
    await this.configManager.setApiKey(apiKey);

    // Show success message
    vscode.window.showInformationMessage("API key saved successfully");

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
   * Deactivate the extension
   */
  deactivate(): void {
    this.usageIndicator.dispose();
    this.configManager.dispose();
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
