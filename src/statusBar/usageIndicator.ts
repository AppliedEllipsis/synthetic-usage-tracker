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
  private currentAggregatedUsage: {
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
  } | null = null;
  private autoRefreshTimer: NodeJS.Timeout | null = null;
  private countdownTimer: NodeJS.Timeout | null = null;
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

    // Show notification if thresholds are exceeded
    if (config.enableNotifications) {
      this.checkThresholds(usage, config);
    }
  }

  /**
   * Update the usage indicator with aggregated data from multiple keys
   */
  updateAggregatedUsage(aggregatedUsage: {
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
  }, config: {
    showPercentage: boolean;
    showRawNumbers: boolean;
    warningThreshold: number;
    criticalThreshold: number;
    enableNotifications: boolean;
  }): void {
    this.currentAggregatedUsage = aggregatedUsage;

    // Determine display state based on average usage percentage
    if (aggregatedUsage.averagePercentageUsed >= config.criticalThreshold) {
      this.displayState = DisplayState.Critical;
    } else if (aggregatedUsage.averagePercentageUsed >= config.warningThreshold) {
      this.displayState = DisplayState.Warning;
    } else {
      this.displayState = DisplayState.Success;
    }

    // Update status bar text and color with aggregated data
    this.updateAggregatedStatusBarItem(aggregatedUsage, config);

    // Show notification if thresholds are exceeded
    if (config.enableNotifications) {
      this.checkAggregatedThresholds(aggregatedUsage, config);
    }
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

    // Start countdown timer for real-time updates
    this.startCountdownTimer(usage, config);
  }

  /**
   * Update the status bar item with aggregated usage information
   */
  private updateAggregatedStatusBarItem(aggregatedUsage: {
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
  }, config: {
    showPercentage: boolean;
    showRawNumbers: boolean;
  }): void {
    // Get the earliest renewal time from valid keys
    const validKeys = aggregatedUsage.keys.filter(k => !k.error && k.usage.renewsAt);
    const earliestRenewal = validKeys.length > 0
      ? validKeys.reduce((earliest, k) => k.usage.renewsAt < earliest ? k.usage.renewsAt : earliest, validKeys[0]!.usage.renewsAt)
      : new Date();
    
    const timeRemaining = this.calculateTimeRemaining(earliestRenewal);
    
    let text = "$(database) Synthetic.new";

    // Add key count indicator if multiple keys
    if (aggregatedUsage.keyCount > 1) {
      text += ` (${aggregatedUsage.keyCount} keys)`;
    }

    if (config.showPercentage) {
      const percentage = aggregatedUsage.averagePercentageUsed.toFixed(0);
      text += ` ${percentage}%`;
    }

    if (config.showRawNumbers) {
      text += ` (${aggregatedUsage.totalRequests.toLocaleString()}/${aggregatedUsage.totalLimit.toLocaleString()})`;
    }

    // Set text (resets details are in tooltip and popup only)
    this.statusBarItem.text = text;

    // Set color based on state
    this.updateStatusColor();

    // Set tooltip with aggregated information
    this.statusBarItem.tooltip = this.buildAggregatedTooltip(aggregatedUsage, earliestRenewal, timeRemaining);

    // Set command
    this.statusBarItem.command = "syntheticUsageTracker.showUsage";

    // Start countdown timer for real-time updates
    this.startAggregatedCountdownTimer(aggregatedUsage, config, earliestRenewal);
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
   * Build tooltip string with aggregated usage information from multiple keys
   */
  private buildAggregatedTooltip(aggregatedUsage: {
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
  }, earliestRenewal: Date, timeRemaining: string): string {
    let tooltip = `
Synthetic.new Usage Tracker (${aggregatedUsage.keyCount} key${aggregatedUsage.keyCount > 1 ? 's' : ''})

Total Requests: ${aggregatedUsage.totalRequests.toLocaleString()}
Total Limit: ${aggregatedUsage.totalLimit.toLocaleString()}
Total Remaining: ${aggregatedUsage.totalRemaining.toLocaleString()}
Average Percentage: ${aggregatedUsage.averagePercentageUsed.toFixed(1)}%
Next Reset: ${earliestRenewal.toLocaleString()}
Time Remaining: ${timeRemaining}
`.trim();

    // Add individual key details if multiple keys
    if (aggregatedUsage.keys.length > 1) {
      tooltip += '\n\nIndividual Keys:\n';
      aggregatedUsage.keys.forEach((keyData, index) => {
        const label = keyData.label || `Key ${index + 1}`;
        const keyPreview = keyData.key.substring(0, 8) + '...';
        if (keyData.error) {
          tooltip += `\n${label} (${keyPreview}): Error - ${keyData.error}`;
        } else {
          tooltip += `\n${label} (${keyPreview}): ${keyData.usage.requests.toLocaleString()}/${keyData.usage.limit.toLocaleString()} (${keyData.usage.percentageUsed.toFixed(1)}%)`;
        }
      });
    }

    tooltip += '\n\nClick to view details';
    return tooltip;
  }

  /**
   * Check if usage exceeds thresholds and show notifications
   */
  private checkThresholds(usage: UsageInfo, config: {
    warningThreshold: number;
    criticalThreshold: number;
  }): void {
    if (usage.percentageUsed >= config.criticalThreshold) {
      vscode.window.showWarningMessage(
        `Synthetic.ai quota critical: ${usage.percentageUsed.toFixed(0)}% used (${usage.requests}/${usage.limit} requests)`,
      );
    } else if (usage.percentageUsed >= config.warningThreshold) {
      vscode.window.showInformationMessage(
        `Synthetic.ai quota warning: ${usage.percentageUsed.toFixed(0)}% used (${usage.requests}/${usage.limit} requests)`,
      );
    }
  }

  /**
   * Check if aggregated usage exceeds thresholds and show notifications
   */
  private checkAggregatedThresholds(aggregatedUsage: {
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
  }, config: {
    warningThreshold: number;
    criticalThreshold: number;
  }): void {
    if (aggregatedUsage.averagePercentageUsed >= config.criticalThreshold) {
      vscode.window.showWarningMessage(
        `Synthetic.ai quota critical: ${aggregatedUsage.averagePercentageUsed.toFixed(0)}% used (${aggregatedUsage.totalRequests.toLocaleString()}/${aggregatedUsage.totalLimit.toLocaleString()} requests across ${aggregatedUsage.keyCount} keys)`,
      );
    } else if (aggregatedUsage.averagePercentageUsed >= config.warningThreshold) {
      vscode.window.showInformationMessage(
        `Synthetic.ai quota warning: ${aggregatedUsage.averagePercentageUsed.toFixed(0)}% used (${aggregatedUsage.totalRequests.toLocaleString()}/${aggregatedUsage.totalLimit.toLocaleString()} requests across ${aggregatedUsage.keyCount} keys)`,
      );
    }
  }

  /**
   * Calculate time remaining until reset in hh/mm/ss format
   */
  private calculateTimeRemaining(renewsAt: Date): string {
    const now = new Date();
    const diff = renewsAt.getTime() - now.getTime();
    
    if (diff <= 0) {
      return "00:00:00";
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${this.padZero(hours)}:${this.padZero(minutes)}:${this.padZero(seconds)}`;
  }

  /**
   * Format time for display (hh:mm AM/PM)
   */
  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }

  /**
   * Pad a number with leading zero if needed
   */
  private padZero(num: number): string {
    return num.toString().padStart(2, '0');
  }

  /**
   * Start countdown timer for real-time updates
   */
  private startCountdownTimer(_usage: UsageInfo, config: {
    showPercentage: boolean;
    showRawNumbers: boolean;
  }): void {
    // Stop existing timer
    this.stopCountdownTimer();
    
    // Start new timer that updates every second
    this.countdownTimer = setInterval(() => {
      if (this.currentUsage) {
        const timeRemaining = this.calculateTimeRemaining(this.currentUsage.renewsAt);
        
        let text = "$(database) Synthetic.new";
        
        if (config.showPercentage) {
          const percentage = this.currentUsage.percentageUsed.toFixed(0);
          text += ` ${percentage}%`;
        }
        
        if (config.showRawNumbers) {
          text += ` (${this.currentUsage.requests}/${this.currentUsage.limit})`;
        }
        
        // Add reset time only (not countdown)
        text += ` | Resets: ${this.formatTime(this.currentUsage.renewsAt)}`;

        this.statusBarItem.text = text;
        
        // Update tooltip with new time remaining
        this.statusBarItem.tooltip = this.buildTooltip(this.currentUsage, timeRemaining);
      }
    }, 1000);
  }

  /**
   * Stop countdown timer
   */
  private stopCountdownTimer(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  /**
   * Start countdown timer for aggregated usage with real-time updates
   */
  private startAggregatedCountdownTimer(
    _aggregatedUsage: {
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
    },
    config: {
      showPercentage: boolean;
      showRawNumbers: boolean;
    },
    earliestRenewal: Date
  ): void {
    // Stop existing timer
    this.stopCountdownTimer();
    
    // Start new timer that updates every second
    this.countdownTimer = setInterval(() => {
      if (this.currentAggregatedUsage) {
        const timeRemaining = this.calculateTimeRemaining(earliestRenewal);
        
        let text = "$(database) Synthetic.new";
        
        // Add key count indicator if multiple keys
        if (this.currentAggregatedUsage.keyCount > 1) {
          text += ` (${this.currentAggregatedUsage.keyCount} keys)`;
        }
        
        if (config.showPercentage) {
          const percentage = this.currentAggregatedUsage.averagePercentageUsed.toFixed(0);
          text += ` ${percentage}%`;
        }
        
        if (config.showRawNumbers) {
          text += ` (${this.currentAggregatedUsage.totalRequests.toLocaleString()}/${this.currentAggregatedUsage.totalLimit.toLocaleString()})`;
        }
        
        // Add reset time only (not countdown)
        text += ` | Resets: ${this.formatTime(earliestRenewal)}`;

        this.statusBarItem.text = text;
        
        // Update tooltip with new time remaining
        this.statusBarItem.tooltip = this.buildAggregatedTooltip(this.currentAggregatedUsage, earliestRenewal, timeRemaining);
      }
    }, 1000);
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
   * Get current aggregated usage information
   */
  getCurrentAggregatedUsage(): {
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
  } | null {
    return this.currentAggregatedUsage;
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
    this.stopCountdownTimer();
    this.statusBarItem.dispose();
  }
}
