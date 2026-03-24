import * as vscode from "vscode";
import { UsageInfo, CategoryUsageInfo, TokenUsageInfo } from "../api/syntheticService";

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
  private lastConfig: Config | null = null;
  private currentUsage: UsageInfo | null = null;
  private tooltipRestoreTimeout: NodeJS.Timeout | null = null;
  private preventTooltipUpdateUntil: number = 0;

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
   * Design decision: Check all categories (subscription, search, toolCalls, and tokens)
   * and set the display state to the most severe condition. Critical takes
   * precedence over warning, which takes precedence over success.
   * Token usage is now included in the calculation for the new beta API format.
   */
  private updateDisplayState(usage: UsageInfo, config: Config): void {
    const percentages = [
      usage.subscription.percentageUsed,
      usage.search.percentageUsed,
      usage.toolCalls.percentageUsed,
    ];

    // Include token usage percentages if available and limits are > 0 (beta API format)
    if (usage.weeklyTokens) {
      if (usage.weeklyTokens.input.limit > 0) {
        percentages.push(usage.weeklyTokens.input.percentageUsed);
      }
      if (usage.weeklyTokens.output.limit > 0) {
        percentages.push(usage.weeklyTokens.output.percentageUsed);
      }
    }

    const maxPercentage = Math.max(...percentages);

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
   *
   * Design decision: Reset command to showUsage when usage is successfully updated.
   * This ensures clicking the status bar shows details instead of setting a key.
   */
  private updateStatusBarItem(usage: UsageInfo, config: Config): void {
    // Check if tooltip updates are currently prevented
    const now = Date.now();
    const shouldUpdateTooltip = now > this.preventTooltipUpdateUntil;

    const text = this.buildText(usage, config);
    const tooltip = this.buildTooltip(usage, config);

    // Only update if values have actually changed
    const needsUpdate =
      this.lastText !== text ||
      (shouldUpdateTooltip && this.lastTooltip !== tooltip) ||
      this.lastDisplayState !== this.displayState;

    if (needsUpdate) {
      this.statusBarItem.text = text;

      // Only update tooltip if updates are not prevented
      if (shouldUpdateTooltip) {
        this.statusBarItem.tooltip = tooltip;
      }

      this.statusBarItem.command = "syntheticUsageTracker.showUsage";
      this.updateStatusColor();

      // Update cache
      this.lastText = text;
      if (shouldUpdateTooltip) {
        this.lastTooltip = tooltip;
      }
      this.lastDisplayState = this.displayState;
      this.lastConfig = config;
    }
  }

  /**
   * Build status bar text showing mana pool information
   *
   * Design decision: Display mana pool information using the ⧗ symbol (U+29D7).
   * The API now returns mana-based data where:
   * - limit = maxBalance (mana capacity)
   * - remaining = current balance (available mana)
   * - requests = maxBalance - balance (mana used)
   *
   * This provides a more intuitive representation of the resource system
   * while maintaining backward compatibility with existing field names.
   *
   * Rationale:
   * - The ⧗ symbol visually represents the mana/energy concept
   * - Showing current/max (e.g., "⧗ 450/500") gives immediate resource awareness
   * - Mana percentage is calculated as (remaining/limit) * 100 for color thresholds
   * - Raw numbers provide precise values when showRawNumbers is enabled
   * - Token percentage from weekly tokens is still displayed when available
   *
   * When weeklyTokens is not available or has no limits, token% shows as "-".
   */
  private buildText(usage: UsageInfo, config: Config): string {
    // Build warning symbol for categories
    const warningSymbol = this.buildCategoryWarningSymbols(usage, config);

    // Calculate mana values from subscription quota
    // Design decision: Use remaining/limit for mana display since the API
    // maps mana data to these legacy fields (balance -> remaining, maxBalance -> limit)
    const subscription = usage.subscription;
    const currentMana = subscription.remaining;
    const maxMana = subscription.limit;
    const manaPercentage = maxMana > 0 ? (currentMana / maxMana) * 100 : 0;

    // Calculate token percentage - use the highest of input/output if available
    let tokenPercentage: number | null = null;
    if (usage.weeklyTokens) {
      const tokenPercentages: number[] = [];
      if (usage.weeklyTokens.input.limit > 0) {
        tokenPercentages.push(usage.weeklyTokens.input.percentageUsed);
      }
      if (usage.weeklyTokens.output.limit > 0) {
        tokenPercentages.push(usage.weeklyTokens.output.percentageUsed);
      }
      if (tokenPercentages.length > 0) {
        tokenPercentage = Math.max(...tokenPercentages);
      }
    }

    // Build mana display with ⧗ symbol: ⧗ percentage%  token%
    const tokenDisplay = tokenPercentage !== null ? `${tokenPercentage.toFixed(0)}%` : "-";
    let text = `$(synthetic-status-icon) ⧗ ${manaPercentage.toFixed(0)}%  ${tokenDisplay}`;

    if (config.showRawNumbers) {
      text += ` (${currentMana}/${maxMana})`;
    }

    // Add warning symbol if any category exceeds threshold
    if (warningSymbol.length > 0) {
      text += ` ${warningSymbol}`;
    }

    return text;
  }

  /**
   * Build tooltip with detailed usage information for all categories
   *
   * Design decision: Display all quota categories (Subscription, Search, Tool Calls,
   * and Weekly Token Limits) with individual progress bars and detailed metrics.
   * This provides users with comprehensive visibility into their API usage across
   * all quota types including the new beta API token limits.
   *
   * Security consideration: Only show the last 4 characters of the API key for
   * identification purposes. The rest is masked with asterisks to prevent accidental
   * exposure of sensitive credentials.
   */
  private buildTooltip(usage: UsageInfo, config: Config): string {
    const subscription = usage.subscription;
    const search = usage.search;
    const toolCalls = usage.toolCalls;
    const weeklyTokens = usage.weeklyTokens;

    // Mask API key: show only the prefix (syn_) and last 4 characters
    const maskedKey = this.maskApiKey(config.apiKey);

    let tooltip = "### Synthetic.new Usage\n\n";

    // Subscription category
    tooltip += this.buildCategoryTooltip("Subscription", subscription);

    // Search category (hourly)
    tooltip += this.buildCategoryTooltip("Search (hourly)", search);

    // Tool Calls category
    // Design decision: Hide tool-calls section only when both values are zero (0/0).
    // This avoids showing a misleading empty quota block while still surfacing atypical
    // states such as requests > 0 with limit 0 or limit > 0 with requests 0.
    if (!(toolCalls.requests === 0 && toolCalls.limit === 0)) {
      tooltip += this.buildCategoryTooltip("Free Tool Calls (daily)", toolCalls);
    }

    // Weekly Token Limits (beta API format) - only show if limits are > 0
    if (weeklyTokens && (weeklyTokens.input.limit > 0 || weeklyTokens.output.limit > 0)) {
      tooltip += "## Weekly Token Limits\n";
      if (weeklyTokens.input.limit > 0) {
        tooltip += this.buildTokenTooltip("Input Tokens", weeklyTokens.input);
      }
      if (weeklyTokens.output.limit > 0) {
        tooltip += this.buildTokenTooltip("Output Tokens", weeklyTokens.output);
      }
      tooltip += `Renews At: ${weeklyTokens.renewAtString}\n`;
      tooltip += `Time Remaining: ${this.calculateTimeRemaining(weeklyTokens.renewAt)}\n\n`;
    }

    // Add masked API key at the bottom for identification
    tooltip += `━━━━━━━━━━━━━━━━\nAPI Key: ${maskedKey}`;

    return tooltip;
  }

  /**
   * Build tooltip section for token usage
   *
   * Design decision: Format large token numbers (millions) as "14.6M / 150M" for
   * readability. This provides consistent formatting with request-based quotas
   * while making large token numbers more comprehensible.
   */
  private buildTokenTooltip(name: string, tokenInfo: TokenUsageInfo): string {
    const percentageUsed = tokenInfo.percentageUsed.toFixed(1);
    const percentageRemaining = (100 - tokenInfo.percentageUsed).toFixed(1);

    const formattedCurrent = this.formatTokenNumber(tokenInfo.current);
    const formattedLimit = this.formatTokenNumber(tokenInfo.limit);
    const formattedRemaining = this.formatTokenNumber(tokenInfo.remaining);

    let section = `### ${name}\n`;
    section += `Tokens: ${formattedCurrent} / ${formattedLimit} (${percentageUsed}%)\n`;
    section += `Remaining: ${formattedRemaining} (${percentageRemaining}%)\n`;
    section += `${this.buildAsciiProgressBar(tokenInfo.percentageUsed)}\n`;

    return section;
  }

  /**
   * Format large token numbers for readability
   *
   * Design decision: Convert large numbers to "M" (millions) or "K" (thousands)
   * format for better readability. Examples: 14621030 -> "14.6M", 293309 -> "293K".
   * This makes the tooltip more compact and easier to scan at a glance.
   */
  private formatTokenNumber(num: number): string {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${Math.round(num / 1000)}K`;
    }
    return num.toLocaleString();
  }

  private maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 8) {
      return apiKey ? "***" : "(not configured)";
    }
    const prefix = apiKey.substring(0, 4);
    const lastFour = apiKey.slice(-4);
    const maskedMiddle = "•".repeat(Math.max(1, apiKey.length - 8));
    return `${prefix}${maskedMiddle}${lastFour}`;
  }

  /**
   * Build tooltip section for a single category
   *
   * Design decision: Use ASCII progress bar for visual representation of quota usage.
   * This provides immediate visual feedback about how much of the quota has been used.
   * Progress bars are left-aligned with each category section for better readability.
   */
  private buildCategoryTooltip(name: string, category: CategoryUsageInfo): string {
    const percentageUsed = category.percentageUsed.toFixed(1);
    const percentageRemaining = (100 - category.percentageUsed).toFixed(1);
    const timeRemaining = this.calculateTimeRemaining(category.renewAt);

    let section = `## ${name}\n`;
    section += `Requests: ${category.requests.toLocaleString()} / ${category.limit.toLocaleString()} (${percentageUsed}%)\n`;
    section += `Remaining: ${category.remaining.toLocaleString()} (${percentageRemaining}%)\n`;
    section += `Renews At: ${category.renewAtString}\n`;
    section += `Time Remaining: ${timeRemaining}\n`;
    section += `${this.buildAsciiProgressBar(category.percentageUsed)}\n\n`;

    return section;
  }

  /**
   * Calculate time remaining until renewal in human-readable format
   *
   * Design decision: Format time as "Xh Ym from now" or "Xd Yh from now" for clarity.
   * Handles edge cases like negative time (already renewed) and very short durations.
   */
  private calculateTimeRemaining(renewAt: Date): string {
    const now = new Date();
    const diffMs = renewAt.getTime() - now.getTime();

    if (diffMs <= 0) {
      return "now";
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    // Handle different time scales for better readability
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h from now`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m from now`;
    } else if (minutes > 0) {
      return `${minutes}m from now`;
    } else {
      return "now";
    }
  }

  /**
   * Build warning symbols for categories exceeding thresholds
   *
   * Design decision: Return a single '!' symbol when either search, tool_calls,
   * or token usage quota exceeds the warning threshold. This provides immediate
   * visual feedback about potential resource constraints without cluttering the UI
   * with multiple icons. Token usage is now included for the beta API format.
   *
   * Symbol selection rationale:
   * - Single '!' appears when any non-subscription quota exceeds threshold (80%)
   * - Subscription quota is reflected in the main percentage display, so no symbol needed
   * - Simplified display reduces visual clutter while still alerting users
   */
  private buildCategoryWarningSymbols(usage: UsageInfo, config: Config): string {
    const searchHigh = usage.search.percentageUsed > config.warningThreshold;
    const toolCallsHigh = usage.toolCalls.percentageUsed > config.warningThreshold;

    // Check token usage if available and limits are > 0 (beta API format)
    let tokensHigh = false;
    if (usage.weeklyTokens) {
      if (usage.weeklyTokens.input.limit > 0 && usage.weeklyTokens.input.percentageUsed > config.warningThreshold) {
        tokensHigh = true;
      }
      if (usage.weeklyTokens.output.limit > 0 && usage.weeklyTokens.output.percentageUsed > config.warningThreshold) {
        tokensHigh = true;
      }
    }

    // Return single '!' if search OR tool_calls OR token usage is high
    if (searchHigh || toolCallsHigh || tokensHigh) {
      return "!";
    }

    return "";
  }

  /**
   * Build an ASCII progress bar string using 10 segments
   *
   * Design decision: Use 10 segments for a compact, readable progress representation.
   * Each segment represents 10% of the total quota. Uses standard ASCII characters
   * (█ for filled, ░ for empty) for maximum compatibility and clean appearance.
   * Does not include colors/status - that's handled by the status bar background color.
   *
   * Public method to allow extension.ts to reuse for popup display.
   */
  buildAsciiProgressBar(percentage: number): string {
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
   *
   * Design decision: Keep the current text (percentage display) but replace the normal
   * icon with the loading icon. This prevents the percentage from disappearing during refresh,
   * maintaining context for the user.
   */
  setLoading(): void {
    this.displayState = DisplayState.Loading;
    this.statusBarItem.tooltip = "Loading usage data...";
    this.statusBarItem.backgroundColor = undefined;

    // Keep the current text but replace icon with loading icon
    if (this.lastText) {
      // Replace $(synthetic-status-icon) with $(synthetic-status-loading)
      this.statusBarItem.text = this.lastText.replace('$(synthetic-status-icon)', '$(synthetic-status-loading)');
    } else {
      // Fallback if no previous text
      this.statusBarItem.text = "$(synthetic-status-loading) Synthetic.new";
    }

    this.clearCache();
  }

  /**
   * Set idle state (no API key configured)
   *
   * Design decision: Use error background color to alert users that configuration
   * is needed. The red background draws attention to the status bar,
   * making it clear that setup is required. The command change to setApiKey
   * allows clicking to configure.
   */
  setIdle(): void {
    this.displayState = DisplayState.Idle;
    this.statusBarItem.text = "$(synthetic-status-icon) Synthetic.new";
    this.statusBarItem.tooltip = "Configure API key to track usage";
    this.statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.errorBackground",
    );
    this.statusBarItem.command = "syntheticUsageTracker.showKeyActions";
    this.clearCache();
  }

  /**
   * Set error state
   *
   * Design decision: Change command to setApiKey so users can fix authentication errors
   * by clicking the status bar and providing a valid key.
   */
  setError(message: string): void {
    this.displayState = DisplayState.Error;
    this.statusBarItem.text = "$(error) Synthetic.new";
    this.statusBarItem.tooltip = message;
    this.statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.errorBackground",
    );
    this.statusBarItem.command = "syntheticUsageTracker.showKeyActions";
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
    this.lastConfig = null;
  }

  /**
   * Clear tooltip temporarily with optional auto-restore
   *
   * Design decision: Clear tooltip after user interactions (setting key, clearing key,
   * clicking status bar) to prevent persistent tooltips. Optionally restore after
   * delayMs to keep tooltips available most of the time.
   *
   * @param restoreAfterMs - Delay in milliseconds before restoring tooltip (0 = permanent clear until hover)
   * @param preventUpdate - If true, prevent tooltip updates during the timeout period
   */
  clearTooltip(restoreAfterMs: number = 0, preventUpdate: boolean = false): void {
    const currentTooltip = this.statusBarItem.tooltip;
    if (!currentTooltip) {
      return;
    }

    // Clear any existing restore timeout
    if (this.tooltipRestoreTimeout) {
      clearTimeout(this.tooltipRestoreTimeout);
      this.tooltipRestoreTimeout = null;
    }

    // Set prevent update flag if specified
    if (preventUpdate && restoreAfterMs > 0) {
      this.preventTooltipUpdateUntil = Date.now() + restoreAfterMs;
    }

    // Store the tooltip for restoration
    const tooltipToRestore = currentTooltip;

    // Clear tooltip immediately
    this.statusBarItem.tooltip = "";

    // Restore tooltip after delay if specified
    if (restoreAfterMs > 0) {
      this.tooltipRestoreTimeout = setTimeout(() => {
        // Clear prevent update flag
        this.preventTooltipUpdateUntil = 0;
        this.tooltipRestoreTimeout = null;

        // Restore tooltip with current data if available
        if (this.currentUsage) {
          const config = this.getCurrentConfig();
          if (config) {
            this.statusBarItem.tooltip = this.buildTooltip(this.currentUsage, config);
          }
        } else {
          // Fallback to original tooltip
          this.statusBarItem.tooltip = tooltipToRestore;
        }
      }, restoreAfterMs);
    }
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
    * Get cached config for tooltip restoration
    *
    * Design decision: Use cached config values when restoring tooltip
    * during timeout. This ensures the masked API key is preserved from
    * the latest update, showing the actual key in use.
    */
  private getCurrentConfig(): Config | null {
    return this.lastConfig;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.stopAutoRefresh();
    if (this.tooltipRestoreTimeout) {
      clearTimeout(this.tooltipRestoreTimeout);
      this.tooltipRestoreTimeout = null;
    }
    this.statusBarItem.dispose();
  }
}

