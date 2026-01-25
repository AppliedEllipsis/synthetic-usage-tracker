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
 * Individual API key information
 */
export interface ApiKeyInfo {
  key: string;
  label?: string;
}

/**
 * Aggregated usage information from multiple API keys
 */
export interface AggregatedUsageInfo {
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
}

/**
 * Shared state keys for cross-window communication
 */
const SHARED_STATE_KEYS = {
  KEY_UPDATE_TIMESTAMP: 'syntheticApiKeysUpdateTimestamp',
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
   * Get the API key from VSCode SecretStorage (backward compatibility)
   * Returns the first key if multiple keys are stored
   */
  async getApiKey(): Promise<string | undefined> {
    const keys = await this.getApiKeys();
    return keys.length > 0 ? keys[0]!.key : undefined;
  }

  /**
   * Get all API keys from VSCode SecretStorage
   * Returns an array of ApiKeyInfo objects
   */
  async getApiKeys(): Promise<ApiKeyInfo[]> {
    const keysJson = await this.context.secrets.get("syntheticApiKeys");
    if (!keysJson) {
      // Try to get legacy single key for backward compatibility
      const legacyKey = await this.context.secrets.get("syntheticApiKey");
      if (legacyKey) {
        return [{ key: legacyKey }];
      }
      return [];
    }
    try {
      const keys = JSON.parse(keysJson) as ApiKeyInfo[];
      return Array.isArray(keys) ? keys : [];
    } catch {
      return [];
    }
  }

  /**
   * Store the API key in VSCode SecretStorage (backward compatibility)
   * Adds the key to the list of keys
   */
  async setApiKey(apiKey: string): Promise<void> {
    const keys = await this.getApiKeys();
    // Check if key already exists
    const existingIndex = keys.findIndex(k => k.key === apiKey);
    if (existingIndex === -1) {
      keys.push({ key: apiKey });
    }
    await this.setApiKeys(keys);
  }

  /**
   * Store multiple API keys in VSCode SecretStorage
   */
  async setApiKeys(keys: ApiKeyInfo[]): Promise<void> {
    const keysJson = JSON.stringify(keys);
    await this.context.secrets.store("syntheticApiKeys", keysJson);
    // Update shared state timestamp to signal other windows
    await this.updateKeysTimestamp();
  }

  /**
   * Delete the API key from VSCode SecretStorage (backward compatibility)
   * Removes all keys with this value
   */
  async deleteApiKey(): Promise<void> {
    await this.context.secrets.delete("syntheticApiKey");
    await this.context.secrets.delete("syntheticApiKeys");
  }

  /**
   * Delete a specific API key from the list
   */
  async deleteApiKeyByKey(keyToDelete: string): Promise<void> {
    const keys = await this.getApiKeys();
    const filteredKeys = keys.filter(k => k.key !== keyToDelete);
    await this.setApiKeys(filteredKeys);
  }

  /**
   * Check if an API key is configured (backward compatibility)
   */
  async hasApiKey(): Promise<boolean> {
    const keys = await this.getApiKeys();
    return keys.length > 0 && keys.some(k => k.key.length > 0);
  }

  /**
   * Get the number of configured API keys
   */
  async getApiKeyCount(): Promise<number> {
    const keys = await this.getApiKeys();
    return keys.length;
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
   * Refresh API keys from the shared store
   * This method checks if keys have been updated in another window
   * and reloads them if necessary
   */
  async refreshKeys(): Promise<{
    refreshed: boolean;
    keyCount: number;
    timestamp: number;
  }> {
    const currentTimestamp = await this.getKeysTimestamp();
    const keys = await this.getApiKeys();
    
    // Notify callback that keys have been refreshed
    this.onKeysRefreshedCallback?.();

    return {
      refreshed: true,
      keyCount: keys.length,
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
        // Keys have been updated in another window
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
