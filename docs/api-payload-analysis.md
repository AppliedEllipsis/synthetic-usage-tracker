# Synthetic.new API Payload Analysis

**Date**: 2026-01-30  
**Purpose**: Examine the actual usage payload structure from Synthetic.new API endpoints to understand how the updated usage endpoint works with tools, search, and other usage categories.

## Executive Summary

This document presents findings from testing the Synthetic.new API endpoints to discover the actual payload structures. The testing revealed that the current API implementation does **not** include the new payload structures for tools, search, and other usage categories that were expected based on user reports.

**Key Finding**: The `/quotas` endpoint currently returns an empty object `{}` with HTTP 200 OK, and no alternative endpoints were found that provide usage breakdown by type (tools, search, chat, etc.).

## Test Environment

- **API Key**: Test API key retrieved from `.env` file (masked for security)
- **API Base URL**: `https://api.synthetic.new/v2`
- **Test Date**: 2026-01-30
- **Node.js Version**: Native fetch API used (Node.js 18+)

## Tested Endpoints

### 1. `/quotas` Endpoint

**URL**: `https://api.synthetic.new/v2/quotas`  
**Method**: `GET`  
**Authentication**: Bearer token

**Response**:
```json
{
  "status": 200,
  "data": {}
}
```

**Analysis**:
- The endpoint returns HTTP 200 OK, indicating successful authentication
- The response body is an empty object `{}`
- No usage data, tools, search, or other categories are present
- This suggests either:
  - The test API key does not have an active subscription
  - The endpoint structure has changed
  - The new payload structures mentioned by the user are not yet implemented

**Expected Structure (from current code)**:
```typescript
interface QuotaResponse {
  subscription?: {
    limit: number;
    requests: number;
    renewsAt: string;
  };
}
```

**Discrepancy**: The actual response does not match the expected structure. The current extension code in [`src/api/syntheticService.ts`](../src/api/syntheticService.ts) already handles this case by throwing a `NoSubscription` error when the response is empty.

### 2. `/usage` Endpoint

**URL**: `https://api.synthetic.new/v2/usage`  
**Method**: `GET`  
**Authentication**: Bearer token

**Response**:
```json
{
  "status": 404,
  "error": "API route not found: '/v2/usage'. (HINT: Is the URL spelled correctly?)"
}
```

**Analysis**:
- Endpoint does not exist (404 Not Found)
- No alternative usage endpoint found at this path

### 3. `/subscription` Endpoint

**URL**: `https://api.synthetic.new/v2/subscription`  
**Method**: `GET`  
**Authentication**: Bearer token

**Response**:
```json
{
  "status": 404,
  "error": "API route not found: '/v2/subscription'. (HINT: Is the URL spelled correctly?)"
}
```

**Analysis**:
- Endpoint does not exist (404 Not Found)

### 4. `/account` Endpoint

**URL**: `https://api.synthetic.new/v2/account`  
**Method**: `GET`  
**Authentication**: Bearer token

**Response**:
```json
{
  "status": 404,
  "error": "API route not found: '/v2/account'. (HINT: Is the URL spelled correctly?)"
}
```

**Analysis**:
- Endpoint does not exist (404 Not Found)

### 5. `/me` Endpoint

**URL**: `https://api.synthetic.new/v2/me`  
**Method**: `GET`  
**Authentication**: Bearer token

**Response**:
```json
{
  "status": 404,
  "error": "API route not found: '/v2/me'. (HINT: Is the URL spelled correctly?)"
}
```

**Analysis**:
- Endpoint does not exist (404 Not Found)

### 6. `/v1/quotas` Endpoint

**URL**: `https://api.synthetic.new/v1/quotas`  
**Method**: `GET`  
**Authentication**: Bearer token

**Response**:
```json
{
  "status": 404,
  "error": "API route not found: '/v1/quotas'. (HINT: Is the URL spelled correctly?)"
}
```

**Analysis**:
- V1 API endpoint does not exist
- Only V2 API is available

### 7. `/quotas/tools` Endpoint

**URL**: `https://api.synthetic.new/v2/quotas/tools`  
**Method**: `GET`  
**Authentication**: Bearer token

**Response**:
```json
{
  "status": 404,
  "error": "API route not found: '/v2/quotas/tools'. (HINT: Is the URL spelled correctly?)"
}
```

**Analysis**:
- Hypothetical tools-specific endpoint does not exist
- No evidence of usage breakdown by tool type

### 8. `/quotas/search` Endpoint

**URL**: `https://api.synthetic.new/v2/quotas/search`  
**Method**: `GET`  
**Authentication**: Bearer token

**Response**:
```json
{
  "status": 404,
  "error": "API route not found: '/v2/quotas/search'. (HINT: Is the URL spelled correctly?)"
}
```

**Analysis**:
- Hypothetical search-specific endpoint does not exist
- No evidence of usage breakdown by search type

### 9. Root Endpoint `/v2`

**URL**: `https://api.synthetic.new/v2`  
**Method**: `GET`  
**Authentication**: Bearer token

**Response**:
```json
{
  "status": 404,
  "error": "API route not found: '/v2'. (HINT: Is the URL spelled correctly?)"
}
```

**Analysis**:
- Root endpoint does not provide API documentation or available endpoints
- No way to discover available endpoints programmatically

### 10. `/v2/openai/v1/models` Endpoint

**URL**: `https://api.synthetic.new/v2/openai/v1/models`  
**Method**: `GET`  
**Authentication**: Bearer token

**Response**:
```json
{
  "status": 404,
  "error": "API route not found: '/v2/openai/v1/models'. (HINT: Is the URL spelled correctly?)"
}
```

**Analysis**:
- OpenAI-compatible endpoints are not available at the `/v2/openai/v1/` path
- Suggests these endpoints may not exist or are at a different path

### 11. `/v2/openai/v1/chat/completions` Endpoint

**URL**: `https://api.synthetic.new/v2/openai/v1/chat/completions`  
**Method**: `POST`  
**Authentication**: Bearer token

**Response**:
```json
{
  "status": 404,
  "error": "API route not found: '/v2/openai/v1/chat/completions'. (HINT: Is the URL spelled correctly?)"
}
```

**Analysis**:
- OpenAI-compatible chat completions endpoint not available at this path
- No evidence of chat-specific usage tracking

## Test Results Summary

| Endpoint | Status | Result |
|----------|--------|--------|
| `/v2/quotas` | 200 OK | Empty object `{}` |
| `/v2/usage` | 404 Not Found | Route does not exist |
| `/v2/subscription` | 404 Not Found | Route does not exist |
| `/v2/account` | 404 Not Found | Route does not exist |
| `/v2/me` | 404 Not Found | Route does not exist |
| `/v1/quotas` | 404 Not Found | V1 API not available |
| `/v2/quotas/tools` | 404 Not Found | Tools endpoint does not exist |
| `/v2/quotas/search` | 404 Not Found | Search endpoint does not exist |
| `/v2` (root) | 404 Not Found | No API documentation |
| `/v2/openai/v1/models` | 404 Not Found | OpenAI endpoints not at this path |
| `/v2/openai/v1/chat/completions` | 404 Not Found | OpenAI endpoints not at this path |

## Findings and Analysis

### Missing Payload Structures

**Expected**: According to user reports, the usage endpoint was updated to include payloads for:
- Tools usage
- Search usage
- Chat usage
- Other usage types

**Actual**: None of these payload structures were found in the API responses. The only working endpoint (`/quotas`) returns an empty object.

### Possible Explanations

1. **API Key Issue**: The test API key may not have an active subscription, resulting in an empty response from the `/quotas` endpoint. This is the most likely explanation given that:
   - Authentication succeeds (200 OK)
   - The response is valid JSON (empty object)
   - The current extension code already handles this case with a `NoSubscription` error

2. **API Not Yet Updated**: The new payload structures mentioned by the user may not have been deployed to production yet.

3. **Different Endpoint Structure**: The new payload structures may be available at a different endpoint or require additional parameters/query strings that were not tested.

4. **Beta/Feature Flag**: The new usage breakdown features may be behind a feature flag or in beta testing, not available to all API keys.

5. **Documentation Outdated**: The user's information about updated usage endpoints may have been based on pre-release documentation or internal announcements that haven't been implemented yet.

### Current Extension Behavior

The current extension code in [`src/api/syntheticService.ts`](../src/api/syntheticService.ts) handles the empty response appropriately:

```typescript
private parseQuotaResponse(data: QuotaResponse): UsageInfo {
  if (!data.subscription) {
    throw new ApiError(
      ApiErrorType.NoSubscription,
      "No subscription data detected. Please check your Synthetic.new account."
    );
  }
  // ... rest of parsing logic
}
```

This error handling is correct for the current API behavior.

## Recommendations

### Immediate Actions

1. **Verify API Key Status**: Check if the test API key has an active subscription on the Synthetic.new platform. This would explain the empty response.

2. **Contact Synthetic.new Support**: Reach out to Synthetic.new support to:
   - Confirm the status of the test API key
   - Verify if the new usage payload structures have been deployed
   - Get documentation on the updated API endpoints

3. **Test with Production API Key**: If available, test with a production API key that has known active usage to see if the payload structure differs.

### Future Considerations

1. **Monitor API Changes**: Periodically re-test the endpoints to check if new payload structures are deployed.

2. **Flexible Data Parsing**: Consider updating the extension to handle multiple possible response formats, including:
   - Current format: `{ subscription: { limit, requests, renewsAt } }`
   - Potential new format with breakdown by type
   - Empty responses (already handled)

3. **Error Messages**: Improve error messages to help users understand when they need to check their subscription status:

```typescript
"No subscription data detected. Please check your Synthetic.new account."
```

Could be enhanced to:
```typescript
"No subscription data detected. This may mean your API key doesn't have an active subscription or the API is temporarily unavailable. Please check your Synthetic.new account or contact support."
```

4. **API Documentation**: Request updated API documentation from Synthetic.new that includes:
   - All available endpoints
   - Request/response formats
   - Example payloads
   - Error conditions

## Conclusion

The API testing revealed that the current Synthetic.new API (`v2`) does not provide the new usage payload structures for tools, search, and other usage categories that were expected. The only working endpoint (`/quotas`) returns an empty object, most likely due to the test API key not having an active subscription.

No alternative endpoints were found that provide usage breakdown by type. All tested alternative endpoints returned 404 Not Found errors.

**Key Takeaway**: The extension's current implementation is appropriate for the actual API behavior. The empty response is correctly handled with a `NoSubscription` error. If and when new payload structures are deployed, the extension will need to be updated to parse and display the additional usage categories.

## Appendix: Test Scripts

### Test Script 1: Initial Endpoint Tests

File: `test-api-endpoints.js` (temporary, to be deleted)

Tested:
- `/quotas` endpoint
- `/openai/v1/models` endpoint
- `/openai/v1/chat/completions` endpoint

### Test Script 2: Alternative Endpoint Tests

File: `test-api-alternatives.js` (temporary, to be deleted)

Tested:
- `/quotas` (retest)
- `/usage`
- `/subscription`
- `/account`
- `/me`
- `/v1/quotas`
- `/quotas/tools`
- `/quotas/search`
- Root endpoint

## Related Files

- [`src/api/syntheticService.ts`](../src/api/syntheticService.ts) - Current API service implementation
- [`package.json`](../package.json) - Extension manifest and configuration
- [`.env`](../.env) - Test API key (not in repository)

---

**Note**: This analysis is based on testing performed on 2026-01-30. API behavior may change. Periodic re-testing is recommended to stay current with API updates.
