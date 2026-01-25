import * as vscode from "vscode";
import type { UsageInfo } from "../api/syntheticService";

/**
 * Status bar item display states
 *
 * Design decision: Use enum for type safety and to ensure all states are
 * explicitly handled in switch statements. This prevents typos and makes
 * the code more maintainable when adding new states.
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
 * Status bar usage indicator for displaying Synthetic.new usage information
 *
 * Design decision: Encapsulate all status bar logic including display states,
 * auto-refresh management, and UI updates. This keeps the main extension class
 * focused on coordination rather than UI details.
 */
export class UsageIndicator {
  private statusBarItem: vscode.StatusBarItem;
  private displayState: DisplayState = DisplayState.Idle;
  private currentUsage: UsageInfo | null = null;
  private autoRefreshTimer: NodeJS.Timeout | null = null;
  private isAutoRefreshEnabled: boolean = true;
  
  // Cache to prevent unnecessary redraws
  // Design rationale: VS Code status bar updates can cause visual flickering
  // if done too frequently. Caching the last rendered values allows us to skip
  // redundant updates when data hasn't changed, improving UX and performance.
  private lastText: string | null = null;
  private lastTooltip: string | null = null;
  private lastDisplayState: DisplayState | null = null;

  constructor(context: vscode.ExtensionContext) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      // Priority 100 ensures this appears near the right side, alongside other common items
      100,
    );

    context.subscriptions.push(this.statusBarItem);

    // Design decision: Start in idle state instead of loading state to avoid showing
    // the spinning icon during extension initialization. The status bar will update
    // when new data arrives, providing a cleaner user experience.
    this.setIdle();
    this.statusBarItem.show();
  }

  /**
   * Update the usage indicator with new data
   *
   * Design decision: Determine display state before updating UI. This separation
   * allows for easy testing of state logic independent of rendering.
   *
   * State priority: Critical > Warning > Success ensures the most severe state
   * is always displayed, which is appropriate for quota tracking where users need
   * immediate visibility of approaching limits.
   */
  updateUsage(usage: UsageInfo, config: {
    showPercentage: boolean;
    showRawNumbers: boolean;
    warningThreshold: number;
    criticalThreshold: number;
    enableNotifications: boolean;
  }): void {
    this.currentUsage = usage;

    // Use cascading if-else to ensure only one state is selected
    // Critical takes precedence over warning, which takes precedence over success
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
   * Clear the cached values to force an update
   */
  private clearCache(): void {
    this.lastText = null;
    this.lastTooltip = null;
    this.lastDisplayState = null;
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

    const tooltip = this.buildTooltip(usage, timeRemaining);

    // Only update if values have actually changed to prevent blinking/redraw
    const needsUpdate = 
      this.lastText !== text ||
      this.lastTooltip !== tooltip ||
      this.lastDisplayState !== this.displayState;

    if (needsUpdate) {
      this.statusBarItem.text = text;
      this.statusBarItem.tooltip = tooltip;
      this.updateStatusColor();
      this.statusBarItem.command = "syntheticUsageTracker.showUsage";

      // Update cache
      this.lastText = text;
      this.lastTooltip = tooltip;
      this.lastDisplayState = this.displayState;
    }
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
    // Design decision: Show comprehensive usage information in tooltip to match message box content.
    // This provides users with full visibility into their API quota without requiring a click.
    // VSCode status bar tooltips support markdown formatting, allowing for structured multi-line display.
    const percentageUsed = usage.percentageUsed.toFixed(1);
    const percentageRemaining = (100 - usage.percentageUsed).toFixed(1);

    return `**Synthetic.new Usage Details**

Requests Used: ${usage.requests.toLocaleString()}
Requests Limit: ${usage.limit.toLocaleString()}
Requests Remaining: ${usage.remaining.toLocaleString()}

Percentage Used: ${percentageUsed}%
Percentage Remaining: ${percentageRemaining}%

Time Remaining: ${timeRemaining}
Renews At: ${usage.renewsAtString}`;
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
    
    // Clear cache to force update
    this.clearCache();
  }

  setError(message: string): void {
    this.displayState = DisplayState.Error;
    this.statusBarItem.text = "$(error) Synthetic.new";
    this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
    this.statusBarItem.tooltip = `Error: ${message}`;
    
    // Clear cache to force update
    this.clearCache();
  }

  setIdle(): void {
    this.displayState = DisplayState.Idle;
    this.statusBarItem.text = "$(database) Synthetic.new";
    this.statusBarItem.backgroundColor = undefined;
    this.statusBarItem.tooltip = "Configure your Synthetic.new API key to track usage";
    
    // Clear cache to force update
    this.clearCache();
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
