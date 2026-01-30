/**
 * Category-specific usage breakdown
 *
 * Design decision: Each category tracks its own usage metrics independently.
 * This allows users to see detailed breakdowns by service type (tools, search, etc.).
 * Categories are optional to handle partial data or missing categories.
 */
export interface CategoryUsage {
  limit: number;
  used: number;
  remaining: number;
  percentageUsed: number;
}

/**
 * Known usage categories
 *
 * Design decision: Use string literal union for known categories to provide
 * type safety while remaining extensible for future categories. The API may
 * add new categories over time, so we use a flexible structure.
 */
export type UsageCategory = 'tools' | 'search' | 'chat' | 'other' | string;

/**
 * Synthetic.new API quota response structure with category breakdowns
 *
 * Design decision: Support both legacy and new payload formats:
 * - Legacy format: { subscription: { limit, requests, renewsAt } }
 * - New format: { subscription: { limit, requests, renewsAt, categories: {...} } }
 *
 * The subscription field is optional to handle cases where API keys exist
 * but have no active subscription (returns empty object {}). The categories
 * field is also optional for backward compatibility with API keys that don't
 * have category breakdowns yet.
 */
export interface QuotaResponse {
  subscription?: {
    limit: number;
    requests: number;
    renewsAt: string;
    /**
     * Optional category breakdowns by usage type
     * Key is the category name (e.g., "tools", "search", "chat")
     * Value contains usage metrics for that category
     */
    categories?: Record<UsageCategory, CategoryUsage>;
  };
}

/**
 * Usage information derived from quota response
 *
 * Design decision: Maintain backward compatibility by keeping the original
 * fields while adding optional category breakdowns. This ensures existing UI
 * code continues to work without modification, while new UI can take advantage
 * of the detailed category data when available.
 */
export interface UsageInfo {
  // Overall usage (aggregated across all categories)
  limit: number;
  requests: number;
  remaining: number;
  percentageUsed: number;
  renewsAt: Date;
  renewsAtString: string;

  /**
   * Optional category-specific usage breakdowns
   * Only populated if the API returns category data
   *
   * Design decision: Use optional field to gracefully handle cases where:
   * - API returns legacy format without categories
   * - API key doesn't have category breakdowns enabled
   * - Some categories are missing from the response
   */
  categories?: Record<UsageCategory, CategoryUsage>;
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
 * - maxDelay: 10000s prevents excessively long wait times
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

      const data = await response.json() as QuotaResponse;
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
   * Design decision: Support both legacy and new API response formats:
   * - Legacy: { subscription: { limit, requests, renewsAt } }
   * - New: { subscription: { limit, requests, renewsAt, categories: {...} } }
   *
   * Check for missing subscription data to handle API keys that exist but have no
   * active subscription. The API returns an empty object {} in this case, which
   * we detect and throw a specific error.
   *
   * Category breakdowns are optional - if present, we parse and calculate
   * percentages for each category. If absent, we return the legacy format
   * without category data, ensuring backward compatibility.
   */
  private parseQuotaResponse(data: QuotaResponse): UsageInfo {
    if (!data.subscription) {
      throw new ApiError(
        ApiErrorType.NoSubscription,
        "No subscription data detected. Please check your Synthetic.new account."
      );
    }

    const { limit, requests, renewsAt, categories } = data.subscription;
    const remaining = Math.max(0, limit - requests);
    const percentageUsed = limit > 0 ? (requests / limit) * 100 : 0;

    /**
     * Design decision: Build the return object conditionally to handle exactOptionalPropertyTypes
     * TypeScript's strict mode requires that optional properties not be assigned undefined.
     * Instead, we only include the categories property when it has a value.
     */
    const result: UsageInfo = {
      limit,
      requests,
      remaining,
      percentageUsed: Math.round(percentageUsed * 100) / 100,
      renewsAt: new Date(renewsAt),
      renewsAtString: new Date(renewsAt).toLocaleString(),
    };

    // Only add categories if present in the response
    if (categories) {
      result.categories = this.parseCategories(categories);
    }

    return result;
  }

  /**
   * Parse category breakdowns and calculate percentages for each
   *
   * Design decision: Calculate remaining and percentage for each category
   * to provide consistent data structure across all categories. This ensures
   * the UI doesn't need to perform these calculations.
   *
   * Gracefully handle partial data - if a category is missing required fields,
   * we skip it rather than failing the entire response.
   */
  private parseCategories(
    categories: Record<UsageCategory, CategoryUsage>
  ): Record<UsageCategory, CategoryUsage> {
    const parsed: Record<UsageCategory, CategoryUsage> = {};

    for (const [categoryName, categoryData] of Object.entries(categories)) {
      // Validate that category has required fields
      if (
        typeof categoryData.limit === "number" &&
        typeof categoryData.used === "number"
      ) {
        const remaining = Math.max(0, categoryData.limit - categoryData.used);
        const percentageUsed =
          categoryData.limit > 0 ? (categoryData.used / categoryData.limit) * 100 : 0;

        parsed[categoryName] = {
          limit: categoryData.limit,
          used: categoryData.used,
          remaining,
          percentageUsed: Math.round(percentageUsed * 100) / 100,
        };
      }
      // Skip categories with invalid data - design decision: fail gracefully
      // rather than throwing an error, as partial category data is better than none
    }

    return parsed;
  }

  /**
   * Execute fetch with retry logic using exponential backoff
   *
   * Design decision: Don't retry on authentication errors, no subscription errors, or
   * the last attempt. This prevents wasting time on requests that will never succeed
   * and provides faster feedback to users.
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

        // Don't retry on no subscription errors - account state won't change
        if (lastError instanceof ApiError && lastError.type === ApiErrorType.NoSubscription) {
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
