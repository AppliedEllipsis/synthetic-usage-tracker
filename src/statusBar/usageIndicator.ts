import * as vscode from "vscode";
import type { UsageInfo } from "../api/syntheticService";

/**
 * Status bar item display states
 */
enum DisplayState {
  Loading = "loading",
  Idle = "idle",
  Success = "success",
  Warning = "warning",
  Error = "error",
  Critical = "critical",
}

/**
 * Status bar usage indicator for displaying Synthetic.ai usage information
 */
export class UsageIndicator {
  private statusBarItem: vscode.StatusBarItem;
  private displayState: DisplayState = DisplayState.Idle;
  private currentUsage: UsageInfo | null = null;
  private autoRefreshTimer: NodeJS.Timeout | null = null;
  private isAutoRefreshEnabled: boolean = true;

  constructor(context: vscode.ExtensionContext) {
    // Create status bar item on the right side by default
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100, // Priority
    );

    // Store in context for disposal
    context.subscriptions.push(this.statusBarItem);

    // Set initial state
    this.setLoading();
    this.statusBarItem.show();
  }

  /**
   * Update the usage indicator with new data
   */
  updateUsage(usage: UsageInfo, config: {
    showPercentage: boolean;
    showRawNumbers: boolean;
    warningThreshold: number;
    criticalThreshold: number;
    enableNotifications: boolean;
  }): void {
    this.currentUsage = usage;

    // Determine display state based on usage percentage
    if (usage.percentageUsed >= config.criticalThreshold) {
      this.displayState = DisplayState.Critical;
    } else if (usage.percentageUsed >= config.warningThreshold) {
      this.displayState = DisplayState.Warning;
    } else {
      this.displayState = DisplayState.Success;
    }

    // Update status bar text and color
    this.updateStatusBarItem(usage, config);

    // Automatic threshold notifications are disabled
    // Users can check the status bar for usage information
    // If notifications are needed, they can be manually triggered via the showUsage command
  }

  /**
   * Update the status bar item with usage information
   */
  private updateStatusBarItem(usage: UsageInfo, config: {
    showPercentage: boolean;
    showRawNumbers: boolean;
  }): void {
    const timeRemaining = this.calculateTimeRemaining(usage.renewsAt);
    
    let text = "$(database) Synthetic.new";

    if (config.showPercentage) {
      const percentage = usage.percentageUsed.toFixed(0);
      text += ` ${percentage}%`;
    }

    if (config.showRawNumbers) {
      text += ` (${usage.requests}/${usage.limit})`;
    }

    // Set text (resets details are in tooltip and popup only)
    this.statusBarItem.text = text;

    // Set color based on state
    this.updateStatusColor();

    // Set tooltip
    this.statusBarItem.tooltip = this.buildTooltip(usage, timeRemaining);

    // Set command
    this.statusBarItem.command = "syntheticUsageTracker.showUsage";
  }

  /**
   * Update status bar color based on display state
   */
  private updateStatusColor(): void {
    switch (this.displayState) {
      case DisplayState.Critical:
      case DisplayState.Error:
        this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
        break;
      case DisplayState.Warning:
        this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
        break;
      case DisplayState.Success:
        this.statusBarItem.backgroundColor = undefined; // Use default
        break;
      case DisplayState.Loading:
        this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.prominentBackground");
        break;
      default:
        this.statusBarItem.backgroundColor = undefined;
    }
  }

  /**
   * Build tooltip string with detailed usage information
   */
  private buildTooltip(usage: UsageInfo, timeRemaining: string): string {
    return `
Synthetic.new Usage Tracker

Requests: ${usage.requests.toLocaleString()}
Limit: ${usage.limit.toLocaleString()}
Remaining: ${usage.remaining.toLocaleString()}
Percentage: ${usage.percentageUsed.toFixed(1)}%
Reset Time: ${usage.renewsAtString}
Time Remaining: ${timeRemaining}

Click to view details
`.trim();
  }

  /**
   * Calculate time remaining until reset in hours and minutes format (e.g., "3h 2m")
   */
  private calculateTimeRemaining(renewsAt: Date): string {
    const now = new Date();
    const diff = renewsAt.getTime() - now.getTime();
    
    if (diff <= 0) {
      return "0h 0m";
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  }

  /**
   * Set loading state
   */
  setLoading(): void {
    this.displayState = DisplayState.Loading;
    this.statusBarItem.text = "$(loading~spin) Synthetic.new";
    this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.prominentBackground");
    this.statusBarItem.tooltip = "Loading Synthetic.new usage...";
  }

  /**
   * Set error state
   */
  setError(message: string): void {
    this.displayState = DisplayState.Error;
    this.statusBarItem.text = "$(error) Synthetic.new";
    this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
    this.statusBarItem.tooltip = `Error: ${message}`;
  }

  /**
   * Set idle state (no API key configured)
   */
  setIdle(): void {
    this.displayState = DisplayState.Idle;
    this.statusBarItem.text = "$(database) Synthetic.new";
    this.statusBarItem.backgroundColor = undefined;
    this.statusBarItem.tooltip = "Configure your Synthetic.new API key to track usage";
  }

  /**
   * Start auto-refresh timer
   */
  startAutoRefresh(intervalSeconds: number, refreshCallback: () => void): void {
    this.stopAutoRefresh();
    this.isAutoRefreshEnabled = true;
    this.autoRefreshTimer = setInterval(() => {
      if (this.isAutoRefreshEnabled) {
        refreshCallback();
      }
    }, intervalSeconds * 1000);
  }

  /**
   * Stop auto-refresh timer
   */
  stopAutoRefresh(): void {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }
  }

  /**
   * Toggle auto-refresh
   */
  toggleAutoRefresh(): boolean {
    this.isAutoRefreshEnabled = !this.isAutoRefreshEnabled;
    return this.isAutoRefreshEnabled;
  }

  /**
   * Check if auto-refresh is enabled
   */
  isAutoRefreshActive(): boolean {
    return this.isAutoRefreshEnabled;
  }

  /**
   * Update auto-refresh interval
   */
  updateAutoRefreshInterval(intervalSeconds: number, refreshCallback: () => void): void {
    if (this.isAutoRefreshEnabled) {
      this.startAutoRefresh(intervalSeconds, refreshCallback);
    }
  }

  /**
   * Get current usage information
   */
  getCurrentUsage(): UsageInfo | null {
    return this.currentUsage;
  }

  /**
   * Show the status bar item
   */
  show(): void {
    this.statusBarItem.show();
  }

  /**
   * Hide the status bar item
   */
  hide(): void {
    this.statusBarItem.hide();
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.stopAutoRefresh();
    this.statusBarItem.dispose();
  }
}
