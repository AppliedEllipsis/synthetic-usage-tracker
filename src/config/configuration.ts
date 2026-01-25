import * as vscode from "vscode";

/**
 * Configuration keys for the Synthetic Usage Tracker extension
 */
export interface Configuration {
  apiKey: string;
  apiEndpoint: string;
  refreshInterval: number;
  statusBarPosition: "left" | "right";
  showPercentage: boolean;
  showRawNumbers: boolean;
  enableNotifications: boolean;
  warningThreshold: number;
  criticalThreshold: number;
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
 */
export class ConfigurationManager {
  private context: vscode.ExtensionContext;
  private configChangeDisposable: vscode.Disposable;
  private onConfigChangeCallback?: () => void;
  private onKeysRefreshedCallback?: () => void;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.configChangeDisposable = this.watchConfigurationChanges();
  }

  /**
   * Get the current configuration
   */
  getConfig(): Configuration {
    const config = vscode.workspace.getConfiguration("syntheticUsageTracker");
    return {
      apiKey: config.get<string>("apiKey", ""),
      apiEndpoint: config.get<string>("apiEndpoint", "https://api.synthetic.new/v2"),
      refreshInterval: config.get<number>("refreshInterval", 60),
      statusBarPosition: config.get<"left" | "right">("statusBarPosition", "right"),
      showPercentage: config.get<boolean>("showPercentage", true),
      showRawNumbers: config.get<boolean>("showRawNumbers", false),
      enableNotifications: config.get<boolean>("enableNotifications", true),
      warningThreshold: config.get<number>("warningThreshold", 80),
      criticalThreshold: config.get<number>("criticalThreshold", 90),
    };
  }

  /**
   * Get the API key from VSCode SecretStorage
   * For backward compatibility, if multiple keys were stored, returns the first one
   */
  async getApiKey(): Promise<string | undefined> {
    // Check for multi-key format (new format)
    const keysJson = await this.context.secrets.get("syntheticApiKeys");
    if (keysJson) {
      try {
        const keys = JSON.parse(keysJson) as Array<{ key: string; label?: string }>;
        if (Array.isArray(keys) && keys.length > 0) {
          return keys[0]!.key;
        }
      } catch {
        // Fall through to legacy format
      }
    }
    
    // Check for legacy single key format
    const legacyKey = await this.context.secrets.get("syntheticApiKey");
    if (legacyKey) {
      return legacyKey;
    }
    
    return undefined;
  }

  /**
   * Store the API key in VSCode SecretStorage
   * Overwrites any existing key (single key mode)
   */
  async setApiKey(apiKey: string): Promise<void> {
    // Store as a single key (simplified format)
    await this.context.secrets.store("syntheticApiKey", apiKey);
    // Clear any multi-key data
    await this.context.secrets.delete("syntheticApiKeys");
    // Update shared state timestamp to signal other windows
    await this.updateKeysTimestamp();
  }

  /**
   * Check if an API key is configured
   */
  async hasApiKey(): Promise<boolean> {
    const apiKey = await this.getApiKey();
    return apiKey !== undefined && apiKey.length > 0;
  }

  /**
   * Delete the API key from VSCode SecretStorage
   */
  async deleteApiKey(): Promise<void> {
    await this.context.secrets.delete("syntheticApiKey");
    await this.context.secrets.delete("syntheticApiKeys");
    await this.updateKeysTimestamp();
  }

  /**
   * Watch for configuration changes
   */
  private watchConfigurationChanges(): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("syntheticUsageTracker")) {
        this.onConfigChangeCallback?.();
      }
    });
  }

  /**
   * Set a callback to be called when configuration changes
   */
  onConfigChange(callback: () => void): void {
    this.onConfigChangeCallback = callback;
  }

  /**
   * Set a callback to be called when keys are refreshed from another window
   */
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

  /**
   * Get the last known keys update timestamp from shared state
   */
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
    
    // Notify callback that key has been refreshed
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
    
    // Initialize with current timestamp
    this.getKeysTimestamp().then(timestamp => {
      lastKnownTimestamp = timestamp;
    });

    const intervalId = setInterval(async () => {
      const currentTimestamp = await this.getKeysTimestamp();
      if (currentTimestamp > lastKnownTimestamp) {
        lastKnownTimestamp = currentTimestamp;
        // Key has been updated in another window
        this.onKeysRefreshedCallback?.();
      }
    }, pollInterval);

    return {
      dispose: () => {
        clearInterval(intervalId);
      },
    };
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.configChangeDisposable.dispose();
  }
}

/**
 * Configuration section name
 */
export const CONFIG_SECTION = "syntheticUsageTracker";
