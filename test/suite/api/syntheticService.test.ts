import assert from "node:assert";
import { suite, test } from "mocha";
import { SyntheticService, ApiError, ApiErrorType } from "../../../src/api/syntheticService";
import type { UsageInfo, CategoryUsage } from "../../../src/api/syntheticService";

/**
 * Unit tests for SyntheticService
 * Tests the new category-based API response parsing and backward compatibility
 */

suite("SyntheticService - parseCategories", () => {
  test("should parse valid category data", () => {
    // Design decision: Use reflection to test private method for comprehensive coverage
    // This allows us to test the parsing logic without making it publicly accessible
    const service = new SyntheticService("syn_test123");
    const categories: Record<string, CategoryUsage> = {
      tools: { limit: 1000, used: 500 },
      search: { limit: 500, used: 100 },
      chat: { limit: 2000, used: 1500 },
    };

    // Access private method via TypeScript type assertion for testing
    const parseCategories = (service as any).parseCategories.bind(service);
    const result = parseCategories(categories);

    assert.strictEqual(result.tools.limit, 1000);
    assert.strictEqual(result.tools.used, 500);
    assert.strictEqual(result.tools.remaining, 500);
    assert.strictEqual(result.tools.percentageUsed, 50);

    assert.strictEqual(result.search.limit, 500);
    assert.strictEqual(result.search.used, 100);
    assert.strictEqual(result.search.remaining, 400);
    assert.strictEqual(result.search.percentageUsed, 20);

    assert.strictEqual(result.chat.limit, 2000);
    assert.strictEqual(result.chat.used, 1500);
    assert.strictEqual(result.chat.remaining, 500);
    assert.strictEqual(result.chat.percentageUsed, 75);
  });

  test("should handle category with zero limit", () => {
    const service = new SyntheticService("syn_test123");
    const categories: Record<string, CategoryUsage> = {
      tools: { limit: 0, used: 0 },
    };

    const parseCategories = (service as any).parseCategories.bind(service);
    const result = parseCategories(categories);

    // Design rationale: When limit is 0, percentageUsed should be 0 to avoid division by zero
    assert.strictEqual(result.tools.limit, 0);
    assert.strictEqual(result.tools.used, 0);
    assert.strictEqual(result.tools.remaining, 0);
    assert.strictEqual(result.tools.percentageUsed, 0);
  });

  test("should handle category exceeding limit", () => {
    const service = new SyntheticService("syn_test123");
    const categories: Record<string, CategoryUsage> = {
      tools: { limit: 100, used: 150 },
    };

    const parseCategories = (service as any).parseCategories.bind(service);
    const result = parseCategories(categories);

    // Design rationale: remaining should be clamped to 0, not negative
    assert.strictEqual(result.tools.limit, 100);
    assert.strictEqual(result.tools.used, 150);
    assert.strictEqual(result.tools.remaining, 0);
    assert.strictEqual(result.tools.percentageUsed, 150);
  });

  test("should skip categories with missing limit field", () => {
    const service = new SyntheticService("syn_test123");
    const categories = {
      tools: { limit: 100, used: 50 },
      // @ts-expect-error - Testing invalid data
      invalid: { used: 10 }, // Missing 'limit' field
    };

    const parseCategories = (service as any).parseCategories.bind(service);
    const result = parseCategories(categories);

    // Design decision: Skip invalid categories silently to fail gracefully
    assert.strictEqual("tools" in result, true);
    assert.strictEqual("invalid" in result, false);
    assert.strictEqual(result.tools.limit, 100);
  });

  test("should skip categories with missing used field", () => {
    const service = new SyntheticService("syn_test123");
    const categories = {
      tools: { limit: 100, used: 50 },
      // @ts-expect-error - Testing invalid data
      invalid: { limit: 50 }, // Missing 'used' field
    };

    const parseCategories = (service as any).parseCategories.bind(service);
    const result = parseCategories(categories);

    assert.strictEqual("tools" in result, true);
    assert.strictEqual("invalid" in result, false);
  });

  test("should skip categories with non-numeric limit", () => {
    const service = new SyntheticService("syn_test123");
    const categories = {
      tools: { limit: 100, used: 50 },
      // @ts-expect-error - Testing invalid data
      invalid: { limit: "invalid", used: 10 },
    };

    const parseCategories = (service as any).parseCategories.bind(service);
    const result = parseCategories(categories);

    assert.strictEqual("tools" in result, true);
    assert.strictEqual("invalid" in result, false);
  });

  test("should return empty object for empty categories", () => {
    const service = new SyntheticService("syn_test123");
    const categories: Record<string, CategoryUsage> = {};

    const parseCategories = (service as any).parseCategories.bind(service);
    const result = parseCategories(categories);

    assert.deepStrictEqual(result, {});
  });

  test("should handle percentage rounding", () => {
    const service = new SyntheticService("syn_test123");
    const categories: Record<string, CategoryUsage> = {
      tools: { limit: 3, used: 1 }, // 33.333...%
      search: { limit: 7, used: 2 }, // 28.571...%
    };

    const parseCategories = (service as any).parseCategories.bind(service);
    const result = parseCategories(categories);

    // Design rationale: Round to 2 decimal places for consistent display
    assert.strictEqual(result.tools.percentageUsed, 33.33);
    assert.strictEqual(result.search.percentageUsed, 28.57);
  });
});

suite("SyntheticService - backward compatibility", () => {
  test("should handle response without categories field", async () => {
    // Design decision: Mock global fetch to test API response parsing without network calls
    const mockResponse: UsageInfo = {
      limit: 10000,
      requests: 5000,
      remaining: 5000,
      percentageUsed: 50,
      renewsAt: new Date("2026-02-01T00:00:00Z"),
      categories: undefined,
    };

    const mockJson = Promise.resolve({
      limit: 10000,
      requests: 5000,
      remaining: 5000,
      percentageUsed: 50,
      renewsAt: "2026-02-01T00:00:00Z",
    });

    const mockFetch = Promise.resolve({
      ok: true,
      json: () => mockJson,
    } as Response);

    // @ts-expect-error - Mocking global fetch
    global.fetch = () => mockFetch;

    const service = new SyntheticService("syn_test123");
    const result = await service.fetchQuota();

    assert.strictEqual(result.limit, 10000);
    assert.strictEqual(result.requests, 5000);
    assert.strictEqual(result.remaining, 5000);
    assert.strictEqual(result.percentageUsed, 50);
    assert.strictEqual(result.categories, undefined);
  });

  test("should handle response with categories field", async () => {
    const mockJson = Promise.resolve({
      limit: 10000,
      requests: 5000,
      remaining: 5000,
      percentageUsed: 50,
      renewsAt: "2026-02-01T00:00:00Z",
      categories: {
        tools: { limit: 1000, used: 500 },
        search: { limit: 500, used: 100 },
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

    assert.strictEqual(result.categories?.tools.limit, 1000);
    assert.strictEqual(result.categories?.tools.remaining, 500);
    assert.strictEqual(result.categories?.tools.percentageUsed, 50);

    assert.strictEqual(result.categories?.search.limit, 500);
    assert.strictEqual(result.categories?.search.remaining, 400);
    assert.strictEqual(result.categories?.search.percentageUsed, 20);
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
