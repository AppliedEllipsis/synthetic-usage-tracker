/**
 * Base quota category interface
 * 
 * Design decision: Common structure for all quota categories with limit, requests,
 * and renewal timestamp. Each category has independent limits and renewal cycles.
 */
export interface QuotaCategory {
  limit: number;
  requests: number;
  renewAt: string;
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
 * Synthetic.new API quota response structure
 *
 * Design decision: The API returns three distinct quota categories:
 * - subscription: Overall subscription usage
 * - search: Hourly search quota (wrapped in hourly object)
 * - toolCalls: Tool invocation usage
 *
 * Each category has limit, requests, and renewAt fields. The API uses "renewAt"
 * (not "renewsAt") as the field name. Calculated fields (remaining, percentageUsed)
 * must be computed client-side.
 *
 * Design rationale: subscription and toolCalls use QuotaCategory directly since they
 * have the same structure. search uses SearchQuota wrapper because the API nests
 * the hourly quota in an "hourly" object.
 */
export interface QuotaResponse {
  subscription: QuotaCategory;
  search: SearchQuota;
  toolCallDiscounts: QuotaCategory;
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
 * Usage information for all quota categories
 * 
 * Design decision: Aggregate all three quota categories into a single type
 * for easy consumption by the UI. Each category is optional to handle cases
 * where the API might not return all categories.
 */
export interface UsageInfo {
  subscription: CategoryUsageInfo;
  search: CategoryUsageInfo;
  toolCalls: CategoryUsageInfo;
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
   * Alternative considered: Only parse subscription and ignore other categories
   * Rejected: Users need visibility into all quota types to make informed decisions
   * about API usage. The multi-category structure provides valuable insights.
   */
  private parseQuotaResponse(data: QuotaResponse): UsageInfo {
    return {
      subscription: this.parseCategory(data.subscription),
      search: this.parseCategory(data.search.hourly),
      toolCalls: this.parseCategory(data.toolCallDiscounts),
    };
  }

  /**
   * Parse a single quota category and calculate derived fields
   *
   * Design decision: Calculate remaining and percentageUsed client-side since
   * the API only provides limit and requests. This ensures consistent calculations
   * across all categories regardless of API changes.
   * 
   * The API uses "renewAt" (not "renewsAt") as the field name - we use the exact
   * field name from the API to maintain consistency.
   */
  private parseCategory(category: QuotaCategory): CategoryUsageInfo {
    const remaining = Math.max(0, category.limit - category.requests);
    const percentageUsed =
      category.limit > 0 ? (category.requests / category.limit) * 100 : 0;
    const renewAt = new Date(category.renewAt);

    return {
      limit: category.limit,
      requests: category.requests,
      remaining,
      percentageUsed: Math.round(percentageUsed * 100) / 100,
      renewAt,
      renewAtString: renewAt.toLocaleString(),
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
