# API Documentation

This document describes the Synthetic.new API used by the extension and the extension's internal API.

## Synthetic.new API

### API Versioning Overview

The Synthetic.new API uses versioned endpoints to provide different functionality:

- **v2 endpoints** (`/v2/*`) - Internal Synthetic.new features for quota and usage tracking
  - `/v2/quotas` - Fetch quota information and usage data
  - Includes subscription details and per-tool quota tracking

- **v1 endpoints** (`/v1/*`) - OpenAI-compatible API for models and completions
  - `/v1/models` - List available models
  - `/v1/chat/completions` - Chat completion requests
  - `/v1/embeddings` - Embedding requests

This extension primarily uses:
- **v2 `/quotas`** endpoint to display usage information in the status bar
- **v1 `/models`** endpoint to populate the models panel with available models

### Quota Endpoint (v2)

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

The API returns a JSON object containing subscription and tool-specific quota information:

```typescript
{
  "subscription": {
    "id": string,           // Subscription identifier
    "status": string,       // Subscription status (e.g., "active")
    "plan": string,         // Plan name
    "limit": number,        // Total request limit
    "requests": number,     // Number of requests used
    "remaining": number,    // Requests remaining
    "renewsAt": string      // ISO 8601 date string
  },
  "toolQuotas": [
    {
      "toolId": string,     // Tool identifier (e.g., "browser")
      "toolName": string,   // Display name (e.g., "Browser")
      "limit": number,      // Tool-specific request limit
      "requests": number,   // Tool-specific requests used
      "remaining": number,  // Tool-specific requests remaining
      "renewsAt": string    // ISO 8601 date string
    }
  ]
}
```

### Example Response

```json
{
  "subscription": {
    "id": "sub_abc123",
    "status": "active",
    "plan": "Pro",
    "limit": 1000,
    "requests": 150,
    "remaining": 850,
    "renewsAt": "2026-02-01T00:00:00Z"
  },
  "toolQuotas": [
    {
      "toolId": "browser",
      "toolName": "Browser",
      "limit": 500,
      "requests": 75,
      "remaining": 425,
      "renewsAt": "2026-02-01T00:00:00Z"
    }
  ]
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

### Models Endpoint (v1)

```
GET https://api.synthetic.new/v1/models
```

#### Response Format

The API returns a JSON object containing an array of available models:

```typescript
{
  "models": [
    {
      "id": string,           // Model identifier
      "name": string,         // Display name
      "description": string,  // Model description
      "pricing": {
        "input": number,      // Input price per token
        "output": number      // Output price per token
      },
      "capabilities": string[],  // Array of capability flags
      "contextWindow": number    // Maximum context window size
    }
  ]
}
```

#### Example Response

```json
{
  "models": [
    {
      "id": "synthetic-beta",
      "name": "Synthetic Beta",
      "description": "Latest Synthetic model with enhanced reasoning capabilities",
      "pricing": {
        "input": 0.001,
        "output": 0.002
      },
      "capabilities": ["streaming", "function-calling", "json-mode"],
      "contextWindow": 128000
    }
  ]
}
```

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
  toolQuotas?: ToolQuota[];  // Tool-specific quota information
}

interface ToolQuota {
  toolId: string;            // Tool identifier (e.g., "browser")
  toolName: string;          // Display name (e.g., "Browser")
  limit: number;             // Tool-specific request limit
  requests: number;          // Tool-specific requests used
  remaining: number;         // Tool-specific requests remaining
  renewsAt: string;          // ISO 8601 date string
}
```

#### `Model`

Model information from the v1 models endpoint:

```typescript
interface Model {
  id: string;                // Model identifier (e.g., "synthetic-beta")
  name: string;              // Display name (e.g., "Synthetic Beta")
  description?: string;      // Model description
  pricing?: {
    input: number;           // Input price per token
    output: number;          // Output price per token
  };
  capabilities?: string[];   // Supported features (e.g., "streaming", "function-calling")
  contextWindow?: number;    // Maximum context length in tokens
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

### API Key Manager API

#### `ApiKeyProfile`

Interface representing an API key profile:

```typescript
interface ApiKeyProfile {
  id: string;              // Unique identifier for the profile
  key: string;             // Full API key
  label: string;           // User-defined label for the profile
  isActive: boolean;       // Whether this profile is currently active
}
```

#### `ApiKeyManager`

Multi-profile API key management class:

```typescript
class ApiKeyManager {
  constructor(context: vscode.ExtensionContext);
  getProfiles(): Promise<ApiKeyProfile[]>;
  addProfile(key: string, label?: string): Promise<void>;
  deleteProfile(id: string): Promise<void>;
  setActiveProfile(id: string): Promise<void>;
  getActiveProfile(): Promise<ApiKeyProfile | undefined>;
  cycleProfiles(): Promise<ApiKeyProfile | undefined>;
  onProfilesChanged(callback: () => void): void;
  watchSharedStateChanges(pollInterval?: number): vscode.Disposable;
  dispose(): void;
  static getDisplayKey(key: string): string;
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

### Popup Panel API

#### `TabType`

Type representing available tabs in the popup panel:

```typescript
type TabType = "usage" | "models";
```

#### `PopupPanel`

Multi-pane popup interface for displaying usage and model data:

```typescript
class PopupPanel {
  static createOrShow(context: vscode.ExtensionContext): PopupPanel;
  onTabSwitch(callback: (tab: TabType) => void): void;
  updateUsage(usage: UsageInfo): void;
  updateModels(models: ModelInfo[]): void;
  hide(): void;
  dispose(): void;
}
```

### API Key Manager Panel API

#### `WebviewMessage`

Discriminated union type for webview messages:

```typescript
type WebviewMessage =
  | { type: "addProfile"; key: string; label?: string }
  | { type: "deleteProfile"; id: string }
  | { type: "setActiveProfile"; id: string }
  | { type: "cycleProfiles" }
  | { type: "switchTab"; tab: TabType }
  | { type: "switchViewMode"; mode: "tabs" | "split" }
  | { type: "refresh" };
```

#### `ApiKeyManagerPanel`

API key management UI panel:

```typescript
class ApiKeyManagerPanel {
  static createOrShow(context: vscode.ExtensionContext, apiKeyManager: ApiKeyManager): ApiKeyManagerPanel;
  dispose(): void;
}
```

### Extension Commands

The extension provides the following commands:

| Command ID | Description |
|------------|-------------|
| `syntheticUsageTracker.refresh` | Manually refresh usage data |
| `syntheticUsageTracker.refreshModels` | Manually refresh model data |
| `syntheticUsageTracker.configure` | Configure API key |
| `syntheticUsageTracker.manageApiKeys` | Open API key manager panel |
| `syntheticUsageTracker.addApiKey` | Add a new API key profile |
| `syntheticUsageTracker.deleteApiKey` | Delete an API key profile |
| `syntheticUsageTracker.cycleApiKey` | Cycle to the next API key profile |
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
