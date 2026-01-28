import * as vscode from "vscode";
import { ApiKeyManager } from "./apiKeyManager";

/**
 * Configuration keys for the Synthetic Usage Tracker extension
 */
export interface Configuration {
  apiEndpoint: string;
  refreshInterval: number;
  showPercentage: boolean;
  showRawNumbers: boolean;
  enableNotifications: boolean;
  warningThreshold: number;
  criticalThreshold: number;
  // Model tracking configuration
  enableModelTracking: boolean;
  modelCheckInterval: number;
  enableModelChangeNotifications: boolean;
}

/**
 * Shared state keys for cross-window communication
 */
const SHARED_STATE_KEYS = {
  KEY_UPDATE_TIMESTAMP: 'syntheticApiKeyUpdateTimestamp',
} as const;

/**
 * Configuration manager for the extension
 * Handles reading and watching configuration changes
 *
 * Design decision: Separate configuration concerns from business logic.
 * This class provides a clean interface for accessing settings and
 * manages both workspace configuration and secure secret storage.
 *
 * The ApiKeyManager is now used for multi-profile API key management,
 * replacing the previous single-key storage approach.
 */
export class ConfigurationManager {
  private context: vscode.ExtensionContext;
  private configChangeDisposable: vscode.Disposable;
  private onConfigChangeCallback?: () => void;
  private onKeysRefreshedCallback?: () => void;

  /**
   * API Key Manager for multi-profile API key management
   *
   * Design decision: The ApiKeyManager is instantiated in the constructor
   * and exposed via getApiKeyManager(). This allows the extension to manage
   * multiple API key profiles while maintaining backward compatibility with
   * the legacy single-key methods.
   */
  private apiKeyManager: ApiKeyManager;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.apiKeyManager = new ApiKeyManager(context);
    // Start watching configuration changes immediately in constructor
    // This ensures we don't miss any changes that occur before the first access
    this.configChangeDisposable = this.watchConfigurationChanges();
  }

  getConfig(): Configuration {
    const config = vscode.workspace.getConfiguration("syntheticUsageTracker");
    return {
      // Default endpoint matches Synthetic.new production API
      apiEndpoint: config.get<string>("apiEndpoint", "https://api.synthetic.new/v2"),
      // Default 60s interval balances responsiveness with API rate limits
      refreshInterval: config.get<number>("refreshInterval", 60),
      // Percentage shown by default as it's most immediately useful
      showPercentage: config.get<boolean>("showPercentage", true),
      // Raw numbers optional to avoid cluttering the status bar
      showRawNumbers: config.get<boolean>("showRawNumbers", false),
      // Notifications enabled by default for important updates
      enableNotifications: config.get<boolean>("enableNotifications", true),
      // Warning at 80% gives users time to respond before hitting limits
      warningThreshold: config.get<number>("warningThreshold", 80),
      // Critical at 90% indicates immediate action needed
      criticalThreshold: config.get<number>("criticalThreshold", 90),
      // Model tracking enabled by default
      enableModelTracking: config.get<boolean>("enableModelTracking", true),
      // Check for model updates every 6 hours (360 minutes)
      // Design rationale: Model updates are infrequent, so checking less often
      // reduces API load while still catching changes in a reasonable timeframe
      modelCheckInterval: config.get<number>("modelCheckInterval", 360),
      // Enable notifications for model changes by default
      enableModelChangeNotifications: config.get<boolean>("enableModelChangeNotifications", true),
    };
  }

  private watchConfigurationChanges(): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("syntheticUsageTracker")) {
        this.onConfigChangeCallback?.();
      }
    });
  }

  onConfigChange(callback: () => void): void {
    this.onConfigChangeCallback = callback;
  }

  onKeysRefreshed(callback: () => void): void {
    this.onKeysRefreshedCallback = callback;
  }

  async getKeysTimestamp(): Promise<number> {
    return this.context.globalState.get<number>(SHARED_STATE_KEYS.KEY_UPDATE_TIMESTAMP, 0);
  }

  /**
   * Refresh API key from the shared store
   * This method checks if the key has been updated in another window
   * and reloads it if necessary
   */
  async refreshKeys(): Promise<{
    refreshed: boolean;
    hasKey: boolean;
    timestamp: number;
  }> {
    const currentTimestamp = await this.getKeysTimestamp();
    const apiKey = await this.getApiKey();
    
    this.onKeysRefreshedCallback?.();

    return {
      refreshed: true,
      hasKey: apiKey !== undefined,
      timestamp: currentTimestamp,
    };
  }

  /**
   * Watch for changes in shared state (for cross-window key updates)
   * Uses polling to detect changes from other windows
   */
  watchSharedStateChanges(pollInterval: number = 5000): vscode.Disposable {
    let lastKnownTimestamp = 0;
    
    this.getKeysTimestamp().then(timestamp => {
      lastKnownTimestamp = timestamp;
    });

    const intervalId = setInterval(async () => {
      const currentTimestamp = await this.getKeysTimestamp();
      if (currentTimestamp > lastKnownTimestamp) {
        lastKnownTimestamp = currentTimestamp;
        this.onKeysRefreshedCallback?.();
      }
    }, pollInterval);

    return {
      dispose: () => {
        clearInterval(intervalId);
      },
    };
  }

  dispose(): void {
    this.configChangeDisposable.dispose();
    this.apiKeyManager.dispose();
  }

  /**
   * Get the API Key Manager instance
   *
   * Design decision: Expose the ApiKeyManager to allow the extension to access
   * multi-profile API key management functionality. This provides a clean
   * separation of concerns while maintaining backward compatibility.
   */
  getApiKeyManager(): ApiKeyManager {
    return this.apiKeyManager;
  }

  /**
   * Get the active API key from the currently active profile
   *
   * @deprecated Use getApiKeyManager().getActiveProfile() instead
   * This method is maintained for backward compatibility but delegates
   * to the new ApiKeyManager for multi-profile support.
   */
  async getApiKey(): Promise<string | undefined> {
    const activeProfile = await this.apiKeyManager.getActiveProfile();
    return activeProfile?.key;
  }

  /**
   * Check if an API key is configured
   *
   * @deprecated Use getApiKeyManager().getActiveProfile() instead
   * This method is maintained for backward compatibility.
   */
  async hasApiKey(): Promise<boolean> {
    const profiles = await this.apiKeyManager.getProfiles();
    return profiles.length > 0;
  }

  /**
   * Set a new API key as a profile
   *
   * @deprecated Use getApiKeyManager().addProfile() instead
   * This method is maintained for backward compatibility and creates
   * a new profile with the provided key.
   */
  async setApiKey(apiKey: string): Promise<void> {
    const profiles = await this.apiKeyManager.getProfiles();
    const profileLabel = profiles.length === 0 ? "Default" : `API Key ${profiles.length + 1}`;
    await this.apiKeyManager.addProfile(apiKey, profileLabel);
  }
}
