/**
 * Base quota category interface
 *
 * Design decision: Common structure for all quota categories with limit, requests,
 * and renewal timestamp. Each category has independent limits and renewal cycles.
 * The API returns "renewsAt" (with 's') as the field name.
 *
 * Mana-based API addition: The API now supports a mana-based resource pool system
 * with balance, maxBalance, regenRate, and nextRegen fields. Legacy fields are
 * calculated from mana fields when present to maintain backward compatibility.
 *
 * Design rationale: The mana system represents usage as a depleting balance that
 * regenerates over time, which is more accurate for modern API usage patterns.
 * By keeping legacy fields required and calculating them from mana fields,
 * existing code continues to work without modification.
 */
export interface QuotaCategory {
  /** @deprecated Use maxBalance instead. Total capacity (limit = maxBalance) */
  limit: number;
  /** @deprecated Use balance instead. Used amount (requests = maxBalance - balance) */
  requests: number;
  /** @deprecated Use nextRegen instead. Renewal timestamp (renewsAt = now + nextRegen) */
  renewsAt: string;
  // Mana-based fields (optional for backward compatibility)
  /** Current mana balance available for use */
  balance?: number;
  /** Maximum mana capacity */
  maxBalance?: number;
  /** Mana regeneration rate per minute */
  regenRate?: number;
  /** Seconds until next regeneration */
  nextRegen?: number;
}

/**
 * Search quota - wrapped in hourly object
 *
 * Design decision: Search quota is uniquely wrapped in an hourly object to
 * indicate its hourly renewal cycle. This structure differs from other categories.
 */
export interface SearchQuota {
  hourly: QuotaCategory;
}

/**
 * Token quota for input/output tracking
 *
 * Design decision: Token quotas track current usage vs limit separately from
 * request-based quotas. Used for weekly token limits in the new beta API format.
 */
export interface TokenQuota {
  current: number;
  limit: number;
}

/**
 * Weekly token limit structure
 *
 * Design decision: The beta API returns weekly token limits with separate
 * input and output token tracking, each with current usage and limit.
 * This allows users to monitor their token consumption independently of request counts.
 */
export interface WeeklyTokenLimit {
  renewsAt: string;
  input: TokenQuota;
  output: TokenQuota;
}

/**
 * Synthetic.new API quota response structure
 *
 * Design decision: The API returns three distinct quota categories:
 * - subscription: Overall subscription usage
 * - search: Hourly search quota (wrapped in hourly object)
 * - freeToolCalls/toolCallDiscounts: Free tool call usage (daily)
 *
 * Each category has limit, requests, and renewsAt fields. Calculated fields
 * (remaining, percentageUsed)
 * must be computed client-side.
 *
 * Design rationale: subscription and freeToolCalls/toolCallDiscounts use QuotaCategory
 * directly since they have the same structure. search uses SearchQuota wrapper because
 * the API nests the hourly quota in an "hourly" object.
 *
 * Beta API addition: weeklyTokenLimit tracks input/output token usage separately
 * from request counts, allowing users to monitor their token consumption.
 */
export interface QuotaResponse {
  subscription?: QuotaCategory;
  search?: SearchQuota;
  freeToolCalls?: QuotaCategory;
  toolCallDiscounts?: QuotaCategory;
  weeklyTokenLimit?: WeeklyTokenLimit;
}

/**
 * Category usage information with calculated fields
 * 
 * Design decision: Extend the base QuotaCategory with calculated fields
 * (remaining, percentageUsed) that are computed client-side from the API response.
 */
export interface CategoryUsageInfo {
  limit: number;
  requests: number;
  remaining: number;
  percentageUsed: number;
  renewAt: Date;
  renewAtString: string;
}

/**
 * Token usage information with calculated fields
 *
 * Design decision: Similar to CategoryUsageInfo but for token-based quotas.
 * Tracks current usage vs limit with calculated percentage and remaining tokens.
 */
export interface TokenUsageInfo {
  current: number;
  limit: number;
  remaining: number;
  percentageUsed: number;
}

/**
 * Weekly token usage information
 *
 * Design decision: Aggregate token usage for both input and output tokens
 * with renewal timestamp. Optional to maintain backward compatibility with
 * older API versions that don't include token limits.
 */
export interface WeeklyTokenUsage {
  input: TokenUsageInfo;
  output: TokenUsageInfo;
  renewAt: Date;
  renewAtString: string;
}

/**
 * Usage information for all quota categories
 *
 * Design decision: Aggregate all three quota categories into a single type
 * for easy consumption by the UI. Each category is optional to handle cases
 * where the API might not return all categories.
 *
 * Beta API addition: weeklyTokens tracks input/output token usage separately
 * from request counts. Optional for backward compatibility.
 */
export interface UsageInfo {
  subscription: CategoryUsageInfo;
  search: CategoryUsageInfo;
  toolCalls: CategoryUsageInfo;
  weeklyTokens?: WeeklyTokenUsage;
}

/**
 * Error types for API requests
 */
export enum ApiErrorType {
  Network = "Network",
  Authentication = "Authentication",
  RateLimit = "RateLimit",
  Server = "Server",
  NoSubscription = "NoSubscription",
  Unknown = "Unknown",
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public type: ApiErrorType,
    message: string,
    public originalError?: Error,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Retry configuration
 *
 * Design decision: Encapsulate retry parameters to make them configurable
 * and testable. This allows adjustment without modifying core logic.
 */
interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

/**
 * Default retry configuration following exponential backoff pattern
 *
 * Design rationale:
 * - maxRetries: 3 attempts balance reliability with responsiveness
 * - initialDelay: 1000ms gives transient failures time to recover
 * - maxDelay: 10000ms prevents excessively long wait times
 * - backoffFactor: 2 follows standard exponential backoff to reduce server load
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
};

/**
 * Sleep function for retry delays
 *
 * Design decision: Use Promise-based setTimeout for cleaner async/await flow
 * compared to callback-based setTimeout. This integrates seamlessly with
 * the retry logic's try-catch structure.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff
 *
 * Design decision: Exponential backoff reduces server load during outages by
 * spacing out retry attempts. Capping at maxDelay prevents the delay from
 * growing unbounded, which would frustrate users waiting for results.
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = config.initialDelay * Math.pow(config.backoffFactor, attempt);
  return Math.min(delay, config.maxDelay);
}

/**
 * Synthetic.new API service client
 * Handles API communication with retry logic and error handling
 *
 * Design decision: Each instance is stateful and bound to a specific API key.
 * This design allows for easy testing with different keys and supports scenarios
 * where multiple keys might be used (e.g., testing vs production).
 */
export class SyntheticService {
  private apiKey: string;
  private apiEndpoint: string;
  private retryConfig: RetryConfig;

  constructor(apiKey: string, apiEndpoint: string = "https://api.synthetic.new/v2") {
    this.apiKey = apiKey;
    this.apiEndpoint = apiEndpoint;
    this.retryConfig = DEFAULT_RETRY_CONFIG;
  }

  /**
   * Fetch quota information from Synthetic.new API
   */
  async fetchQuota(): Promise<UsageInfo> {
    return this.retryFetch(() => this.fetchQuotaInternal());
  }

  /**
   * Internal quota fetch without retry logic
   */
  private async fetchQuotaInternal(): Promise<UsageInfo> {
    const url = `${this.apiEndpoint}/quotas`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data = (await response.json()) as QuotaResponse;
      return this.parseQuotaResponse(data);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        ApiErrorType.Network,
        "Network error occurred while fetching quota",
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Handle HTTP error responses
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorType = ApiErrorType.Unknown;
    let message = `API request failed with status ${response.status}`;

    switch (response.status) {
      case 401:
      case 403:
        errorType = ApiErrorType.Authentication;
        message = "Authentication failed. Please check your API key.";
        break;
      case 429:
        errorType = ApiErrorType.RateLimit;
        message = "Rate limit exceeded. Please try again later.";
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        errorType = ApiErrorType.Server;
        message = "Server error occurred. Please try again later.";
        break;
    }

    // Try to get error details from response body
    try {
      const errorData = await response.json();
      if (errorData && typeof errorData === 'object' && 'error' in errorData) {
        message = String(errorData.error);
      }
    } catch {
      // Ignore JSON parsing errors
    }

    throw new ApiError(errorType, message);
  }

  /**
   * Parse quota response into usage information
   *
   * Design decision: Parse all three quota categories (subscription, search, toolCalls)
   * and calculate remaining and percentageUsed for each. The search category is uniquely
   * wrapped in an hourly object, which we extract and convert to the common format.
   * 
   * Beta API addition: Parse weeklyTokenLimit if present to track input/output token usage
   * separately from request counts. Optional for backward compatibility with older API versions.
   * 
   * Alternative considered: Only parse subscription and ignore other categories
   * Rejected: Users need visibility into all quota types to make informed decisions
   * about API usage. The multi-category structure provides valuable insights.
   */
  private parseQuotaResponse(data: QuotaResponse): UsageInfo {
    if (!data.subscription) {
      throw new ApiError(
        ApiErrorType.NoSubscription,
        "No subscription quota data returned from Synthetic.new API.",
      );
    }

    const toolCallsCategory = data.freeToolCalls ?? data.toolCallDiscounts;

    const usageInfo: UsageInfo = {
      subscription: this.parseCategory(data.subscription),
      search: this.parseCategory(data.search?.hourly ?? this.buildEmptyCategory()),
      toolCalls: this.parseCategory(toolCallsCategory ?? this.buildEmptyCategory()),
    };

    // Parse weekly token limits if present (beta API feature)
    if (data.weeklyTokenLimit) {
      usageInfo.weeklyTokens = this.parseWeeklyTokenLimit(data.weeklyTokenLimit);
    }

    return usageInfo;
  }

  /**
   * Parse weekly token limit into token usage information
   *
   * Design decision: Calculate remaining and percentageUsed for both input and output
   * tokens separately. The API provides current usage and limit for each token type.
   * 
   * Design rationale: Tokens are tracked separately from requests because users may
   * have different usage patterns for input vs output tokens. This allows monitoring
   * of both independently.
   */
  private parseWeeklyTokenLimit(weeklyTokenLimit: WeeklyTokenLimit): WeeklyTokenUsage {
    const inputRemaining = Math.max(0, weeklyTokenLimit.input.limit - weeklyTokenLimit.input.current);
    const inputPercentageUsed =
      weeklyTokenLimit.input.limit > 0
        ? (weeklyTokenLimit.input.current / weeklyTokenLimit.input.limit) * 100
        : 0;

    const outputRemaining = Math.max(0, weeklyTokenLimit.output.limit - weeklyTokenLimit.output.current);
    const outputPercentageUsed =
      weeklyTokenLimit.output.limit > 0
        ? (weeklyTokenLimit.output.current / weeklyTokenLimit.output.limit) * 100
        : 0;

    return {
      input: {
        current: weeklyTokenLimit.input.current,
        limit: weeklyTokenLimit.input.limit,
        remaining: inputRemaining,
        percentageUsed: inputPercentageUsed,
      },
      output: {
        current: weeklyTokenLimit.output.current,
        limit: weeklyTokenLimit.output.limit,
        remaining: outputRemaining,
        percentageUsed: outputPercentageUsed,
      },
      renewAt: new Date(weeklyTokenLimit.renewsAt),
      renewAtString: weeklyTokenLimit.renewsAt,
    };
  }

  private buildEmptyCategory(): QuotaCategory {
    return {
      limit: 0,
      requests: 0,
      renewsAt: "",
    };
  }

  /**
   * Parse a single quota category and calculate derived fields
   *
   * Design decision: Support both legacy quota-based and new mana-based API responses
   * for backward compatibility. When mana fields are present, calculate legacy fields
   * from them to ensure existing UI components continue working without modification.
   *
   * Mana-to-legacy field mapping:
   * - limit = maxBalance (total capacity)
   * - requests = maxBalance - balance (used amount)
   * - remaining = balance (available amount)
   * - percentageUsed = ((maxBalance - balance) / maxBalance) * 100
   * - renewsAt = now + nextRegen seconds (converted to timestamp)
   *
   * Alternative considered: Create separate parsing methods for each format
   * Rejected: Would require changes throughout the codebase. Unified parsing
   * keeps the change localized to this single method.
   */
  private parseCategory(category: QuotaCategory): CategoryUsageInfo {
    let limit: number;
    let requests: number;
    let renewsAt: string;

    // Check if this is a mana-based response (new format)
    if (category.balance !== undefined && category.maxBalance !== undefined) {
      // Mana-based: calculate legacy fields from mana values
      limit = category.maxBalance;
      requests = category.maxBalance - category.balance;

      // Calculate renewsAt from nextRegen (seconds until next regeneration)
      if (category.nextRegen !== undefined && category.nextRegen > 0) {
        const renewTimestamp = Date.now() + category.nextRegen * 1000;
        renewsAt = new Date(renewTimestamp).toISOString();
      } else {
        renewsAt = category.renewsAt || "";
      }
    } else {
      // Legacy format: use fields directly
      limit = category.limit;
      requests = category.requests;
      renewsAt = category.renewsAt;
    }

    const remaining = Math.max(0, limit - requests);
    const percentageUsed = limit > 0 ? (requests / limit) * 100 : 0;
    const renewAt = new Date(renewsAt);

    // Validate date is not invalid - show "Unknown" instead of "Invalid Date"
    if (renewsAt && isNaN(renewAt.getTime())) {
      console.error(`Invalid renewal timestamp: ${renewsAt}`);
    }

    const renewAtString = isNaN(renewAt.getTime())
      ? "Unknown"
      : renewAt.toLocaleString();

    return {
      limit,
      requests,
      remaining,
      percentageUsed: Math.round(percentageUsed * 100) / 100,
      renewAt,
      renewAtString,
    };
  }

  /**
   * Execute fetch with retry logic using exponential backoff
   *
   * Design decision: Don't retry on authentication errors or the last attempt.
   * This prevents wasting time on requests that will never succeed and provides
   * faster feedback to users.
   */
  private async retryFetch<T>(fetchFn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.retryConfig.maxRetries; attempt++) {
      try {
        return await fetchFn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on authentication errors - they won't succeed
        if (lastError instanceof ApiError && lastError.type === ApiErrorType.Authentication) {
          throw lastError;
        }

        // Don't retry on the last attempt
        if (attempt === this.retryConfig.maxRetries - 1) {
          break;
        }

        // Calculate delay and wait before retry
        const delay = calculateDelay(attempt, this.retryConfig);
        await sleep(delay);
      }
    }

    throw lastError || new Error("Max retries exceeded");
  }

  /**
   * Validate API key format
   * Synthetic.new API keys typically start with "syn_"
   */
  static validateApiKey(apiKey: string): boolean {
    return apiKey.length > 0 && apiKey.startsWith("syn_");
  }

  /**
   * Test if the API key is valid by making a request
   */
  async testApiKey(): Promise<boolean> {
    try {
      await this.fetchQuota();
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.type === ApiErrorType.Authentication) {
        return false;
      }
      throw error;
    }
  }
}

/**
 * Create a user-friendly error message from API error
 *
 * Design decision: Provide clear, actionable error messages that guide users toward
 * resolving the issue. Network errors specifically mention checking internet connection
 * to help users distinguish between API issues vs local connectivity problems.
 */
export function getErrorMessage(error: ApiError): string {
  switch (error.type) {
    case ApiErrorType.Network:
      return "Network error. Please check your internet connection and try again.";
    case ApiErrorType.Authentication:
      return "Invalid API key. Please configure a valid Synthetic.new API key.";
    case ApiErrorType.NoSubscription:
      return error.message || "No subscription data detected. Please check your Synthetic.new account.";
    case ApiErrorType.RateLimit:
      return "Rate limit exceeded. Please wait a moment before trying again.";
    case ApiErrorType.Server:
      return "Synthetic.new server error. Please try again later.";
    default:
      return error.message || "An unknown error occurred.";
  }
}
