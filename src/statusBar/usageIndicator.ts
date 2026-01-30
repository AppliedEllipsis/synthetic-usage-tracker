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

  // Track error type to provide contextual guidance when status bar is clicked
  // Design rationale: When users click the status bar in an error state, we need to
  // know whether the error is due to an invalid key or no subscription to provide
  // the appropriate prompt message. This tracking enables better user experience by
  // offering targeted guidance for fixing the issue.
  private errorType: "authentication" | "noSubscription" | "other" | null = null;

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
  updateUsage(
    usage: UsageInfo,
    config: {
      showPercentage: boolean;
      showRawNumbers: boolean;
      warningThreshold: number;
      criticalThreshold: number;
      enableNotifications: boolean;
    },
    apiKeySuffix?: string,
  ): void {
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

    // Clear error type when successfully updating usage
    this.errorType = null;

    this.updateStatusBarItem(usage, config, apiKeySuffix);
  }

  getErrorType(): "authentication" | "noSubscription" | "other" | null {
    return this.errorType;
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
  private updateStatusBarItem(
    usage: UsageInfo,
    config: {
      showPercentage: boolean;
      showRawNumbers: boolean;
      warningThreshold: number;
      criticalThreshold: number;
    },
    apiKeySuffix?: string,
  ): void {
    const timeRemaining = this.calculateTimeRemaining(usage.renewsAt);

    // Using custom icon defined in package.json contributes.icons section
    // Design rationale: Custom icon provides better visual identity for the extension
    let text = "$(synthetic-status-icon)";

    if (config.showPercentage) {
      const percentage = usage.percentageUsed.toFixed(0);
      text += ` ${percentage}%`;
    }

    if (config.showRawNumbers) {
      text += ` (${usage.requests}/${usage.limit})`;
    }

    // Add warning symbols based on overall usage thresholds
    // Design rationale: Visual indicators help users quickly identify when quotas are approaching limits
    // without needing to check the tooltip. Symbols are placed after the usage info to maintain
    // readability while providing immediate visual feedback.
    const warningSymbols = this.buildWarningSymbols(usage, config);
    if (warningSymbols) {
      text += ` ${warningSymbols}`;
    }

    const tooltip = this.buildTooltip(usage, timeRemaining, apiKeySuffix);

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
   * Build warning symbols string based on usage thresholds
   *
   * Design rationale:
   * - Overall threshold symbols: Warning (⚠️) and critical (🔴) emojis provide clear visual feedback
   * - Category symbols: Single-letter abbreviations (T, S, C) for tools, search, chat etc.
   * - Symbol placement: Overall symbols come first, followed by category-specific warnings
   * - Limit to 3 category symbols: Prevents status bar from becoming too cluttered
   * - Sort by severity: Critical categories shown before warning categories
   *
   * Alternative considered: Show all category warnings regardless of overall usage
   * Rejected: Would clutter the status bar when overall usage is low. Category warnings
   * are most relevant when overall usage is elevated.
   *
   * Alternative considered: Use color-coded text instead of emojis
   * Rejected: Status bar text color is controlled by backgroundColor, not individual
   * characters. Emojis provide better visual distinction.
   */
  private buildWarningSymbols(
    usage: UsageInfo,
    config: {
      warningThreshold: number;
      criticalThreshold: number;
    }
  ): string {
    const symbols: string[] = [];

    // Add overall usage warning symbol
    // Design decision: Overall threshold warnings are shown first as they represent
    // the most critical information for users to monitor.
    if (usage.percentageUsed >= config.criticalThreshold) {
      symbols.push("🔴");
    } else if (usage.percentageUsed >= config.warningThreshold) {
      symbols.push("⚠️");
    }

    // Add category-specific warning symbols
    // Design rationale: Category warnings help identify which specific services are
    // over quota. Only shown when overall usage is at warning level or higher to
    // avoid unnecessary clutter during normal usage.
    if (usage.categories && (usage.percentageUsed >= config.warningThreshold || symbols.length > 0)) {
      const categoryWarnings = this.buildCategoryWarningSymbols(usage.categories);
      symbols.push(...categoryWarnings);
    }

    // Limit to 3 symbols total to prevent status bar clutter
    // Design rationale: VS Code status bar has limited horizontal space. Too many symbols
    // would make the text hard to read and could overflow on smaller screens.
    return symbols.slice(0, 3).join("");
  }

  /**
   * Build category-specific warning symbols
   *
   * Design rationale:
   * - Single-letter abbreviations: T (tools), S (search), C (chat), O (other)
   * - Symbol indicates severity: ⚠️ for warning (≥80%), 🔴 for critical (≥100%)
   * - Sorted by severity: Critical categories first, then warnings
   * - Limit to 2 category symbols: Leaves room for overall warning symbol
   *
   * Alternative considered: Use full category names
   * Rejected: Would make status bar text too long. Abbreviations are more concise
   * and users can see full names in the tooltip.
   */
  private buildCategoryWarningSymbols(
    categories: Record<string, { percentageUsed: number }>
  ): string[] {
    const categorySymbols: Array<{ symbol: string; severity: number }> = [];

    // Define category abbreviations for known categories
    const categoryAbbreviations: Record<string, string> = {
      tools: "T",
      search: "S",
      chat: "C",
      other: "O",
    };

    for (const [categoryName, categoryData] of Object.entries(categories)) {
      // Only show warnings for categories at or above 100% usage (over quota)
      // Design decision: Category warnings are only shown when the category has
      // exceeded its limit (≥100%). This is more useful than showing warnings at
      // the same threshold as overall usage, as individual categories can hit
      // their limits even when overall usage is low.
      if (categoryData.percentageUsed >= 100) {
        const abbreviation = categoryAbbreviations[categoryName] || categoryName.charAt(0).toUpperCase();
        
        // Use critical symbol for over-limit categories (≥100%)
        categorySymbols.push({
          symbol: `🔴${abbreviation}`,
          severity: categoryData.percentageUsed,
        });
      }
    }

    // Sort by severity (highest percentage first) and return top 2
    // Design rationale: Show the most severe category warnings first.
    // Limit to 2 symbols to prevent status bar clutter.
    return categorySymbols
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 2)
      .map((item) => item.symbol);
  }

  /**
   * Update status bar color based on display state
   */
  private updateStatusColor(): void {
    switch (this.displayState) {
      case DisplayState.Critical:
      case DisplayState.Error:
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.errorBackground",
        );
        break;
      case DisplayState.Warning:
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.warningBackground",
        );
        break;
      case DisplayState.Success:
        this.statusBarItem.backgroundColor = undefined;
        break;
      case DisplayState.Loading:
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.prominentBackground",
        );
        break;
      default:
        this.statusBarItem.backgroundColor = undefined;
    }
  }

  /**
   * Build an ASCII progress bar for usage visualization
   *
   * Design decision: Use block characters (█ and ░) for a clean, monospace-compatible
   * progress bar that renders consistently across different terminals and fonts.
   * 
   * Design rationale:
   * - Width of 50 characters provides good visual granularity without being too wide
   * - Block characters (U+2588, U+2591) are widely supported and render cleanly
   * - Clamping at 100% prevents overflow for over-limit usage scenarios
   * - This approach is aesthetically pleasing and provides clear visual feedback
   */
  private buildProgressBar(percentage: number, width: number = 50): string {
    const clampedPercentage = Math.min(100, Math.max(0, percentage));
    const filledBlocks = Math.round((clampedPercentage / 100) * width);
    const emptyBlocks = width - filledBlocks;
    
    // Using block characters for filled portion and light shade for empty
    const filledChar = '█';
    const emptyChar = '░';
    
    return `[${filledChar.repeat(filledBlocks)}${emptyChar.repeat(emptyBlocks)}]`;
  }

  private buildTooltip(usage: UsageInfo, timeRemaining: string, apiKeySuffix?: string): string {
    // Design decision: Show comprehensive usage information in tooltip to match message box content.
    // This provides users with full visibility into their API quota without requiring a click.
    // Using plain text with Unicode separator for better visual appearance.
    // Adding extra line breaks to match popup dialog spacing.
    const percentageUsed = usage.percentageUsed.toFixed(1);
    const percentageRemaining = (100 - usage.percentageUsed).toFixed(1);

    /**
     * Design decision: Include API key suffix in tooltip header to help users identify
     * which key they're using when cycling through multiple keys.
     *
     * Rationale: When users have multiple API keys (e.g., production vs. development),
     * they need a way to distinguish which key is currently active without exposing
     * the full key for security reasons.
     *
     * Security considerations:
     * - Only the last 4 characters are displayed
     * - The parameter is optional, so the tooltip works without it
     * - The full key is never logged or exposed anywhere
     *
     * Alternative considered: Display no key identifier
     * Rejected: Users cycling through keys have no way to verify which key is active
     * without making API requests or checking configuration.
     */
    let tooltip: string;
    if (apiKeySuffix) {
      tooltip = `Synthetic.new Usage (${percentageUsed}%, Key: ****${apiKeySuffix})
───────────────────
Time Remaining: ${timeRemaining}
Renews: ${usage.renewsAtString}

Used: ${usage.requests.toLocaleString()} (${percentageUsed}%)
Remaining: ${usage.remaining.toLocaleString()} (${percentageRemaining}%)
Limit: ${usage.limit.toLocaleString()}
`;
    } else {
      tooltip = `Synthetic.new Usage (${percentageUsed}%)
───────────────────
Time Remaining: ${timeRemaining}
Renews: ${usage.renewsAtString}

Used: ${usage.requests.toLocaleString()} (${percentageUsed}%)
Remaining: ${usage.remaining.toLocaleString()} (${percentageRemaining}%)
Limit: ${usage.limit.toLocaleString()}
`;
    }

    // Add category breakdowns if available
    // Design decision: Categories are optional to maintain backward compatibility
    // with API responses that don't include category data yet.
    if (usage.categories && Object.keys(usage.categories).length > 0) {
      tooltip += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Category Breakdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
      
      // Sort categories alphabetically for consistent display order
      const sortedCategories = Object.entries(usage.categories).sort(
        ([a], [b]) => a.localeCompare(b)
      );
      
      for (const [categoryName, categoryData] of sortedCategories) {
        const categoryPercentage = categoryData.percentageUsed.toFixed(1);
        const warningSymbol = categoryData.percentageUsed >= 100 ? ' ⚠️' : '';
        
        // Pad category name to 10 characters for alignment
        const paddedName = categoryName.padEnd(10);
        
        tooltip += `${paddedName}${categoryData.used.toLocaleString()} / ${categoryData.limit.toLocaleString()} (${categoryPercentage}%)${warningSymbol}
${this.buildProgressBar(categoryData.percentageUsed)}

`;
      }
    }

    return tooltip;
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
    // Using custom loading icon for visual feedback during data fetch
    this.statusBarItem.text = "$(synthetic-status-loading)";
    this.statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.prominentBackground",
    );
    this.statusBarItem.tooltip = "Loading Synthetic.new usage...";

    // Clear cache to force update
    this.clearCache();
  }

  setError(message: string, errorType?: "authentication" | "noSubscription" | "other"): void {
    this.displayState = DisplayState.Error;
    // Track error type to provide contextual guidance when status bar is clicked
    this.errorType = errorType || "other";
    // Using custom icon defined in package.json contributes.icons section
    this.statusBarItem.text = "$(synthetic-status-icon)";
    this.statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.errorBackground",
    );
    this.statusBarItem.tooltip = `Error: ${message}`;

    // Clear cache to force update
    this.clearCache();
  }

  setIdle(): void {
    this.displayState = DisplayState.Idle;
    // Clear error type when transitioning to idle state
    // Design rationale: When transitioning to idle, any previous error state
    // is no longer relevant. Clearing the error type ensures that if the user
    // clicks the status bar later, they get the standard configuration flow
    // rather than an error-specific prompt.
    this.errorType = null;
    // Using custom icon defined in package.json contributes.icons section
    this.statusBarItem.text = "$(synthetic-status-icon)";
    this.statusBarItem.backgroundColor = undefined;
    this.statusBarItem.tooltip =
      "Configure your Synthetic.new API key to track usage";

    // Clear cache to force update
    this.clearCache();
  }

  /**
   * Set status bar to show "Please Set Key" message
   * Used when API key is explicitly set to "none" or after key is erased
   */
  setPleaseSetKey(): void {
    this.displayState = DisplayState.Idle;
    this.statusBarItem.text = "$(synthetic-status-icon) Please Set Key";
    this.statusBarItem.backgroundColor = undefined;
    this.statusBarItem.tooltip =
      "Click to configure your Synthetic.new API key";
    this.statusBarItem.command = "syntheticUsageTracker.configure";

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

  updateAutoRefreshInterval(
    intervalSeconds: number,
    refreshCallback: () => void,
  ): void {
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
