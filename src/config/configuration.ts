import * as vscode from "vscode";

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
  // Multi-key cycling configuration
  enableKeyCycling: boolean;
  cyclingStrategy: string;
  autoCycleThreshold: number;
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
 */
export class ConfigurationManager {
  private context: vscode.ExtensionContext;
  private configChangeDisposable: vscode.Disposable;
  private onConfigChangeCallback?: () => void;
  private onKeysRefreshedCallback?: () => void;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
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
      // Multi-key cycling configuration
      // Disabled by default for backward compatibility
      enableKeyCycling: config.get<boolean>("enableKeyCycling", false),
      // RoundRobin is the default strategy - simple and predictable
      cyclingStrategy: config.get<string>("cyclingStrategy", "roundRobin"),
      // Auto-cycle at 95% to use remaining keys before hitting quota limits
      autoCycleThreshold: config.get<number>("autoCycleThreshold", 95),
    };
  }

  async getApiKey(): Promise<string | undefined> {
    // First try new format (array of keys with labels)
    // This supports future multi-key functionality
    //
    // Design decision: Check new format first before falling back to legacy format
    // Rationale: Existing users should use the new format for multi-key support.
    // By checking new format first, we encourage migration while maintaining backward
    // compatibility through the legacy fallback.
    const keysJson = await this.context.secrets.get("syntheticApiKeys");
    if (keysJson) {
      try {
        const keys = JSON.parse(keysJson) as Array<{ key: string; label?: string }>;
        if (Array.isArray(keys) && keys.length > 0) {
          return keys[0]?.key;
        }
      } catch {
        // Silent fallthrough to legacy format - ignore JSON parse errors
        // as they might be caused by data migration issues
      }
    }
    
    // Fallback to legacy single-key format for backward compatibility
    // Existing users won't lose their keys during extension updates
    const legacyKey = await this.context.secrets.get("syntheticApiKey");
    if (legacyKey) {
      return legacyKey;
    }
    
    return undefined;
  }

  async setApiKey(apiKey: string): Promise<void> {
    await this.context.secrets.store("syntheticApiKey", apiKey);
    await this.context.secrets.delete("syntheticApiKeys");
    await this.updateKeysTimestamp();
  }

  async hasApiKey(): Promise<boolean> {
    const apiKey = await this.getApiKey();
    return apiKey !== undefined && apiKey.length > 0;
  }

  async deleteApiKey(): Promise<void> {
    await this.context.secrets.delete("syntheticApiKey");
    await this.context.secrets.delete("syntheticApiKeys");
    await this.updateKeysTimestamp();
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

  /**
   * Update the shared state timestamp to signal that keys have changed
   * This allows other VS Code windows to detect the change
   */
  private async updateKeysTimestamp(): Promise<void> {
    const timestamp = Date.now();
    await this.context.globalState.update(SHARED_STATE_KEYS.KEY_UPDATE_TIMESTAMP, timestamp);
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
   *
   * Design decision: Polling is used instead of event-based synchronization because
   * VS Code's globalState doesn't support change events across windows. Polling every
   * 5 seconds provides a good balance between responsiveness and performance.
   *
   * Alternative considered: Use workspace state with onDidChangeConfiguration
   * Rejected: Configuration events don't fire for globalState changes, only for
   * workspace configuration changes.
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
  }
}
