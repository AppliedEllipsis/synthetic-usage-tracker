import * as vscode from "vscode";
import { UsageInfo, CategoryUsageInfo } from "../api/syntheticService";

/**
 * Configuration interface for the usage indicator
 */
export interface Config {
  apiKey: string;
  showPercentage: boolean;
  showRawNumbers: boolean;
  warningThreshold: number;
  criticalThreshold: number;
}

/**
 * Display state enum for status bar
 */
export enum DisplayState {
  Loading = "loading",
  Idle = "idle",
  Success = "success",
  Warning = "warning",
  Critical = "critical",
  Error = "error",
}

/**
 * Usage Indicator - Manages status bar display for Synthetic.new API usage
 *
 * Design decision: Cache last rendered values to prevent unnecessary status bar
 * redraws, which can cause visual flickering. This improves UX and performance
 * during frequent updates (e.g., auto-refresh cycles).
 */
export class UsageIndicator {
  private statusBarItem: vscode.StatusBarItem;
  private autoRefreshTimer: NodeJS.Timeout | null = null;
  private isAutoRefreshEnabled: boolean = false;

  // Cache to prevent unnecessary redraws
  // Design rationale: VS Code status bar updates can cause visual flickering
  // if done too frequently. Caching the last rendered values allows us to skip
  // redundant updates when data hasn't changed, improving UX and performance.
  private lastText: string | null = null;
  private lastTooltip: string | null = null;
  private lastDisplayState: DisplayState | null = null;
  private currentUsage: UsageInfo | null = null;

  constructor(context: vscode.ExtensionContext) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    this.statusBarItem.command = "syntheticUsageTracker.showUsage";
    context.subscriptions.push(this.statusBarItem);
    this.statusBarItem.show();
  }

  /**
   * Update usage data and refresh status bar display
   */
  updateUsage(usage: UsageInfo, config: Config): void {
    this.currentUsage = usage;

    // Determine display state based on highest usage across all categories
    this.updateDisplayState(usage, config);

    // Update status bar item
    this.updateStatusBarItem(usage, config);
  }

  /**
   * Determine display state based on usage across all categories
   *
   * Design decision: Check all three categories (subscription, search, toolCalls)
   * and set the display state to the most severe condition. Critical takes
   * precedence over warning, which takes precedence over success.
   */
  private updateDisplayState(usage: UsageInfo, config: Config): void {
    const maxPercentage = Math.max(
      usage.subscription.percentageUsed,
      usage.search.percentageUsed,
      usage.toolCalls.percentageUsed,
    );

    if (maxPercentage >= config.criticalThreshold) {
      this.displayState = DisplayState.Critical;
    } else if (maxPercentage >= config.warningThreshold) {
      this.displayState = DisplayState.Warning;
    } else {
      this.displayState = DisplayState.Success;
    }
  }

  /**
   * Update the status bar item with usage information
   */
  private updateStatusBarItem(usage: UsageInfo, config: Config): void {
    const text = this.buildText(usage, config);
    const tooltip = this.buildTooltip(usage, config);

    // Only update if values have actually changed
    const needsUpdate =
      this.lastText !== text ||
      this.lastTooltip !== tooltip ||
      this.lastDisplayState !== this.displayState;

    if (needsUpdate) {
      this.statusBarItem.text = text;
      this.statusBarItem.tooltip = tooltip;
      this.updateStatusColor();

      // Update cache
      this.lastText = text;
      this.lastTooltip = tooltip;
      this.lastDisplayState = this.displayState;
    }
  }

  /**
   * Build status bar text showing overall usage
   *
   * Design decision: Display subscription usage as the primary indicator since
   * it represents the overall subscription quota. Add warning symbols for
   * categories exceeding thresholds to provide quick visual feedback.
   */
  private buildText(usage: UsageInfo, config: Config): string {
    const subscription = usage.subscription;
    // Build warning symbols for categories
    const symbols = this.buildCategoryWarningSymbols(usage, config);

    let text = `$(api) ${subscription.percentageUsed.toFixed(0)}%`;

    if (config.showRawNumbers) {
      text += ` (${subscription.requests}/${subscription.limit})`;
    }

    // Add warning symbols if any category is over threshold
    if (symbols.length > 0) {
      text += ` ${symbols.join("")}`;
    }

    return text;
  }

  /**
   * Build tooltip with detailed usage information for all categories
   *
   * Design decision: Display all three quota categories (Subscription, Search, Tool Calls)
   * with individual progress bars and detailed metrics. This provides users with
   * comprehensive visibility into their API usage across all quota types.
   *
   * Security consideration: Only show the last 4 characters of the API key for
   * identification purposes. The rest is masked with asterisks to prevent accidental
   * exposure of sensitive credentials.
   */
  private buildTooltip(usage: UsageInfo, config: Config): string {
    const subscription = usage.subscription;
    const search = usage.search;
    const toolCalls = usage.toolCalls;

    // Mask API key: show only the prefix (syn_) and last 4 characters
    const maskedKey = this.maskApiKey(config.apiKey);

    let tooltip = "### Synthetic.new Usage\n\n";

    // Subscription category
    tooltip += this.buildCategoryTooltip("Subscription", subscription);

    // Search category (hourly)
    tooltip += this.buildCategoryTooltip("Search (hourly)", search);

    // Tool Calls category
    tooltip += this.buildCategoryTooltip("Tool Calls", toolCalls);

    // Add masked API key at the bottom for identification
    tooltip += `---\n**Key:** ${maskedKey}`;

    return tooltip;
  }

  /**
   * Mask API key by showing only prefix and last 4 characters
   *
   * Security decision: Mask the API key to prevent accidental exposure in tooltips
   * while still allowing users to identify which key is being used. The format is
   * "syn_****abcd" where "syn_" is the prefix and "abcd" are the last 4 characters.
   *
   * Design rationale: Users often have multiple API keys and need to verify which
   * one is active. Showing the last 4 characters provides enough information for
   * identification without compromising security.
   */
  private maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 8) {
      return "****";
    }
    const prefix = apiKey.substring(0, 4); // Typically "syn_"
    const lastFour = apiKey.slice(-4);
    const maskedMiddle = "*".repeat(apiKey.length - 8);
    return `${prefix}${maskedMiddle}${lastFour}`;
  }

  /**
   * Build tooltip section for a single category
   *
   * Design decision: Use ASCII progress bar for visual representation of quota usage.
   * This provides immediate visual feedback about how much of the quota has been used.
   */
  private buildCategoryTooltip(name: string, category: CategoryUsageInfo): string {
    const percentageUsed = category.percentageUsed.toFixed(1);
    const percentageRemaining = (100 - category.percentageUsed).toFixed(1);

    let section = `**${name}**\n`;
    section += `Renews: ${category.renewAtString}\n`;
    section += `Used: ${category.requests.toLocaleString()} (${percentageUsed}%)\n`;
    section += `Remaining: ${category.remaining.toLocaleString()} (${percentageRemaining}%)\n`;
    section += `Limit: ${category.limit.toLocaleString()}\n`;
    section += `${this.buildAsciiProgressBar(category.percentageUsed)}\n\n`;

    return section;
  }

  /**
   * Build warning symbols for categories exceeding thresholds
   *
   * Design decision: Use category-specific emoji symbols to quickly identify which
   * quota categories are over their warning threshold without needing to hover.
   * This provides immediate visual feedback about potential resource constraints.
   *
   * Symbol selection rationale:
   * - 🔍 (magnifying glass) for search quota - represents search operations
   * - 🔧 (wrench) for tool calls quota - represents tool/function operations
   * - Only show symbols when the respective quota exceeds the warning threshold (80%)
   * - This provides targeted, category-specific feedback without cluttering the UI
   */
  private buildCategoryWarningSymbols(usage: UsageInfo, _config: Config): string[] {
    const symbols: string[] = [];

    // Design decision: Only show symbols for search and tool calls quotas when > 80%
    // Rationale: Search (hourly) and tool calls quotas can be depleted quickly and
    // independently, so they need immediate visibility. Subscription quota changes
    // are reflected in the main percentage display, so no separate symbol needed.

    // Check search quota - add 🔍 when over 80%
    if (usage.search.percentageUsed > 80) {
      symbols.push("🔍");
    }

    // Check tool calls quota - add 🔧 when over 80%
    if (usage.toolCalls.percentageUsed > 80) {
      symbols.push("🔧");
    }

    return symbols;
  }

  /**
   * Build an ASCII progress bar string using 10 segments
   *
   * Design decision: Use 10 segments for a compact, readable progress representation.
   * Each segment represents 10% of the total quota. Uses standard ASCII characters
   * (█ for filled, ░ for empty) for maximum compatibility and clean appearance.
   * Does not include colors/status - that's handled by the status bar background color.
   */
  private buildAsciiProgressBar(percentage: number): string {
    const totalSegments = 10;
    const filledSegments = Math.round((percentage / 100) * totalSegments);
    const emptySegments = totalSegments - filledSegments;
    return `[${"█".repeat(filledSegments)}${"░".repeat(emptySegments)}] ${percentage.toFixed(0)}%`;
  }

  /**
   * Update the status bar color based on display state
   */
  private updateStatusColor(): void {
    switch (this.displayState) {
      case DisplayState.Critical:
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.errorBackground",
        );
        break;
      case DisplayState.Warning:
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.warningBackground",
        );
        break;
      default:
        this.statusBarItem.backgroundColor = undefined;
    }
  }

  /**
   * Set loading state
   */
  setLoading(): void {
    this.displayState = DisplayState.Loading;
    this.statusBarItem.text = "$(loading~spin) Synthetic.new";
    this.statusBarItem.tooltip = "Loading usage data...";
    this.statusBarItem.backgroundColor = undefined;
    this.clearCache();
  }

  /**
   * Set idle state (no API key configured)
   */
  setIdle(): void {
    this.displayState = DisplayState.Idle;
    this.statusBarItem.text = "$(api) Synthetic.new";
    this.statusBarItem.tooltip = "Configure API key to track usage";
    this.statusBarItem.backgroundColor = undefined;
    this.clearCache();
  }

  /**
   * Set error state
   */
  setError(message: string): void {
    this.displayState = DisplayState.Error;
    this.statusBarItem.text = "$(error) Synthetic.new";
    this.statusBarItem.tooltip = message;
    this.statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.errorBackground",
    );
    this.clearCache();
  }

  /**
   * Start auto-refresh with specified interval
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
   * Stop auto-refresh
   */
  stopAutoRefresh(): void {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }
    this.isAutoRefreshEnabled = false;
  }

  /**
   * Clear cache to force next update
   */
  private clearCache(): void {
    this.lastText = null;
    this.lastTooltip = null;
    this.lastDisplayState = null;
  }

  /**
   * Get current display state
   */
  get displayState(): DisplayState {
    return this._displayState || DisplayState.Idle;
  }

  /**
   * Set display state
   */
  set displayState(state: DisplayState) {
    this._displayState = state;
  }

  private _displayState: DisplayState = DisplayState.Idle;

  /**
   * Get current usage data
   */
  getCurrentUsage(): UsageInfo | null {
    return this.currentUsage;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.stopAutoRefresh();
    this.statusBarItem.dispose();
  }
}
