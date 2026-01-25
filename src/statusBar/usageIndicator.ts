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
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );

    context.subscriptions.push(this.statusBarItem);

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

    if (usage.percentageUsed >= config.criticalThreshold) {
      this.displayState = DisplayState.Critical;
    } else if (usage.percentageUsed >= config.warningThreshold) {
      this.displayState = DisplayState.Warning;
    } else {
      this.displayState = DisplayState.Success;
    }

    this.updateStatusBarItem(usage, config);
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

    this.statusBarItem.text = text;

    this.updateStatusColor();

    this.statusBarItem.tooltip = this.buildTooltip(usage, timeRemaining);

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
        this.statusBarItem.backgroundColor = undefined;
        break;
      case DisplayState.Loading:
        this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.prominentBackground");
        break;
      default:
        this.statusBarItem.backgroundColor = undefined;
    }
  }

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

  setLoading(): void {
    this.displayState = DisplayState.Loading;
    this.statusBarItem.text = "$(loading~spin) Synthetic.new";
    this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.prominentBackground");
    this.statusBarItem.tooltip = "Loading Synthetic.new usage...";
  }

  setError(message: string): void {
    this.displayState = DisplayState.Error;
    this.statusBarItem.text = "$(error) Synthetic.new";
    this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
    this.statusBarItem.tooltip = `Error: ${message}`;
  }

  setIdle(): void {
    this.displayState = DisplayState.Idle;
    this.statusBarItem.text = "$(database) Synthetic.new";
    this.statusBarItem.backgroundColor = undefined;
    this.statusBarItem.tooltip = "Configure your Synthetic.new API key to track usage";
  }

  startAutoRefresh(intervalSeconds: number, refreshCallback: () => void): void {
    this.stopAutoRefresh();
    this.isAutoRefreshEnabled = true;
    this.autoRefreshTimer = setInterval(() => {
      if (this.isAutoRefreshEnabled) {
        refreshCallback();
      }
    }, intervalSeconds * 1000);
  }

  stopAutoRefresh(): void {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }
  }

  toggleAutoRefresh(): boolean {
    this.isAutoRefreshEnabled = !this.isAutoRefreshEnabled;
    return this.isAutoRefreshEnabled;
  }

  isAutoRefreshActive(): boolean {
    return this.isAutoRefreshEnabled;
  }

  updateAutoRefreshInterval(intervalSeconds: number, refreshCallback: () => void): void {
    if (this.isAutoRefreshEnabled) {
      this.startAutoRefresh(intervalSeconds, refreshCallback);
    }
  }

  getCurrentUsage(): UsageInfo | null {
    return this.currentUsage;
  }

  dispose(): void {
    this.stopAutoRefresh();
    this.statusBarItem.dispose();
  }
}
