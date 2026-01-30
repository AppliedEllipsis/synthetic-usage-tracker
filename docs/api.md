# API Documentation

This document describes the Synthetic.new API used by the extension and the extension's internal API.

## Synthetic.new API

### Endpoint

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
    "limit": number,        // Total request limit
    "requests": number,     // Number of requests used
    "renewAt": string       // ISO 8601 date string (note: "renewAt" not "renewsAt")
  },
  "search": {
    "hourly": {
      "limit": number,     // Hourly search limit
      "requests": number,  // Search requests used
      "renewAt": string    // ISO 8601 date string
    }
  },
  "toolCalls": {
    "limit": number,       // Tool calls limit
    "requests": number,    // Tool calls used
    "renewAt": string      // ISO 8601 date string
  }
}
```

**Key observations:**
1. Three distinct quota categories: `subscription`, `search`, and `toolCalls`
2. `search` quota is uniquely wrapped in an `hourly` object
3. Each category has `limit`, `requests`, and `renewAt` fields (note: the API uses `renewAt` not `renewsAt`)
4. No calculated fields - `remaining` and `percentageUsed` are computed client-side
5. Different renewal cycles for each category

### Models Endpoint

The extension also supports querying available models through the OpenAI-compatible endpoint:

```
GET https://api.synthetic.new/openai/v1/models
```

**Response Format:**

```typescript
{
  "object": string,
  "data": Array<{
    "id": string,           // Model ID (e.g., "hf:deepseek-ai/DeepSeek-V3")
    "object": string,
    "created": number,
    "owned_by": string
  }>
}
```

The API returns 18 available models, all with `hf:` prefix indicating Hugging Face integration.

### Example Response

```json
{
  "subscription": {
    "limit": 135,
    "requests": 33,
    "renewAt": "2026-01-30T20:20:59.408Z"
  },
  "search": {
    "hourly": {
      "limit": 250,
      "requests": 0,
      "renewAt": "2026-01-30T20:25:50.409Z"
    }
  },
  "toolCalls": {
    "limit": 1620,
    "requests": 271,
    "renewAt": "2026-01-31T10:17:00.411Z"
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
  enableKeyCycling: boolean;   // Enable automatic key cycling
  cyclingStrategy: string;     // Key cycling strategy: roundRobin, leastUsed, random, priority
  autoCycleThreshold: number;  // Usage threshold percentage to trigger automatic key cycling
}
```

### API Types

#### `QuotaCategory`

Base interface for a quota category:

```typescript
interface QuotaCategory {
  limit: number;              // Total request limit for the category
  requests: number;           // Number of requests used
  renewAt: string;            // ISO 8601 date string (note: "renewAt" not "renewsAt")
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

#### `ToolCallsQuota`

Direct quota category for tool calls usage:

```typescript
interface ToolCallsQuota extends QuotaCategory {
  // Direct quota category - no nesting
}
```

#### `QuotaResponse`

Raw API response structure with three distinct quota categories:

```typescript
interface QuotaResponse {
  subscription: QuotaCategory;  // Subscription quota
  search: SearchQuota;          // Search quota (wrapped in hourly object)
  toolCalls: QuotaCategory;     // Tool calls quota
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
  subscription: CategoryUsageInfo;  // Subscription usage
  search: CategoryUsageInfo;        // Search usage (extracted from hourly wrapper)
  toolCalls: CategoryUsageInfo;     // Tool calls usage
}
```

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

### Key Management API

#### `ApiKey`

API key with metadata:

```typescript
interface ApiKey {
  key: string;              // The API key
  label?: string;           // Optional label for the key
  health?: number;          // Health score (0-100)
  lastUsed?: number;        // Timestamp of last usage
  failureCount?: number;    // Number of failures
  priority?: number;        // Priority for Priority strategy
}
```

#### `CyclingStrategy`

Key cycling strategy enumeration:

```typescript
enum CyclingStrategy {
  RoundRobin = "roundRobin",
  LeastUsed = "leastUsed",
  Random = "random",
  Priority = "priority",
}
```

#### `KeyManager`

Manages multiple API keys with labels and health tracking:

```typescript
class KeyManager {
  constructor(context: vscode.ExtensionContext);
  addKey(key: string, label?: string): Promise<void>;
  removeKey(index: number): Promise<void>;
  getKeys(): Promise<ApiKey[]>;
  getActiveKey(): Promise<string | undefined>;
  setActiveKey(index: number): Promise<void>;
  updateKeyHealth(index: number, health: number): Promise<void>;
  resetKeyStatistics(): Promise<void>;
  onKeysRefreshed(callback: () => void): void;
  watchSharedStateChanges(pollInterval?: number): vscode.Disposable;
  dispose(): void;
}
```

#### `KeyCyclingService`

Service for automatic key cycling based on health and usage:

```typescript
class KeyCyclingService {
  constructor(keyManager: KeyManager, strategy?: CyclingStrategy);
  selectKey(): Promise<string | undefined>;
  recordSuccess(key: string): Promise<void>;
  recordFailure(key: string): Promise<void>;
  updateHealth(index: number, delta: number): Promise<void>;
  calculateHealth(key: ApiKey): number;
  shouldAutoCycle(threshold: number, usage: UsageInfo): boolean;
  cycle(): Promise<string | undefined>;
  setStrategy(strategy: CyclingStrategy): void;
  getStrategy(): CyclingStrategy;
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
