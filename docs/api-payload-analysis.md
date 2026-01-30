# API Payload Analysis

This document provides detailed analysis of the Synthetic.new API payloads and their structure.

## Quotas Endpoint (`/v2/quotas`)

### Curl Command Used

```bash
curl -X GET "https://api.synthetic.new/v2/quotas" \
  -H "Authorization: Bearer syn_7e4511d110c48a6ea01f162cf5ad2aa3" \
  -H "Content-Type: application/json" \
  -s
```

### Complete API Response

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
  "toolCalls": {
    "limit": 1620,
    "requests": 271,
    "renewsAt": "2026-01-31T10:17:00.411Z"
  }
}
```

### Structure Analysis

The `/v2/quotas` endpoint returns a **hierarchical structure** with three distinct usage categories:

#### 1. Subscription Category
```typescript
interface SubscriptionQuota {
  limit: number;      // Total subscription requests allowed
  requests: number;   // Requests used in current billing period
  renewsAt: string;   // ISO 8601 timestamp when quota renews
}
```

**Example values:**
- `limit`: 135
- `requests`: 33
- `renewsAt`: "2026-01-30T20:20:59.408Z"

#### 2. Search Category
```typescript
interface SearchQuota {
  hourly: {
    limit: number;      // Hourly search request limit
    requests: number;   // Search requests used in current hour
    renewsAt: string;   // ISO 8601 timestamp when hourly quota renews
  };
}
```

**Example values:**
- `hourly.limit`: 250
- `hourly.requests`: 0
- `hourly.renewsAt`: "2026-01-30T20:25:50.409Z"

**Key characteristic:** The search quota is wrapped in an `hourly` object, indicating it operates on an hourly renewal cycle.

#### 3. Tool Calls Category
```typescript
interface ToolCallsQuota {
  limit: number;      // Total tool calls allowed
  requests: number;   // Tool calls used in current period
  renewsAt: string;   // ISO 8601 timestamp when quota renews
}
```

**Example values:**
- `limit`: 1620
- `requests`: 271
- `renewsAt`: "2026-01-31T10:17:00.411Z"

### Complete Type Definition

```typescript
interface QuotasResponse {
  subscription: {
    limit: number;
    requests: number;
    renewsAt: string;
  };
  search: {
    hourly: {
      limit: number;
      requests: number;
      renewsAt: string;
    };
  };
  toolCalls: {
    limit: number;
    requests: number;
    renewsAt: string;
  };
}
```

### Key Observations

1. **Multiple Categories**: The API returns three separate quota categories, not a single consolidated quota.

2. **Different Renewal Cycles**:
   - `subscription`: Appears to be a monthly or billing-cycle quota
   - `search.hourly`: Explicitly hourly quota
   - `toolCalls`: Appears to be a daily or longer-term quota

3. **Consistent Field Names**: All categories use the same field names (`limit`, `requests`, `renewsAt`) except for `search` which wraps them in an `hourly` object.

4. **ISO 8601 Timestamps**: All `renewAt` fields use ISO 8601 format with UTC timezone (`Z` suffix).

5. **No Calculated Fields**: The API does not provide `remaining` or `percentageUsed` fields. These must be calculated on the client side:
   ```typescript
   remaining = limit - requests
   percentageUsed = (requests / limit) * 100
   ```

### Comparison with Previous Findings

**Previous (incorrect) finding:** The `/v2/quotas` endpoint was thought to return an empty object `{}`.

**Corrected finding:** The endpoint returns a rich, hierarchical structure with three distinct quota categories (subscription, search, toolCalls), each with its own limit, usage, and renewal information.

### Implications for Extension

1. **Multi-Category Display**: The extension should display usage information for all three categories, not just a single quota.

2. **Category Selection**: Users may want to configure which category is displayed in the status bar or see all categories in a detailed view.

3. **Renewal Time Tracking**: Each category has its own renewal time, which should be displayed to users.

4. **Aggregated vs. Per-Category Metrics**: Consider providing both per-category metrics and an overall usage summary.

### Recommendations

1. **Update Type Definitions**: Update `UsageInfo` interface to reflect the hierarchical structure.

2. **Add Category Configuration**: Add configuration options to select which category to display in the status bar.

3. **Enhanced Tooltip**: Show all three categories in the status bar tooltip for comprehensive usage information.

4. **Renewal Time Display**: Include renewal times for each category in the detailed view.

5. **Color Coding**: Consider using different colors or icons to indicate different categories in the UI.

## Testing Date

This analysis was performed on: **2026-01-30**

## Test API Key

The test used the development API key from `.env` file.
