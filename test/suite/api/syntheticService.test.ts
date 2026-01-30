import assert from "node:assert";
import { suite, test } from "mocha";
import { SyntheticService, ApiError, ApiErrorType } from "../../../src/api/syntheticService";
import type { UsageInfo, CategoryUsageInfo } from "../../../src/api/syntheticService";

/**
 * Unit tests for SyntheticService
 * Tests the three-category API response parsing (subscription, search, toolCalls)
 */

suite("SyntheticService - parseCategory", () => {
  test("should parse valid category data", () => {
    // Design decision: Use reflection to test private method for comprehensive coverage
    // This allows us to test the parsing logic without making it publicly accessible
    const service = new SyntheticService("syn_test123");
    const category = {
      limit: 1000,
      requests: 500,
      renewAt: "2026-01-30T20:20:59.408Z",
    };

    // Access private method via TypeScript type assertion for testing
    const parseCategory = (service as any).parseCategory.bind(service);
    const result = parseCategory(category);

    assert.strictEqual(result.limit, 1000);
    assert.strictEqual(result.requests, 500);
    assert.strictEqual(result.remaining, 500);
    assert.strictEqual(result.percentageUsed, 50);
    assert.ok(result.renewAt instanceof Date);
  });

  test("should handle category with zero limit", () => {
    const service = new SyntheticService("syn_test123");
    const category = {
      limit: 0,
      requests: 0,
      renewAt: "2026-01-30T20:20:59.408Z",
    };

    const parseCategory = (service as any).parseCategory.bind(service);
    const result = parseCategory(category);

    // Design rationale: When limit is 0, percentageUsed should be 0 to avoid division by zero
    assert.strictEqual(result.limit, 0);
    assert.strictEqual(result.requests, 0);
    assert.strictEqual(result.remaining, 0);
    assert.strictEqual(result.percentageUsed, 0);
  });

  test("should handle category exceeding limit", () => {
    const service = new SyntheticService("syn_test123");
    const category = {
      limit: 100,
      requests: 150,
      renewAt: "2026-01-30T20:20:59.408Z",
    };

    const parseCategory = (service as any).parseCategory.bind(service);
    const result = parseCategory(category);

    // Design rationale: remaining should be clamped to 0, not negative
    assert.strictEqual(result.limit, 100);
    assert.strictEqual(result.requests, 150);
    assert.strictEqual(result.remaining, 0);
    assert.strictEqual(result.percentageUsed, 150);
  });

  test("should handle percentage rounding", () => {
    const service = new SyntheticService("syn_test123");
    const category = {
      limit: 3,
      requests: 1, // 33.333...%
      renewAt: "2026-01-30T20:20:59.408Z",
    };

    const parseCategory = (service as any).parseCategory.bind(service);
    const result = parseCategory(category);

    // Design rationale: Round to 2 decimal places for consistent display
    assert.strictEqual(result.percentageUsed, 33.33);
  });
});

suite("SyntheticService - parseQuotaResponse", () => {
  test("should parse all three categories", async () => {
    // Design decision: Mock global fetch to test API response parsing without network calls
    const mockJson = Promise.resolve({
      subscription: {
        limit: 135,
        requests: 33,
        renewAt: "2026-01-30T20:20:59.408Z",
      },
      search: {
        hourly: {
          limit: 250,
          requests: 0,
          renewAt: "2026-01-30T20:25:50.409Z",
        },
      },
      toolCalls: {
        limit: 1620,
        requests: 271,
        renewAt: "2026-01-31T10:17:00.411Z",
      },
    });

    const mockFetch = Promise.resolve({
      ok: true,
      json: () => mockJson,
    } as Response);

    // @ts-expect-error - Mocking global fetch
    global.fetch = () => mockFetch;

    const service = new SyntheticService("syn_test123");
    const result = await service.fetchQuota();

    // Verify subscription category
    assert.strictEqual(result.subscription.limit, 135);
    assert.strictEqual(result.subscription.requests, 33);
    assert.strictEqual(result.subscription.remaining, 102);
    assert.strictEqual(result.subscription.percentageUsed, 24.44);

    // Verify search category (unwrapped from hourly object)
    assert.strictEqual(result.search.limit, 250);
    assert.strictEqual(result.search.requests, 0);
    assert.strictEqual(result.search.remaining, 250);
    assert.strictEqual(result.search.percentageUsed, 0);

    // Verify toolCalls category
    assert.strictEqual(result.toolCalls.limit, 1620);
    assert.strictEqual(result.toolCalls.requests, 271);
    assert.strictEqual(result.toolCalls.remaining, 1349);
    assert.strictEqual(result.toolCalls.percentageUsed, 16.73);
  });

  test("should handle missing search category", async () => {
    const mockJson = Promise.resolve({
      subscription: {
        limit: 100,
        requests: 50,
        renewAt: "2026-01-30T20:20:59.408Z",
      },
      toolCalls: {
        limit: 1000,
        requests: 200,
        renewAt: "2026-01-31T10:17:00.411Z",
      },
    });

    const mockFetch = Promise.resolve({
      ok: true,
      json: () => mockJson,
    } as Response);

    // @ts-expect-error - Mocking global fetch
    global.fetch = () => mockFetch;

    const service = new SyntheticService("syn_test123");
    const result = await service.fetchQuota();

    assert.strictEqual(result.subscription.limit, 100);
    assert.strictEqual(result.toolCalls.limit, 1000);
    // Search should not be present if missing from response
    assert.strictEqual(result.search, undefined);
  });

  test("should handle missing subscription category", async () => {
    const mockJson = Promise.resolve({
      search: {
        hourly: {
          limit: 250,
          requests: 0,
          renewAt: "2026-01-30T20:25:50.409Z",
        },
      },
      toolCalls: {
        limit: 1620,
        requests: 271,
        renewAt: "2026-01-31T10:17:00.411Z",
      },
    });

    const mockFetch = Promise.resolve({
      ok: true,
      json: () => mockJson,
    } as Response);

    // @ts-expect-error - Mocking global fetch
    global.fetch = () => mockFetch;

    const service = new SyntheticService("syn_test123");
    const result = await service.fetchQuota();

    assert.strictEqual(result.search.limit, 250);
    assert.strictEqual(result.toolCalls.limit, 1620);
    // Subscription should not be present if missing from response
    assert.strictEqual(result.subscription, undefined);
  });
});

suite("SyntheticService - error handling", () => {
  test("should throw ApiError for authentication failures", async () => {
    const mockFetch = Promise.resolve({
      ok: false,
      status: 401,
    } as Response);

    // @ts-expect-error - Mocking global fetch
    global.fetch = () => mockFetch;

    const service = new SyntheticService("syn_invalid");
    let error: ApiError | undefined;

    try {
      await service.fetchQuota();
    } catch (e) {
      error = e as ApiError;
    }

    assert.ok(error instanceof ApiError);
    assert.strictEqual(error?.type, ApiErrorType.Authentication);
    assert.ok(error?.message.includes("Authentication failed"));
  });

  test("should throw ApiError for rate limit errors", async () => {
    const mockFetch = Promise.resolve({
      ok: false,
      status: 429,
    } as Response);

    // @ts-expect-error - Mocking global fetch
    global.fetch = () => mockFetch;

    const service = new SyntheticService("syn_test123");
    let error: ApiError | undefined;

    try {
      await service.fetchQuota();
    } catch (e) {
      error = e as ApiError;
    }

    assert.ok(error instanceof ApiError);
    assert.strictEqual(error?.type, ApiErrorType.RateLimit);
    assert.ok(error?.message.includes("Rate limit"));
  });

  test("should throw ApiError for server errors", async () => {
    const mockFetch = Promise.resolve({
      ok: false,
      status: 500,
    } as Response);

    // @ts-expect-error - Mocking global fetch
    global.fetch = () => mockFetch;

    const service = new SyntheticService("syn_test123");
    let error: ApiError | undefined;

    try {
      await service.fetchQuota();
    } catch (e) {
      error = e as ApiError;
    }

    assert.ok(error instanceof ApiError);
    assert.strictEqual(error?.type, ApiErrorType.Server);
    assert.ok(error?.message.includes("Server error"));
  });

  test("should handle network errors", async () => {
    const mockFetch = Promise.reject(new Error("Network error"));

    // @ts-expect-error - Mocking global fetch
    global.fetch = () => mockFetch;

    const service = new SyntheticService("syn_test123");
    let error: ApiError | undefined;

    try {
      await service.fetchQuota();
    } catch (e) {
      error = e as ApiError;
    }

    assert.ok(error instanceof ApiError);
    assert.strictEqual(error?.type, ApiErrorType.Network);
    assert.ok(error?.message.includes("Network error"));
  });

  test("should handle JSON parse errors", async () => {
    const mockFetch = Promise.resolve({
      ok: true,
      json: () => Promise.reject(new Error("Invalid JSON")),
    } as Response);

    // @ts-expect-error - Mocking global fetch
    global.fetch = () => mockFetch;

    const service = new SyntheticService("syn_test123");
    let error: ApiError | undefined;

    try {
      await service.fetchQuota();
    } catch (e) {
      error = e as ApiError;
    }

    assert.ok(error instanceof ApiError);
    assert.strictEqual(error?.type, ApiErrorType.Network);
  });
});

suite("SyntheticService - validateApiKey", () => {
  test("should validate valid API key format", () => {
    assert.strictEqual(SyntheticService.validateApiKey("syn_123456"), true);
    assert.strictEqual(SyntheticService.validateApiKey("syn_abcdef123456"), true);
    assert.strictEqual(SyntheticService.validateApiKey("syn_test_api_key"), true);
  });

  test("should reject invalid API key format", () => {
    assert.strictEqual(SyntheticService.validateApiKey("api_123456"), false);
    assert.strictEqual(SyntheticService.validateApiKey("123456"), false);
    assert.strictEqual(SyntheticService.validateApiKey(""), false);
    assert.strictEqual(SyntheticService.validateApiKey("syn_"), false); // Too short
  });
});
