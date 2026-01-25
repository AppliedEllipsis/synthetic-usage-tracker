# API Documentation

This document describes the Synthetic.ai API used by the extension and the extension's internal API.

## Synthetic.ai API

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
| `Authorization` | `Bearer {api_key}` | Your Synthetic.ai API key |
| `Content-Type` | `application/json` | Content type |

### Response Format

The API returns a JSON object with the following structure:

```typescript
{
  "subscription": {
    "limit": number,        // Total request limit
    "requests": number,     // Number of requests used
    "renewsAt": string      // ISO 8601 date string
  }
}
```

### Example Response

```json
{
  "subscription": {
    "limit": 135,
    "requests": 0,
    "renewsAt": "2025-09-21T14:36:14.288Z"
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
  apiKey: string;              // API key (stored in SecretStorage)
  apiEndpoint: string;         // API endpoint URL
  refreshInterval: number;     // Auto-refresh interval in seconds
  statusBarPosition: "left" | "right";
  showPercentage: boolean;
  showRawNumbers: boolean;
  enableNotifications: boolean;
  warningThreshold: number;    // Warning threshold (0-100)
  criticalThreshold: number;   // Critical threshold (0-100)
}
```

### API Types

#### `QuotaResponse`

Raw API response structure:

```typescript
interface QuotaResponse {
  subscription: {
    limit: number;
    requests: number;
    renewsAt: string;
  };
}
```

#### `UsageInfo`

Parsed usage information:

```typescript
interface UsageInfo {
  limit: number;              // Total request limit
  requests: number;           // Requests used
  remaining: number;          // Requests remaining
  percentageUsed: number;     // Percentage used (0-100)
  renewsAt: Date;            // Renewal date
  renewsAtString: string;    // Formatted renewal date string
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
  dispose(): void;
}
```

### Synthetic Service API

#### `SyntheticService`

API client for Synthetic.ai:

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
| `syntheticUsageTracker.openDashboard` | Open Synthetic.ai dashboard |

### Configuration Schema

#### VSCode Configuration

The extension contributes the following configuration properties:

```json
{
  "syntheticUsageTracker.apiKey": {
    "type": "string",
    "default": "",
    "description": "Your Synthetic.ai API key"
  },
  "syntheticUsageTracker.apiEndpoint": {
    "type": "string",
    "default": "https://api.synthetic.new/v2",
    "description": "The Synthetic.ai API endpoint"
  },
  "syntheticUsageTracker.refreshInterval": {
    "type": "number",
    "default": 60,
    "minimum": 10,
    "maximum": 3600,
    "description": "Auto-refresh interval in seconds"
  },
  "syntheticUsageTracker.statusBarPosition": {
    "type": "string",
    "enum": ["left", "right"],
    "default": "right",
    "description": "Position of the usage indicator"
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

- [Synthetic.ai API Documentation](https://dev.synthetic.new/docs/synthetic/quotas)
- [Architecture Documentation](architecture.md)
- [Development Guide](development.md)
