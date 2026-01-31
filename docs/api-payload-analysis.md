# Synthetic.new API Payload Analysis

## Overview

This document documents the payload structure returned by the Synthetic.new API usage endpoint (`/v2/quotas`). This analysis was performed during Phase 2 of the Synthetic Usage Tracker project to understand the full payload structure, including new usage types that may not be fully documented.

## API Endpoint

- **URL**: `https://api.synthetic.new/v2/quotas`
- **Method**: `GET`
- **Authentication**: Bearer token (API key)

## Full Payload Structure

The API returns a JSON object with three top-level fields:

```json
{
  "subscription": {
    "limit": 135,
    "requests": 83.1,
    "renewsAt": "2026-01-31T05:03:31.463Z"
  },
  "search": {
    "hourly": {
      "limit": 250,
      "requests": 0,
      "renewsAt": "2026-01-31T02:13:40.463Z"
    }
  },
  "toolCallDiscounts": {
    "limit": 1620,
    "requests": 382,
    "renewsAt": "2026-01-31T10:17:00.465Z"
  }
}
```

## Field Descriptions

### Top-Level Fields

| Field | Type | Description |
|-------|------|-------------|
| `subscription` | object | Main subscription usage quota |
| `search` | object | Search-related usage quota |
| `toolCallDiscounts` | object | Tool call discounts quota |

### Subscription Object

| Field | Type | Description |
|-------|------|-------------|
| `limit` | number | Total monthly request limit |
| `requests` | number | Number of requests used (can be decimal) |
| `renewsAt` | string (ISO 8601) | Timestamp when quota renews |

**Notes**:
- The `requests` field can be a decimal value (e.g., 83.1), suggesting fractional request accounting
- This is the primary quota that users typically monitor

### Search Object

| Field | Type | Description |
|-------|------|-------------|
| `hourly` | object | Hourly search usage quota |

#### Hourly Search Object

| Field | Type | Description |
|-------|------|-------------|
| `limit` | number | Total hourly search request limit |
| `requests` | number | Number of search requests used |
| `renewsAt` | string (ISO 8601) | Timestamp when hourly quota renews |

**Notes**:
- Search quota is tracked separately on an hourly basis
- This is currently at 0 requests used in the test account
- The nested structure suggests future support for other time periods (daily, weekly, etc.)

### Tool Call Discounts Object

| Field | Type | Description |
|-------|------|-------------|
| `limit` | number | Total tool call discounts limit |
| `requests` | number | Number of tool call discounts used |
| `renewsAt` | string (ISO 8601) | Timestamp when quota renews |

**Notes**:
- This appears to be a separate quota for tool call functionality
- The name "discounts" suggests this may represent discounted request counts
- Currently showing 382 used out of 1620 (23.6%)

## New Usage Types Identified

The payload structure reveals three distinct usage types that were not fully documented in the initial API documentation:

### 1. Subscription Usage
- **Purpose**: Main API request quota
- **Type**: Monthly
- **Fields**: `limit`, `requests`, `renewsAt`

### 2. Search Usage
- **Purpose**: Search-specific request quota
- **Type**: Hourly
- **Fields**: `limit`, `requests`, `renewsAt`
- **Structure**: Nested under `search.hourly`

### 3. Tool Call Discounts
- **Purpose**: Tool call functionality quota
- **Type**: Unknown (appears to be periodic)
- **Fields**: `limit`, `requests`, `renewsAt`

## Renewal Timestamps

All three usage types have independent renewal schedules:

- **Subscription renews at**: `2026-01-31T05:03:31.463Z`
- **Search renews at**: `2026-01-31T02:13:40.463Z`
- **Tool Call Discounts renews at**: `2026-01-31T10:17:00.465Z`

**Design Implication**: Each usage type can have different renewal periods and schedules. The extension should track each independently and calculate time-to-renewal for each.

## Calculated Fields

The API does not return `remaining` or `percentageUsed` fields. These must be calculated client-side:

```typescript
// Calculate remaining quota
remaining = limit - requests;

// Calculate percentage used
percentageUsed = (requests / limit) * 100;
```

## Example Calculations

### Subscription
- Limit: 135
- Requests: 83.1
- Remaining: 51.9
- Percentage used: 61.6%

### Search (Hourly)
- Limit: 250
- Requests: 0
- Remaining: 250
- Percentage used: 0%

### Tool Call Discounts
- Limit: 1620
- Requests: 382
- Remaining: 1238
- Percentage used: 23.6%

## Implementation Considerations

### Data Structure for Extension

The extension should support a structure like this to handle all usage types:

```typescript
interface UsageType {
  limit: number;
  requests: number;
  remaining: number;
  percentageUsed: number;
  renewsAt: Date;
  timeToRenewal: string; // Human-readable (e.g., "5h 23m")
}

interface QuotaResponse {
  subscription: UsageType;
  search: {
    hourly: UsageType;
  };
  toolCallDiscounts: UsageType;
}
```

### Priority for Display

Given the three usage types, the extension should:
1. **Primary display**: Subscription usage (main quota users care about)
2. **Secondary display**: Tool call discounts (important for advanced features)
3. **Tertiary display**: Search usage (currently appears to be separate feature)

### Time-to-Renewal Calculation

Each usage type needs its own time-to-renewal calculation:

```typescript
function getTimeToRenewal(renewsAt: string): string {
  const renewal = new Date(renewsAt);
  const now = new Date();
  const diffMs = renewal.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return "Renewing soon";
  }
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  
  return `${hours}h ${minutes}m`;
}
```

## Related Documentation

- [`docs/api.md`](api.md) - General API documentation
- [`docs/MEMORY.md`](MEMORY.md) - Memory system and project tracking
- [`src/api/syntheticService.ts`](../src/api/syntheticService.ts) - API service implementation

## Date of Analysis

2026-01-31

## Test API Key Note

This analysis was performed using a test API key ([API_KEY]). The actual values (limits, requests, renewal times) will vary for different accounts and subscription levels.
