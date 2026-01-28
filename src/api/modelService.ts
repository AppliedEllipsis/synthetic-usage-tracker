/**
 * Model service for fetching and parsing model data from Synthetic.new API
 *
 * Design decision: Separate model service from syntheticService to maintain
 * single responsibility. The models endpoint uses v1 while quotas use v2,
 * and they have different response structures and error handling needs.
 */

import { ApiError, ApiErrorType, RetryConfig } from "./syntheticService";

/**
 * Provider types for Synthetic.new models
 * Design decision: Using string type with known values for autocomplete,
 * but allowing any string to handle unexpected providers from the API.
 * This ensures forward compatibility when new providers are added.
 */
export type ModelProvider = "synthetic" | "fireworks" | "together" | (string & {});

/**
 * Quantization types supported
 * Design decision: Flexible type to accommodate new quantization methods
 * that may be added in the future without requiring code changes.
 */
export type QuantizationType = "fp8" | "int4" | (string & {});

/**
 * Model pricing structure
 * Note: All values are strings, some with "$" prefix
 */
export interface ModelPricing {
  prompt: string;
  completion: string;
  image: string;
  request: string;
  input_cache_reads: string;
  input_cache_writes: string;
}

/**
 * Datacenter location information
 */
export interface Datacenter {
  country_code: string;
}

/**
 * OpenRouter integration metadata
 */
export interface OpenRouterInfo {
  slug: string;
}

/**
 * Complete model information from API
 * Design decision: Using index signature to allow for additional fields
 * that may be added to the API response in the future. This ensures
 * forward compatibility and prevents type errors when new fields are introduced.
 */
export interface Model {
  provider: ModelProvider;
  always_on: boolean;
  id: string;
  hugging_face_id: string;
  name: string;
  input_modalities: string[];
  output_modalities: string[];
  context_length: number;
  max_output_length: number;
  pricing: ModelPricing;
  created: number;
  quantization: QuantizationType;
  supported_sampling_parameters?: string[];
  supported_features?: string[];
  openrouter?: OpenRouterInfo;
  datacenters?: Datacenter[];
  /** Allow additional fields for forward compatibility */
  [key: string]: unknown;
}

/**
 * API response structure for models endpoint
 */
export interface ModelsResponse {
  data: Model[];
}

/**
 * Types of changes that can be detected
 */
export enum ModelChangeType {
  Added = "added",
  Removed = "removed",
  PricingChanged = "pricing_changed",
  FeaturesChanged = "features_changed",
  ProviderChanged = "provider_changed",
  AlwaysOnChanged = "always_on_changed",
  ContextLengthChanged = "context_length_changed",
  QuantizationChanged = "quantization_changed",
}

/**
 * Represents a detected change to a model
 */
export interface ModelChange {
  type: ModelChangeType;
  modelId: string;
  modelName: string;
  timestamp: number;
  details: {
    oldValue?: unknown;
    newValue?: unknown;
    differences?: string[];
  };
}

/**
 * Complete model snapshot for storage
 */
export interface ModelSnapshot {
  models: Model[];
  timestamp: number;
  checksum: string; // For quick comparison
}

/**
 * Stored model history
 */
export interface ModelHistory {
  snapshots: ModelSnapshot[];
  changes: ModelChange[];
  lastChecked: number;
}

/**
 * Default retry configuration for model API calls
 * Design rationale: Models change less frequently than usage quotas,
 * so we can be slightly more aggressive with retries. However, we still
 * want to avoid hammering the API during outages.
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
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
 * Generate a simple checksum for model comparison
 * Design decision: Use a simple string-based checksum for quick comparison
 * of model states. This is not cryptographically secure but is sufficient
 * for detecting changes in the model list.
 */
export function generateChecksum(models: Model[]): string {
  const modelIds = models
    .map((m) => m.id)
    .sort()
    .join(",");
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < modelIds.length; i++) {
    const char = modelIds.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

/**
 * Synthetic.new Model API service client
 * Handles API communication with retry logic and error handling
 *
 * Design decision: Each instance is stateful and bound to a specific API key.
 * This design allows for easy testing with different keys and supports scenarios
 * where multiple keys might be used (e.g., testing vs production).
 */
export class ModelService {
  private apiKey: string;
  private apiEndpoint: string;
  private retryConfig: RetryConfig;

  constructor(
    apiKey: string,
    apiEndpoint: string = "https://api.synthetic.new/v1"
  ) {
    this.apiKey = apiKey;
    this.apiEndpoint = apiEndpoint;
    this.retryConfig = DEFAULT_RETRY_CONFIG;
  }

  /**
   * Fetch models from Synthetic.new API
   */
  async fetchModels(): Promise<Model[]> {
    return this.retryFetch(() => this.fetchModelsInternal());
  }

  /**
   * Internal models fetch without retry logic
   */
  private async fetchModelsInternal(): Promise<Model[]> {
    const url = `${this.apiEndpoint}/models`;

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

      const data = (await response.json()) as ModelsResponse;
      return data.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        ApiErrorType.Network,
        "Network error occurred while fetching models",
        error instanceof Error ? error : undefined
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
      if (errorData && typeof errorData === "object" && "error" in errorData) {
        message = String(errorData.error);
      }
    } catch {
      // Ignore JSON parsing errors
    }

    throw new ApiError(errorType, message);
  }

  /**
   * Execute fetch with retry logic using exponential backoff
   *
   * Design decision: Don't retry on authentication errors or
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
        if (
          lastError instanceof ApiError &&
          lastError.type === ApiErrorType.Authentication
        ) {
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
   * Test if the API key is valid by making a request
   */
  async testApiKey(): Promise<boolean> {
    try {
      await this.fetchModels();
      return true;
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.type === ApiErrorType.Authentication
      ) {
        return false;
      }
      throw error;
    }
  }
}

/**
 * Detect changes between two model arrays
 *
 * Design decision: Compare by model ID (hf:{hugging_face_id}) as the primary key.
 * This is more stable than using the hugging_face_id alone since the ID format
 * includes the provider prefix.
 */
export function detectChanges(
  oldModels: Model[],
  newModels: Model[]
): ModelChange[] {
  const changes: ModelChange[] = [];
  const oldMap = createModelMap(oldModels);
  const newMap = createModelMap(newModels);

  // Detect added models
  for (const [id, model] of newMap) {
    if (!oldMap.has(id)) {
      changes.push(createChange(ModelChangeType.Added, model));
    }
  }

  // Detect removed models
  for (const [id, model] of oldMap) {
    if (!newMap.has(id)) {
      changes.push(createChange(ModelChangeType.Removed, model));
    }
  }

  // Detect changes in existing models
  for (const [id, newModel] of newMap) {
    const oldModel = oldMap.get(id);
    if (oldModel) {
      const modelChanges = detectModelChanges(oldModel, newModel);
      changes.push(...modelChanges);
    }
  }

  return changes;
}

/**
 * Create a map from model ID to model for efficient lookup
 */
function createModelMap(models: Model[]): Map<string, Model> {
  return new Map(models.map((m) => [m.id, m]));
}

/**
 * Detect changes within a single model
 */
function detectModelChanges(oldModel: Model, newModel: Model): ModelChange[] {
  const changes: ModelChange[] = [];

  // Check pricing changes
  if (hasPricingChanged(oldModel.pricing, newModel.pricing)) {
    changes.push(
      createChange(ModelChangeType.PricingChanged, newModel, {
        oldValue: oldModel.pricing,
        newValue: newModel.pricing,
      })
    );
  }

  // Check feature changes
  if (hasFeaturesChanged(oldModel, newModel)) {
    changes.push(
      createChange(ModelChangeType.FeaturesChanged, newModel, {
        oldValue: {
          supported_features: oldModel.supported_features,
          supported_sampling_parameters: oldModel.supported_sampling_parameters,
        },
        newValue: {
          supported_features: newModel.supported_features,
          supported_sampling_parameters: newModel.supported_sampling_parameters,
        },
      })
    );
  }

  // Check provider changes (rare but possible)
  if (oldModel.provider !== newModel.provider) {
    changes.push(
      createChange(ModelChangeType.ProviderChanged, newModel, {
        oldValue: oldModel.provider,
        newValue: newModel.provider,
      })
    );
  }

  // Check always_on changes
  if (oldModel.always_on !== newModel.always_on) {
    changes.push(
      createChange(ModelChangeType.AlwaysOnChanged, newModel, {
        oldValue: oldModel.always_on,
        newValue: newModel.always_on,
      })
    );
  }

  // Check context length changes
  if (oldModel.context_length !== newModel.context_length) {
    changes.push(
      createChange(ModelChangeType.ContextLengthChanged, newModel, {
        oldValue: oldModel.context_length,
        newValue: newModel.context_length,
      })
    );
  }

  // Check quantization changes
  if (oldModel.quantization !== newModel.quantization) {
    changes.push(
      createChange(ModelChangeType.QuantizationChanged, newModel, {
        oldValue: oldModel.quantization,
        newValue: newModel.quantization,
      })
    );
  }

  return changes;
}

/**
 * Create a ModelChange object
 */
function createChange(
  type: ModelChangeType,
  model: Model,
  details?: { oldValue?: unknown; newValue?: unknown }
): ModelChange {
  return {
    type,
    modelId: model.id,
    modelName: model.name,
    timestamp: Date.now(),
    details: details || {},
  };
}

/**
 * Check if pricing has changed
 */
function hasPricingChanged(
  oldPricing: ModelPricing,
  newPricing: ModelPricing
): boolean {
  return (
    oldPricing.prompt !== newPricing.prompt ||
    oldPricing.completion !== newPricing.completion ||
    oldPricing.image !== newPricing.image ||
    oldPricing.request !== newPricing.request ||
    oldPricing.input_cache_reads !== newPricing.input_cache_reads ||
    oldPricing.input_cache_writes !== newPricing.input_cache_writes
  );
}

/**
 * Check if features have changed
 */
function hasFeaturesChanged(oldModel: Model, newModel: Model): boolean {
  return (
    !arraysEqual(
      oldModel.supported_features,
      newModel.supported_features
    ) ||
    !arraysEqual(
      oldModel.supported_sampling_parameters,
      newModel.supported_sampling_parameters
    )
  );
}

/**
 * Compare two arrays for equality
 */
function arraysEqual(
  a: string[] | undefined,
  b: string[] | undefined
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every((val, i) => val === b[i]);
}
