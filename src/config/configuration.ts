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

  async getApiKey(): Promise<string | undefined> {
    const keysJson = await this.context.secrets.get("syntheticApiKeys");
    if (keysJson) {
      try {
        const keys = JSON.parse(keysJson) as Array<{ key: string; label?: string }>;
        if (Array.isArray(keys) && keys.length > 0) {
          return keys[0]!.key;
        }
      } catch {
        // Ignore JSON parsing errors and fall through to legacy format
      }
    }
    
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
