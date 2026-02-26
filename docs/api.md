# API Documentation

This document describes the Synthetic.new API used by the extension and the extension's internal API.

## Synthetic.new API Overview

**Official Documentation:** [https://dev.synthetic.new/](https://dev.synthetic.new/)

Synthetic.new provides an AI service offering **OpenAI-compatible** and **Anthropic-compatible** APIs for accessing open-source models on secure infrastructure. The API documentation categorizes endpoints by compatibility type rather than by version numbers (v1/v2):

- **OpenAI-compatible endpoints:** Chat, models, completions, embeddings
- **Anthropic-compatible endpoints:** Messages, token counting
- **Synthetic endpoint:** Quotas (usage tracking)

### Base URL Notes

Multiple base URLs are referenced in different documentation sources:

| Base URL | Source | Notes |
|----------|--------|-------|
| `https://api.glhf.chat/v1/` | Getting Started documentation | Legacy base URL shown in docs |
| `https://api.synthetic.new/openai/v1` | OpenAI-compatible endpoints | For chat, models, completions, embeddings, messages |
| `https://api.synthetic.new/v2` | Synthetic-native endpoints | **Only** for /quotas endpoint |

**Important:**
- Use `https://api.synthetic.new/v2` **only** for `/quotas` endpoint
- Use `https://api.synthetic.new/openai/v1` for all other endpoints (models, chat, completions, embeddings, messages)
- **Note:** `/v2/models` does NOT exist - models must be fetched via `/openai/v1/models`

### Authentication

API requests are authenticated using a Bearer token in the Authorization header:

```http
Authorization: Bearer syn_your_api_key_here
```

API keys typically start with the `syn_` prefix. Obtain your API key from [https://dev.synthetic.new/](https://dev.synthetic.new/).

### Rate Limits by Subscription Tier

Rate limits vary by subscription plan:

| Tier | Messages | Renewal Period |
|------|----------|----------------|
| Standard | 135 | Every 5 hours |
| Pro | 1350 | Every 5 hours |
| Usage Based | Unlimited | N/A |

**Special Considerations:**
- Small requests (<2048 input/output tokens) count as 0.2 requests
- Tool call messages count for 0.1 requests
- Quotas are tracked separately for subscription, search, and tool calls

### OpenAI-Compatible Endpoints

The following endpoints provide OpenAI API compatibility:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/models` | GET | List all always-on models and recently used on-demand models |
| `/chat/completions` | POST | Chat-based completions with conversation history |
| `/completions` | POST | Traditional text completions |
| `/embeddings` | POST | Transform text into vector embeddings |

**Base URL for OpenAI-compatible endpoints:** `https://api.synthetic.new/openai/v1`

### Anthropic-Compatible Endpoints

The following endpoints provide Anthropic API compatibility:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/messages` | POST | Send and receive messages |
| `/messages/count_tokens` | POST | Count tokens in messages |

### Model Naming Convention

Models use the `hf:` prefix to indicate Hugging Face integration:

**Examples:**
- `hf:zai-org/GLM-4.6`
- `hf:deepseek-ai/DeepSeek-V3`
- `hf:meta-llama/Llama-3.1-70B-Instruct`

## Synthetic.new API

### Quotas Endpoint

```
GET https://api.synthetic.new/v2/quotas
```

### Authentication

API requests are authenticated using a Bearer token in the Authorization header:

```http
Authorization: Bearer syn_your_api_key_here
```

### Request Headers

| Header | Value | Description |
|--------|-------|-------------|
| `Authorization` | `Bearer {api_key}` | Your Synthetic.new API key |
| `Content-Type` | `application/json` | Content type |

### Response Format

The API returns a JSON object with three distinct quota categories:

```typescript
{
  "subscription": {
    "limit": number,              // Total request limit
    "requests": number,           // Number of requests used
    "renewsAt": string            // ISO 8601 date string
  },
  "search": {
    "hourly": {
      "limit": number,           // Hourly search limit
      "requests": number,        // Search requests used
      "renewsAt": string         // ISO 8601 date string
    }
  },
  "freeToolCalls": {
    "limit": number,             // Free tool calls/small requests daily quota
    "requests": number,          // Free tool calls/small requests used
    "renewsAt": string           // ISO 8601 date string
  }
}
```

**Key observations:**
1. Three distinct quota categories: `subscription`, `search`, and `freeToolCalls` (sometimes `toolCallDiscounts`)
2. `search` quota is uniquely wrapped in an `hourly` object
3. `freeToolCalls` tracks free daily tool calls/small requests (first 500 standard / 2500 pro per day are free, then counted as normal requests)
4. Each category has `limit`, `requests`, and `renewsAt` fields
5. No calculated fields - `remaining` and `percentageUsed` are computed client-side
6. Different renewal cycles for each category

### Models Endpoint

Models are available through the OpenAI-compatible endpoint:

```
GET https://api.synthetic.new/openai/v1/models
```

**Important:** `/v2/models` does NOT exist. Models must be fetched via `/openai/v1/models`.

**Response Format:**

```typescript
{
  "data": Array<{
    "id": string,                    // Model ID (e.g., "hf:zai-org/GLM-4.7")
    "hugging_face_id": string,        // Hugging Face model ID
    "name": string,                   // Model name
    "provider": string,               // Provider (e.g., "synthetic")
    "always_on": boolean,             // Whether model is always available
    "input_modalities": string[],     // Input types (["text"])
    "output_modalities": string[],    // Output types (["text"])
    "context_length": number,         // Maximum context window
    "max_output_length": number,      // Maximum output tokens
    "pricing": {
      "prompt": string,               // Price per prompt token
      "completion": string,           // Price per completion token
      "image": string,                // Price per image (if applicable)
      "request": string,              // Price per request
      "input_cache_reads": string,    // Price for cache reads
      "input_cache_writes": string    // Price for cache writes
    },
    "created": number,                // Creation timestamp
    "quantization": string,           // Quantization (e.g., "fp8")
    "supported_sampling_parameters": string[],  // Parameters (temp, top_p, etc.)
    "supported_features": string[],   // Features (tools, json_mode, etc.)
    "openrouter": {
      "slug": string                  // OpenRouter model identifier
    },
    "datacenters": Array<{
      "country_code": string          // Datacenter location
    }>
  }>
}
```

The API returns available models, all with `hf:` prefix indicating Hugging Face integration.

### Example Response

```json
{
  "subscription": {
    "limit": 135,
    "requests": 33,
    "renewsAt": "2026-01-30T20:20:59.408Z"
  },
  "search": {
    "hourly": {
      "limit": 250,
      "requests": 0,
      "renewsAt": "2026-01-30T20:25:50.409Z"
    }
  },
  "freeToolCalls": {
    "limit": 1620,
    "requests": 271,
    "renewsAt": "2026-01-31T10:17:00.411Z"
  }
}
```

### Error Responses

The API may return the following HTTP status codes:

| Status | Description |
|--------|-------------|
| `200` | Success |
| `401` | Unauthorized - Invalid API key |
| `403` | Forbidden - API key lacks permission |
| `429` | Too Many Requests - Rate limit exceeded |
| `500` | Internal Server Error |
| `502` | Bad Gateway |
| `503` | Service Unavailable |
| `504` | Gateway Timeout |

### Rate Limiting

The extension implements client-side rate limiting through:
- Configurable refresh intervals (minimum 10 seconds)
- Exponential backoff retry logic
- Graceful error handling

## Internal Extension API

### Configuration Types

#### `Configuration`

Main configuration interface:

```typescript
interface Configuration {
  apiEndpoint: string;         // API endpoint URL
  refreshInterval: number;     // Auto-refresh interval in seconds
  showPercentage: boolean;
  showRawNumbers: boolean;
  enableNotifications: boolean;
  warningThreshold: number;    // Warning threshold (0-100)
  criticalThreshold: number;   // Critical threshold (0-100)
}
```

### API Types

#### `QuotaCategory`

Base interface for a quota category:

```typescript
interface QuotaCategory {
  limit: number;              // Total request limit for the category
  requests: number;           // Number of requests used
  renewsAt: string;           // ISO 8601 date string
}
```

#### `SubscriptionQuota`

Direct quota category for subscription usage:

```typescript
interface SubscriptionQuota extends QuotaCategory {
  // Direct quota category - no nesting
}
```

#### `SearchQuota`

Quota category wrapped in hourly object:

```typescript
interface SearchQuota {
  hourly: QuotaCategory;      // Search quota is uniquely wrapped in an hourly object
}
```

#### `FreeToolCallsQuota`

Quota category for free tool calls:

```typescript
interface FreeToolCallsQuota extends QuotaCategory {
  // Free tool calls/small requests daily quota
}
```

#### `QuotaResponse`

Raw API response structure with three distinct quota categories:

```typescript
interface QuotaResponse {
  subscription: QuotaCategory;       // Subscription quota
  search: SearchQuota;               // Search quota (wrapped in hourly object)
  freeToolCalls?: QuotaCategory;     // Free tool calls/small requests daily quota
  toolCallDiscounts?: QuotaCategory; // Alternate tool calls field
}
```

#### `QuotaResponse`

Raw API response structure with three distinct quota categories:

```typescript
interface QuotaResponse {
  subscription: QuotaCategory;  // Subscription quota
  search: SearchQuota;          // Search quota (wrapped in hourly object)
  toolCalls: QuotaCategory;     // Tool calls quota (mapped from freeToolCalls/toolCallDiscounts)
}
```

#### `CategoryUsageInfo`

Enhanced quota category with client-side calculated fields:

```typescript
interface CategoryUsageInfo extends QuotaCategory {
  renewAt: Date;              // Parsed renewal date
  remaining: number;          // Calculated: limit - requests
  percentageUsed: number;     // Calculated: (requests / limit) * 100
}
```

#### `UsageInfo`

Parsed usage information with all three quota categories:

```typescript
interface UsageInfo {
  subscription: CategoryUsageInfo;       // Subscription usage
  search: CategoryUsageInfo;             // Search usage (extracted from hourly wrapper)
  toolCalls: CategoryUsageInfo;          // Free tool calls usage (parsed from freeToolCalls)
}
```

**Note:** The API returns `freeToolCalls` (or `toolCallDiscounts`) but the extension maps this to `toolCalls` internally for consistency.

#### `ApiErrorType`

Error type enumeration:

```typescript
enum ApiErrorType {
  Network = "Network",
  Authentication = "Authentication",
  RateLimit = "RateLimit",
  Server = "Server",
  Unknown = "Unknown",
}
```

#### `ApiError`

Custom error class:

```typescript
class ApiError extends Error {
  constructor(
    public type: ApiErrorType,
    message: string,
    public originalError?: Error,
  );
}
```

### Configuration Manager API

#### `ConfigurationManager`

Main configuration management class:

```typescript
class ConfigurationManager {
  constructor(context: vscode.ExtensionContext);
  getConfig(): Configuration;
  getApiKey(): Promise<string | undefined>;
  setApiKey(apiKey: string): Promise<void>;
  deleteApiKey(): Promise<void>;
  hasApiKey(): Promise<boolean>;
  onConfigChange(callback: () => void): void;
  watchSharedStateChanges(pollInterval?: number): vscode.Disposable;
  getKeysTimestamp(): Promise<number>;
  dispose(): void;
}
```

### Synthetic Service API

#### `SyntheticService`

API client for Synthetic.new:

```typescript
class SyntheticService {
  constructor(apiKey: string, apiEndpoint?: string);
  fetchQuota(): Promise<UsageInfo>;
  updateApiKey(apiKey: string): void;
  updateApiEndpoint(apiEndpoint: string): void;
  testApiKey(): Promise<boolean>;
  static validateApiKey(apiKey: string): boolean;
}
```

#### `getErrorMessage()`

Get user-friendly error message:

```typescript
function getErrorMessage(error: ApiError): string;
```

### Usage Indicator API

#### `UsageIndicator`

Status bar UI manager:

```typescript
class UsageIndicator {
  constructor(context: vscode.ExtensionContext);
  updateUsage(usage: UsageInfo, config: DisplayConfig): void;
  setLoading(): void;
  setError(message: string): void;
  setIdle(): void;
  startAutoRefresh(intervalSeconds: number, callback: () => void): void;
  stopAutoRefresh(): void;
  toggleAutoRefresh(): boolean;
  isAutoRefreshActive(): boolean;
  updateAutoRefreshInterval(intervalSeconds: number, callback: () => void): void;
  getCurrentUsage(): UsageInfo | null;
  show(): void;
  hide(): void;
  dispose(): void;
}
```

#### `DisplayConfig`

Configuration for display:

```typescript
interface DisplayConfig {
  showPercentage: boolean;
  showRawNumbers: boolean;
  warningThreshold: number;
  criticalThreshold: number;
  enableNotifications: boolean;
}
```

### Extension Commands

The extension provides the following commands:

| Command ID | Description |
|------------|-------------|
| `syntheticUsageTracker.refresh` | Manually refresh usage data |
| `syntheticUsageTracker.configure` | Configure API key |
| `syntheticUsageTracker.showUsage` | Show detailed usage information |
| `syntheticUsageTracker.toggleAutoRefresh` | Toggle auto-refresh on/off |
| `syntheticUsageTracker.openDashboard` | Open Synthetic.new dashboard |

### Configuration Schema

#### VSCode Configuration

The extension contributes the following configuration properties:

```json
{
  "syntheticUsageTracker.apiEndpoint": {
    "type": "string",
    "default": "https://api.synthetic.new/v2",
    "description": "The Synthetic.new API endpoint"
  },
  "syntheticUsageTracker.refreshInterval": {
    "type": "number",
    "default": 60,
    "minimum": 10,
    "maximum": 3600,
    "description": "Auto-refresh interval in seconds"
  },
  "syntheticUsageTracker.showPercentage": {
    "type": "boolean",
    "default": true,
    "description": "Show usage as percentage"
  },
  "syntheticUsageTracker.showRawNumbers": {
    "type": "boolean",
    "default": false,
    "description": "Show raw request numbers"
  },
  "syntheticUsageTracker.enableNotifications": {
    "type": "boolean",
    "default": true,
    "description": "Show notifications"
  },
  "syntheticUsageTracker.warningThreshold": {
    "type": "number",
    "default": 80,
    "minimum": 0,
    "maximum": 100,
    "description": "Warning threshold percentage"
  },
  "syntheticUsageTracker.criticalThreshold": {
    "type": "number",
    "default": 90,
    "minimum": 0,
    "maximum": 100,
    "description": "Critical threshold percentage"
  }
}
```

## Usage Examples

### Fetching Usage Data

```typescript
import { SyntheticService } from "./api/syntheticService";

const service = new SyntheticService("syn_your_api_key", "https://api.synthetic.new/v2");

try {
  const usage = await service.fetchQuota();
  console.log(`Usage: ${usage.percentageUsed}% (${usage.requests}/${usage.limit})`);
} catch (error) {
  console.error("Failed to fetch usage:", error);
}
```

### Managing Configuration

```typescript
import { ConfigurationManager } from "./config/configuration";

const configManager = new ConfigurationManager(context);

// Get configuration
const config = configManager.getConfig();

// Store API key
await configManager.setApiKey("syn_your_api_key");

// Check if API key exists
const hasKey = await configManager.hasApiKey();

// Watch for changes
configManager.onConfigChange(() => {
  console.log("Configuration changed");
});
```

### Updating Status Bar

```typescript
import { UsageIndicator } from "./statusBar/usageIndicator";

const indicator = new UsageIndicator(context);

// Update with usage data
indicator.updateUsage(usage, {
  showPercentage: true,
  showRawNumbers: false,
  warningThreshold: 80,
  criticalThreshold: 90,
  enableNotifications: true,
});

// Start auto-refresh
indicator.startAutoRefresh(60, async () => {
  const usage = await fetchUsage();
  indicator.updateUsage(usage, config);
});
```

## Error Handling

### Handling API Errors

```typescript
import { ApiError, ApiErrorType, getErrorMessage } from "./api/syntheticService";

try {
  const usage = await service.fetchQuota();
} catch (error) {
  if (error instanceof ApiError) {
    switch (error.type) {
      case ApiErrorType.Network:
        // Handle network errors
        break;
      case ApiErrorType.Authentication:
        // Handle authentication errors
        break;
      case ApiErrorType.RateLimit:
        // Handle rate limit errors
        break;
      case ApiErrorType.Server:
        // Handle server errors
        break;
      default:
        // Handle unknown errors
    }
    const message = getErrorMessage(error);
    vscode.window.showErrorMessage(message);
  }
}
```

## Testing

### Unit Testing Components

```typescript
import assert from "assert";
import { SyntheticService } from "../src/api/syntheticService";

suite("SyntheticService Tests", () => {
  test("validateApiKey should validate correct format", () => {
    assert.strictEqual(SyntheticService.validateApiKey("syn_123456"), true);
    assert.strictEqual(SyntheticService.validateApiKey("api_123456"), false);
  });
});
```

## See Also

- [Synthetic.new API Documentation](https://dev.synthetic.new/docs/synthetic/quotas)
- [Architecture Documentation](architecture.md)
- [Development Guide](development.md)
