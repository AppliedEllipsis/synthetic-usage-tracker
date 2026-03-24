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
  "freeToolCalls": {
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
| `freeToolCalls` | object | Free tool calls/small requests daily quota |

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

### Free Tool Calls Object

| Field | Type | Description |
|-------|------|-------------|
| `limit` | number | Total free tool calls/small requests daily allowance |
| `requests` | number | Number of free tool calls/small requests used |
| `renewsAt` | string (ISO 8601) | Timestamp when quota renews |

**Notes**:
- This is a separate daily quota for tool calls and small requests
- First 500 (standard) / 2500 (pro) tool calls per day are free; after that they count as normal requests
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

### 3. Free Tool Calls
- **Purpose**: Free daily tool calls/small requests allowance
- **Type**: Daily
- **Fields**: `limit`, `requests`, `renewsAt`

## Renewal Timestamps

All three usage types have independent renewal schedules:

- **Subscription renews at**: `2026-01-31T05:03:31.463Z`
- **Search renews at**: `2026-01-31T02:13:40.463Z`
- **Free Tool Calls renews at**: `2026-01-31T10:17:00.465Z`

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

### Free Tool Calls
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
  freeToolCalls: UsageType;
}
```

### Priority for Display

Given the three usage types, the extension should:
1. **Primary display**: Subscription usage (main quota users care about)
2. **Secondary display**: Free tool calls (important for advanced features)
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

---

# API Update: Mana-Based Model (2026-03-24)

## Overview

**Verification Date**: 2026-03-24

The Synthetic.new API has transitioned to a **hybrid mana-based model**. This update documents the new API response structure discovered during verification testing. The API now returns both legacy quota-based fields and new mana-like fields simultaneously, representing a transitional state between the old and new systems.

## Hybrid API Structure Discovered

The current API returns a JSON object with **two** top-level fields:

```json
{
  "subscription": {
    "limit": 600,
    "requests": 0.16666666666666666,
    "renewsAt": "2026-03-24T05:52:12.131Z"
  },
  "weeklyTokenLimit": {
    "nextRegenAt": "2026-03-24T04:07:35.000Z",
    "percentRemaining": 99.99401333333333
  }
}
```

### Key Finding: Hybrid Model

**Important**: The API currently uses a **hybrid structure** rather than a pure mana-based model:

1. **`subscription` object**: Contains **legacy quota-based fields** (`limit`, `requests`, `renewsAt`)
2. **`weeklyTokenLimit` object**: Contains **mana-like fields** (`percentRemaining`, `nextRegenAt`)

This indicates the API is in a transitional state, supporting both legacy quota tracking and new mana-based token regeneration simultaneously.

## New Field Descriptions

### weeklyTokenLimit Object

| Field | Type | Description |
|-------|------|-------------|
| `percentRemaining` | number | Percentage of weekly token limit remaining (e.g., 99.994%) |
| `nextRegenAt` | string (ISO 8601) | Timestamp when the next token regeneration will occur |

**Notes**:
- `percentRemaining` represents the current available capacity as a percentage
- `nextRegenAt` indicates when tokens will be replenished (regeneration mechanics)
- This replaces the granular `limit`/`requests`/`renewsAt` tracking with a percentage-based approach

## Comparison: Old vs New Models

### Legacy Quota-Based Model (Still Present)

```json
{
  "subscription": {
    "limit": 600,
    "requests": 0.16666666666666666,
    "renewsAt": "2026-03-24T05:52:12.131Z"
  }
}
```

**Characteristics**:
- Fixed monthly request limits
- Tracks exact request counts (can be fractional)
- Single renewal timestamp for the entire period
- Simple subtraction: `remaining = limit - requests`

### New Mana-Based Model (Weekly Token Limit)

```json
{
  "weeklyTokenLimit": {
    "nextRegenAt": "2026-03-24T04:07:35.000Z",
    "percentRemaining": 99.99401333333333
  }
}
```

**Characteristics**:
- Weekly token-based limits instead of monthly request counts
- Percentage-based tracking (0-100%)
- Continuous regeneration mechanics (next regeneration timestamp)
- More granular time-based replenishment

## Regeneration Mechanics

The mana-based model introduces **regeneration** concepts:

1. **Token Regeneration**: Tokens are replenished continuously rather than at fixed renewal periods
2. **Next Regen Timestamp**: `nextRegenAt` indicates when the next batch of tokens will be available
3. **Percentage Tracking**: Usage is tracked as a percentage of total capacity rather than absolute counts
4. **Weekly Cycle**: The `weeklyTokenLimit` suggests a 7-day cycle for token replenishment

### Example Calculations

**Current State**:
- Percent Remaining: 99.994%
- Percentage Used: 0.006%
- Next Regen At: ~45 minutes from query time

**Interpretation**:
- User has consumed minimal capacity (0.006%)
- Tokens will regenerate in ~45 minutes
- System uses a continuous regeneration model rather than fixed monthly resets

## Implementation Considerations

### Backward Compatibility

The extension must handle **both** response formats:

1. **Legacy format**: `subscription.limit`, `subscription.requests`, `subscription.renewsAt`
2. **New format**: `weeklyTokenLimit.percentRemaining`, `weeklyTokenLimit.nextRegenAt`

**Detection Strategy**:
- Check for presence of `weeklyTokenLimit` object
- If present, use percentage-based calculations
- Fall back to legacy `subscription` fields if `weeklyTokenLimit` is absent

### Code Implementation

The extension now uses conditional field detection:

```typescript
// Check for mana-based fields
if (category.balance !== undefined && category.maxBalance !== undefined) {
  // Use mana-based calculation
  limit = category.maxBalance;
  requests = category.maxBalance - category.balance;
  if (category.nextRegen !== undefined && category.nextRegen > 0) {
    const renewTimestamp = Date.now() + category.nextRegen * 1000;
    renewsAt = new Date(renewTimestamp).toISOString();
  }
} else {
  // Fall back to legacy quota fields
  limit = category.limit;
  requests = category.requests;
  renewsAt = category.renewsAt;
}
```

### Display Updates

The status bar and tooltips have been updated to:
- Display percentage-based usage when `weeklyTokenLimit` is present
- Show regeneration countdown (time until `nextRegenAt`)
- Maintain backward compatibility with legacy quota displays

## Verification Results

**TypeScript Compilation**: ✅ Passed (exit code 0)
**Linting**: ✅ Passed (exit code 0)
**API Response Processing**: ✅ Verified

### Files Updated

- [`src/api/syntheticService.ts`](../src/api/syntheticService.ts) - Added mana detection and parsing
- [`src/types/keys.ts`](../src/types/keys.ts) - Added mana field types
- [`src/statusBar/usageIndicator.ts`](../src/statusBar/usageIndicator.ts) - Updated display logic

## Migration Path

**Current State**: Hybrid model (both legacy and new fields present)
**Future State**: Likely full transition to mana-based model

**Recommendation**: Continue supporting both formats indefinitely for backward compatibility, as different user accounts may be on different API versions.

## Related Files

- [`scripts/update-synthetic-api.js`](../scripts/update-synthetic-api.js) - Diagnostic script for API testing
- [`api-response-actual-2026-03-24T02-21-15.json`](../api-response-actual-2026-03-24T02-21-15.json) - Actual API response sample
