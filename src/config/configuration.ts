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
 * Configuration manager for the extension
 * Handles reading and watching configuration changes
 */
export class ConfigurationManager {
  private context: vscode.ExtensionContext;
  private configChangeDisposable: vscode.Disposable;
  private onConfigChangeCallback?: () => void;

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
   */
  async getApiKey(): Promise<string | undefined> {
    return await this.context.secrets.get("syntheticApiKey");
  }

  /**
   * Store the API key in VSCode SecretStorage
   */
  async setApiKey(apiKey: string): Promise<void> {
    await this.context.secrets.store("syntheticApiKey", apiKey);
  }

  /**
   * Delete the API key from VSCode SecretStorage
   */
  async deleteApiKey(): Promise<void> {
    await this.context.secrets.delete("syntheticApiKey");
  }

  /**
   * Check if an API key is configured
   */
  async hasApiKey(): Promise<boolean> {
    const apiKey = await this.getApiKey();
    return apiKey !== undefined && apiKey.length > 0;
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
