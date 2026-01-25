/**
 * Synthetic.ai API quota response structure
 */
export interface QuotaResponse {
  subscription: {
    limit: number;
    requests: number;
    renewsAt: string;
  };
}

/**
 * Usage information derived from quota response
 */
export interface UsageInfo {
  limit: number;
  requests: number;
  remaining: number;
  percentageUsed: number;
  renewsAt: Date;
  renewsAtString: string;
}

/**
 * Error types for API requests
 */
export enum ApiErrorType {
  Network = "Network",
  Authentication = "Authentication",
  RateLimit = "RateLimit",
  Server = "Server",
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
 */
interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

/**
 * Default retry configuration following exponential backoff pattern
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
};

/**
 * Sleep function for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = config.initialDelay * Math.pow(config.backoffFactor, attempt);
  return Math.min(delay, config.maxDelay);
}

/**
 * Synthetic.ai API service client
 * Handles API communication with retry logic and error handling
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
   * Fetch quota information from Synthetic.ai API
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
   */
  private parseQuotaResponse(data: QuotaResponse): UsageInfo {
    const { limit, requests, renewsAt } = data.subscription;
    const remaining = Math.max(0, limit - requests);
    const percentageUsed = limit > 0 ? (requests / limit) * 100 : 0;

    return {
      limit,
      requests,
      remaining,
      percentageUsed: Math.round(percentageUsed * 100) / 100,
      renewsAt: new Date(renewsAt),
      renewsAtString: new Date(renewsAt).toLocaleString(),
    };
  }

  /**
   * Execute fetch with retry logic using exponential backoff
   */
  private async retryFetch<T>(fetchFn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.retryConfig.maxRetries; attempt++) {
      try {
        return await fetchFn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on authentication errors
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
   * Update the API key
   */
  updateApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Update the API endpoint
   */
  updateApiEndpoint(apiEndpoint: string): void {
    this.apiEndpoint = apiEndpoint;
  }

  /**
   * Validate API key format
   * Synthetic.ai API keys typically start with "syn_"
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
 */
export function getErrorMessage(error: ApiError): string {
  switch (error.type) {
    case ApiErrorType.Network:
      return "Network error. Please check your internet connection.";
    case ApiErrorType.Authentication:
      return "Invalid API key. Please configure a valid Synthetic.ai API key.";
    case ApiErrorType.RateLimit:
      return "Rate limit exceeded. Please wait a moment before trying again.";
    case ApiErrorType.Server:
      return "Synthetic.ai server error. Please try again later.";
    default:
      return error.message || "An unknown error occurred.";
  }
}
