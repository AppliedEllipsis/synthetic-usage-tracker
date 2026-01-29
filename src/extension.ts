import * as vscode from "vscode";
import { ConfigurationManager } from "./config/configuration";
import { SyntheticService, ApiError, ApiErrorType, UsageInfo } from "./api/syntheticService";
import { UsageIndicator } from "./statusBar/usageIndicator";
import { formatApiKeySuffix } from "./utils/apiKeyUtils";
import { ModelManager, ModelUpdateResult } from "./model/modelManager";
import { ModelIndicator } from "./model/modelIndicator";
import { PopupPanel } from "./ui/popupPanel";
import { ApiKeyManagerPanel } from "./ui/apiKeyManagerPanel";
import type { ModelData } from "./model/detailsPanel";

/**
 * Main extension class
 * Coordinates between configuration, API service, and UI components
 */
export class SyntheticUsageTrackerExtension {
  private configManager: ConfigurationManager;
  private usageIndicator: UsageIndicator;
  // Model tracking components - positioned left of usage indicator (priority 99 vs 100)
  // Design decision: Model indicator at priority 99 ensures it appears immediately left of
  // the usage indicator, creating a logical grouping of related information without
  // consuming excessive status bar real estate
  private modelManager: ModelManager;
  private modelIndicator: ModelIndicator;
  // Multi-pane popup panel for displaying usage and model information
  // Design decision: Replaces DetailsPanel with a popup that appears as a modal overlay
  // instead of opening in a new window. This provides a more integrated user experience.
  // Note: PopupPanel uses static factory pattern with singleton, so we store reference
  // to the current panel for updating data, but creation is done via PopupPanel.createOrShow()
  private popupPanel: PopupPanel | null = null;
  // Track initialization state to prevent race conditions during early lifecycle events
  private isInitialized: boolean = false;
  // Prevent concurrent API requests that could lead to stale data or unnecessary load
  private isFetching: boolean = false;
  // Watcher for cross-window key updates - kept as reference for proper cleanup on deactivation
  private sharedStateWatcherDisposable: vscode.Disposable | null = null;
  // Watcher for cross-window model updates
  private modelStateWatcherDisposable: vscode.Disposable | null = null;
  // Auto-refresh timer for model data
  // Design decision: Separate timer from usage data because models change less frequently
  // and use a different refresh interval. This allows independent refresh cycles.
  private modelAutoRefreshTimer: NodeJS.Timeout | null = null;
  // Cache for the most recent usage data to display in popup panel
  // Design decision: Store data in extension to bridge between API service and webview panel
  // The panel is recreated on demand, so we need to persist data between show() calls
  private currentUsageData: UsageInfo | undefined;
  // Cache for the most recent model data to display in popup panel
  // Design decision: Store model data in a ModelData wrapper to match the expected type
  // for panel.update(). This avoids type mismatches when passing data to the panel.
  private currentModelData: ModelData | undefined;

  constructor(private context: vscode.ExtensionContext) {
    this.configManager = new ConfigurationManager(context);
    this.usageIndicator = new UsageIndicator(context);
    this.modelManager = new ModelManager(context);
    this.modelIndicator = new ModelIndicator(context);
    // Initialize panels - created on demand but stored for reuse
    // Design decision: Panels are created lazily when first shown to avoid
    // unnecessary resource allocation. The panels are then reused on subsequent
    // shows to maintain state and improve performance.
    this.popupPanel = null;

    // Register callbacks early in constructor to ensure we catch all configuration changes,
    // including those that might occur before activation completes
    this.configManager.onConfigChange(() => this.handleConfigChange());
    this.configManager.onKeysRefreshed(() => this.handleKeysRefreshed());
    // Register model change callback for cross-window synchronization
    this.modelManager.onModelsUpdated((result) => this.handleModelsUpdated(result));
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
      // Start watching for cross-window model updates for multi-window consistency
      this.modelStateWatcherDisposable = this.modelManager.watchSharedStateChanges();

      // Design decision: Set isInitialized to true BEFORE calling initialize() to ensure
      // that any callbacks triggered during initialization (like model updates from the
      // modelManager) are properly handled. Without this, the handleModelsUpdated callback
      // would silently ignore updates because isInitialized is still false.
      this.isInitialized = true;

      await this.initialize();
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
    // Fetch models in parallel with usage data - uses minimal real-estate via status bar indicator
    await this.refreshModels();

    const config = this.configManager.getConfig();
    // Start auto-refresh only after successful initial fetch to avoid continuous error cycles
    this.usageIndicator.startAutoRefresh(
      config.refreshInterval,
      () => this.refreshUsage(),
    );
    // Start model auto-refresh if model tracking is enabled
    // Design decision: Separate timer from usage data because models change less frequently
    // and use a different refresh interval. This allows independent refresh cycles.
    if (config.enableModelTracking) {
      this.startModelAutoRefresh(config.modelCheckInterval);
    }
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

    // Model-related commands
    const showModelsCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.showModels",
      () => this.showModels(),
    );
    this.context.subscriptions.push(showModelsCommand);

    const checkModelUpdatesCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.checkModelUpdates",
      () => this.checkModelUpdates(),
    );
    this.context.subscriptions.push(checkModelUpdatesCommand);

    const clearModelChangesCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.clearModelChanges",
      () => this.clearModelChanges(),
    );
    this.context.subscriptions.push(clearModelChangesCommand);

    // API key management commands for multi-profile support
    const manageApiKeysCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.manageApiKeys",
      () => this.manageApiKeys(),
    );
    this.context.subscriptions.push(manageApiKeysCommand);

    const cycleApiKeyCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.cycleApiKey",
      () => this.cycleApiKey(),
    );
    this.context.subscriptions.push(cycleApiKeyCommand);

    const addApiKeyCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.addApiKey",
      () => this.addApiKey(),
    );
    this.context.subscriptions.push(addApiKeyCommand);

    const deleteApiKeyCommand = vscode.commands.registerCommand(
      "syntheticUsageTracker.deleteApiKey",
      () => this.deleteApiKey(),
    );
    this.context.subscriptions.push(deleteApiKeyCommand);
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

      // Store usage data for display in details panel
      this.currentUsageData = usage;

      // Format API key suffix for display in tooltip
      // Security decision: Only show the last 6 characters to prevent full key exposure
      const apiKeySuffix = formatApiKeySuffix(apiKey);

      // Update status bar indicator
      this.usageIndicator.updateUsage(usage, {
        showPercentage: config.showPercentage,
        showRawNumbers: config.showRawNumbers,
        warningThreshold: config.warningThreshold,
        criticalThreshold: config.criticalThreshold,
        enableNotifications: config.enableNotifications,
      }, apiKeySuffix);

      // Update popup panel if it's open
      // Design decision: Panel is updated after status bar to ensure data consistency
      // If panel doesn't exist, we skip this step (panel will get data when created)
      if (this.popupPanel) {
        this.popupPanel.updateUsage(usage);
      }
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
      try {
        const apiKeyManager = this.configManager.getApiKeyManager();
        const activeProfile = await apiKeyManager.getActiveProfile();
        
        if (activeProfile) {
          await apiKeyManager.deleteProfile(activeProfile.id);
        }
        
        // Design decision: Use setPleaseSetKey() instead of setIdle() to provide clear user guidance
        // This displays "Please Set Key" message and properly clears all cached values
        this.usageIndicator.setPleaseSetKey();
        this.usageIndicator.stopAutoRefresh();
        vscode.window.showInformationMessage("API key erased successfully");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        vscode.window.showErrorMessage(`Failed to erase API key: ${message}`);
      }
    }
  }

  /**
   * Show usage details in the unified details panel
   */
  private async showUsageDetails(): Promise<void> {
    // Design decision: Use PopupPanel's static factory method to create or show panel
    // The singleton pattern prevents duplicate panels and ensures consistent UX
    // Panel will show cached usage data if available, or loading state otherwise
    this.popupPanel = PopupPanel.createOrShow(this.context, "usage");
    if (this.currentUsageData) {
      this.popupPanel.updateUsage(this.currentUsageData);
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
   * Manage API keys - opens the API key manager panel
   */
  private async manageApiKeys(): Promise<void> {
    // Design decision: Use static factory method to create or show the panel
    // The singleton pattern prevents duplicate panels and ensures consistent UX
    // Note: ApiKeyManagerPanel manages its own singleton instance internally
    const apiKeyManager = this.configManager.getApiKeyManager();
    ApiKeyManagerPanel.createOrShow(this.context.extensionUri, apiKeyManager);
  }

  /**
   * Cycle API key - switch to the next profile
   */
  private async cycleApiKey(): Promise<void> {
    try {
      const apiKeyManager = this.configManager.getApiKeyManager();
      const newActiveProfile = await apiKeyManager.cycleProfiles();

      if (newActiveProfile) {
        await this.refreshUsage();
        const config = this.configManager.getConfig();
        if (config.enableNotifications) {
          vscode.window.showInformationMessage(
            `Switched to profile: ${newActiveProfile.label}`,
          );
        }
      } else {
        vscode.window.showWarningMessage(
          "No API key profiles configured. Please add an API key first.",
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      vscode.window.showErrorMessage(`Failed to cycle API key: ${message}`);
    }
  }

  /**
   * Add API key - prompt user to add a new API key
   */
  private async addApiKey(): Promise<void> {
    try {
      const apiKeyManager = this.configManager.getApiKeyManager();
      const profiles = await apiKeyManager.getProfiles();

      // Generate default label based on existing profile count
      const defaultLabel = `Profile ${profiles.length + 1}`;

      const label = await vscode.window.showInputBox({
        prompt: "Enter a label for this API key",
        placeHolder: defaultLabel,
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return "Label cannot be empty";
          }
          return null;
        },
      });

      if (!label) {
        return; // User cancelled
      }

      const placeholder = "syn_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
      const input = await vscode.window.showInputBox({
        prompt: "Enter your Synthetic.new API key",
        placeHolder: placeholder,
        password: true,
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return "API key cannot be empty";
          }
          if (!value.startsWith("syn_")) {
            return "Invalid API key format. API keys should start with 'syn_'";
          }
          return null;
        },
      });

      if (input) {
        await apiKeyManager.addProfile(input, label);
        await this.refreshUsage();
        vscode.window.showInformationMessage(
          `API key "${label}" added successfully`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      vscode.window.showErrorMessage(`Failed to add API key: ${message}`);
    }
  }

  /**
   * Delete API key - delete the currently active profile
   */
  private async deleteApiKey(): Promise<void> {
    try {
      const apiKeyManager = this.configManager.getApiKeyManager();
      const activeProfile = await apiKeyManager.getActiveProfile();

      if (!activeProfile) {
        vscode.window.showWarningMessage(
          "No active API key profile to delete",
        );
        return;
      }

      const profiles = await apiKeyManager.getProfiles();
      const profileCount = profiles.length;

      // Design decision: Show different warning message based on whether it's the last profile
      // This helps users understand the implications of deleting the last profile
      const warningMessage =
        profileCount === 1
          ? "This is your only API key profile. Deleting it will remove all API keys. You will need to re-enter an API key to continue tracking usage."
          : `Are you sure you want to delete the profile "${activeProfile.label}"? You have ${profileCount - 1} other profile(s).`;

      const result = await vscode.window.showWarningMessage(
        warningMessage,
        { modal: true },
        "Delete",
      );

      if (result === "Delete") {
        await apiKeyManager.deleteProfile(activeProfile.id);

        // Check if there are any remaining profiles
        const remainingProfiles = await apiKeyManager.getProfiles();
        if (remainingProfiles.length === 0) {
          this.usageIndicator.setPleaseSetKey();
          this.usageIndicator.stopAutoRefresh();
        } else {
          await this.refreshUsage();
        }

        vscode.window.showInformationMessage(
          `Profile "${activeProfile.label}" deleted successfully`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      vscode.window.showErrorMessage(`Failed to delete API key: ${message}`);
    }
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
   * Refresh models data from the API
   *
   * Design decision: Fetch models separately from usage data to allow independent
   * refresh cycles. Models change less frequently than usage, so they use a longer
   * refresh interval. This minimizes API calls while keeping information current.
   */
  private async refreshModels(): Promise<void> {
    try {
      const apiKey = await this.configManager.getApiKey();
      if (!apiKey) {
        this.modelIndicator.setIdle();
        return;
      }

      const result = await this.modelManager.fetchAndUpdateModels(apiKey);

      // Store complete model data including changes and timestamp
      // Design decision: Include all ModelData properties (models, changes, lastUpdated)
      // to match the interface expected by DetailsPanel.update(). The ModelManager already
      // provides changes detection, so we use it directly rather than reimplementing.
      this.currentModelData = {
        models: result.models,
        changes: result.changes,
        lastUpdated: new Date(),
      };

      // Update indicator based on result
      if (result.hasChanges && !result.isFirstFetch) {
        this.modelIndicator.setChangesDetected(result.changes);
      } else {
        this.modelIndicator.setReady(result.models.length);
      }

      // Show notification for new changes if enabled and not first fetch
      const config = this.configManager.getConfig();
      if (result.hasChanges && !result.isFirstFetch && config.enableNotifications) {
        const changeCount = result.changes.length;
        const message =
          changeCount === 1
            ? "1 model change detected. Click the models indicator to view details."
            : `${changeCount} model changes detected. Click the models indicator to view details.`;
        vscode.window.showInformationMessage(message);
      }

      // Update popup panel if it's open with models tab
      // Design decision: Panel is updated after indicator to ensure data consistency
      if (this.popupPanel && this.currentModelData) {
        this.popupPanel.updateModels(this.currentModelData);
      }
    } catch (error) {
      console.error("Failed to fetch models:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      this.modelIndicator.setError(message);
    }
  }

  /**
   * Show models in the unified popup panel
   */
  private async showModels(): Promise<void> {
    // Design decision: Use PopupPanel's static factory method to create or show panel
    // The singleton pattern prevents duplicate panels and ensures consistent UX
    // Panel will show cached model data if available, or loading state otherwise
    this.popupPanel = PopupPanel.createOrShow(this.context, "models");
    if (this.currentModelData) {
      this.popupPanel.updateModels(this.currentModelData);
    }

    // Clear unread changes indicator after viewing
    this.modelIndicator.clearChanges();
  }

  /**
   * Manually check for model updates
   */
  private async checkModelUpdates(): Promise<void> {
    this.modelIndicator.setLoading();
    await this.refreshModels();
    vscode.window.showInformationMessage("Model update check completed.");
  }

  /**
   * Clear model change notifications
   */
  private clearModelChanges(): void {
    this.modelIndicator.clearChanges();
    vscode.window.showInformationMessage("Model change notifications cleared.");
  }

  /**
   * Handle model updates from cross-window synchronization
   */
  private async handleModelsUpdated(_result: ModelUpdateResult): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      const models = this.modelManager.getCurrentModels();
      if (models.length === 0) {
        this.modelIndicator.setIdle();
        return;
      }

      this.modelIndicator.setReady(models.length);

      const config = this.configManager.getConfig();
      if (config.enableNotifications) {
        vscode.window.showInformationMessage(
          "Models updated in another window. Model data refreshed.",
        );
      }
    } catch (error) {
      console.error("Failed to handle models updated:", error);
    }
  }

  /**
   * Start auto-refresh for model data
   *
   * Design decision: Separate timer from usage data because models change less frequently
   * and use a different refresh interval. This allows independent refresh cycles.
   */
  private startModelAutoRefresh(intervalMinutes: number): void {
    this.stopModelAutoRefresh(); // Clear existing timer first

    // Convert minutes to milliseconds for setInterval
    const intervalMs = intervalMinutes * 60 * 1000;

    this.modelAutoRefreshTimer = setInterval(() => {
      this.refreshModels();
    }, intervalMs);
  }

  /**
   * Stop auto-refresh for model data
   *
   * Design decision: Clear timer to prevent memory leaks and unnecessary API calls
   * when the extension is deactivated or model tracking is disabled.
   */
  private stopModelAutoRefresh(): void {
    if (this.modelAutoRefreshTimer) {
      clearInterval(this.modelAutoRefreshTimer);
      this.modelAutoRefreshTimer = null;
    }
  }

  /**
   * Deactivate the extension
   *
   * Design decision: Stop model auto-refresh before disposing model indicator to prevent
   * memory leaks and unnecessary API calls. Timers must be cleared before their callbacks
   * are disposed to avoid accessing disposed resources.
   */
  deactivate(): void {
    this.stopModelAutoRefresh(); // Clear model auto-refresh timer
    this.popupPanel?.dispose(); // Dispose popup panel if it exists
    this.usageIndicator.dispose();
    this.configManager.dispose();
    this.sharedStateWatcherDisposable?.dispose();
    this.modelIndicator.dispose();
    this.modelStateWatcherDisposable?.dispose();
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
