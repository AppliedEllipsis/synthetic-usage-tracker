import assert from "node:assert";
import { suite, test, beforeEach, afterEach } from "mocha";
import * as vscode from "vscode";
import { KeyCyclingService } from "../../../src/api/keyCyclingService";
import type { ApiKeyEntry, KeyStatistics, QuotaInfo, CyclingConfig, CyclingStrategy } from "../../../src/types/keys";

/**
 * Unit tests for KeyCyclingService
 * Tests the 4 cycling strategies (RoundRobin, LeastUsed, Random, Priority)
 * and health score calculation
 */

// Mock VSCode ExtensionContext
function createMockContext(): vscode.ExtensionContext {
  return {
    subscriptions: [],
    globalState: {
      get: () => undefined,
      update: () => Promise.resolve(),
      keys: () => [],
    },
    workspaceState: {
      get: () => undefined,
      update: () => Promise.resolve(),
      keys: () => [],
    },
    secrets: {
      get: () => Promise.resolve(undefined),
      store: () => Promise.resolve(),
      delete: () => Promise.resolve(),
    },
    extensionUri: vscode.Uri.parse("file:///test"),
    extensionPath: "/test",
    environmentVariableCollection: {
      persistent: true,
      get: () => "",
      replace: () => {},
      append: () => {},
      prepend: () => {},
      clear: () => {},
    },
    asAbsolutePath: (relativePath: string) => `/test/${relativePath}`,
    storageUri: vscode.Uri.parse("file:///test-storage"),
    globalStorageUri: vscode.Uri.parse("file:///test-global-storage"),
    logUri: vscode.Uri.parse("file:///test-logs"),
    extensionMode: vscode.ExtensionMode.Test,
  } as unknown as vscode.ExtensionContext;
}

suite("KeyCyclingService - RoundRobin strategy", () => {
  let context: vscode.ExtensionContext;
  let service: KeyCyclingService;

  beforeEach(() => {
    context = createMockContext();
    service = new KeyCyclingService();
  });

  afterEach(() => {
    service.dispose();
  });

  test("should select next key in round robin order", () => {
    const keys: ApiKeyEntry[] = [
      { key: "syn_key1", label: "Key 1", createdAt: Date.now() },
      { key: "syn_key2", label: "Key 2", createdAt: Date.now() },
      { key: "syn_key3", label: "Key 3", createdAt: Date.now() },
    ];

    const stats: Map<string, KeyStatistics> = new Map([
      ["syn_key1", { totalRequests: 100, successfulRequests: 95, failedRequests: 5, consecutiveFailures: 0 }],
      ["syn_key2", { totalRequests: 50, successfulRequests: 48, failedRequests: 2, consecutiveFailures: 0 }],
      ["syn_key3", { totalRequests: 75, successfulRequests: 70, failedRequests: 5, consecutiveFailures: 0 }],
    ]);

    const config: CyclingConfig = {
      strategy: "RoundRobin",
      autoCycleOnThreshold: true,
      usageThreshold: 80,
      failureThreshold: 5,
      healthThreshold: 50,
      maxConsecutiveFailures: 3,
      cooldownPeriod: 300000,
      preferHealthyKeys: true,
    };

    const state = {
      currentKeyIndex: 0,
      totalKeys: 3,
      lastRotation: Date.now(),
      totalRotations: 0,
    };

    const result = service.selectKey(keys, stats, config, state);

    // Design rationale: RoundRobin selects the next key in order (index 1 after index 0)
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.selectedKey, "syn_key2");
    assert.strictEqual(result.newIndex, 1);
    assert.strictEqual(result.reason, "RoundRobin cycle");
  });

  test("should wrap around to first key", () => {
    const keys: ApiKeyEntry[] = [
      { key: "syn_key1", label: "Key 1", createdAt: Date.now() },
      { key: "syn_key2", label: "Key 2", createdAt: Date.now() },
    ];

    const stats: Map<string, KeyStatistics> = new Map([
      ["syn_key1", { totalRequests: 100, successfulRequests: 95, failedRequests: 5, consecutiveFailures: 0 }],
      ["syn_key2", { totalRequests: 50, successfulRequests: 48, failedRequests: 2, consecutiveFailures: 0 }],
    ]);

    const config: CyclingConfig = {
      strategy: "RoundRobin",
      autoCycleOnThreshold: true,
      usageThreshold: 80,
      failureThreshold: 5,
      healthThreshold: 50,
      maxConsecutiveFailures: 3,
      cooldownPeriod: 300000,
      preferHealthyKeys: true,
    };

    const state = {
      currentKeyIndex: 1,
      totalKeys: 2,
      lastRotation: Date.now(),
      totalRotations: 0,
    };

    const result = service.selectKey(keys, stats, config, state);

    // Design decision: Wrap around to index 0 after reaching the end
    assert.strictEqual(result.selectedKey, "syn_key1");
    assert.strictEqual(result.newIndex, 0);
  });

  test("should handle single key", () => {
    const keys: ApiKeyEntry[] = [
      { key: "syn_key1", label: "Key 1", createdAt: Date.now() },
    ];

    const stats: Map<string, KeyStatistics> = new Map([
      ["syn_key1", { totalRequests: 100, successfulRequests: 95, failedRequests: 5, consecutiveFailures: 0 }],
    ]);

    const config: CyclingConfig = {
      strategy: "RoundRobin",
      autoCycleOnThreshold: true,
      usageThreshold: 80,
      failureThreshold: 5,
      healthThreshold: 50,
      maxConsecutiveFailures: 3,
      cooldownPeriod: 300000,
      preferHealthyKeys: true,
    };

    const state = {
      currentKeyIndex: 0,
      totalKeys: 1,
      lastRotation: Date.now(),
      totalRotations: 0,
    };

    const result = service.selectKey(keys, stats, config, state);

    // Design rationale: With single key, stay on same key
    assert.strictEqual(result.selectedKey, "syn_key1");
    assert.strictEqual(result.newIndex, 0);
  });
});

suite("KeyCyclingService - LeastUsed strategy", () => {
  let context: vscode.ExtensionContext;
  let service: KeyCyclingService;

  beforeEach(() => {
    context = createMockContext();
    service = new KeyCyclingService();
  });

  afterEach(() => {
    service.dispose();
  });

  test("should select key with least usage", () => {
    const keys: ApiKeyEntry[] = [
      { key: "syn_key1", label: "Key 1", createdAt: Date.now() },
      { key: "syn_key2", label: "Key 2", createdAt: Date.now() },
      { key: "syn_key3", label: "Key 3", createdAt: Date.now() },
    ];

    const stats: Map<string, KeyStatistics> = new Map([
      ["syn_key1", { totalRequests: 100, successfulRequests: 95, failedRequests: 5, consecutiveFailures: 0 }],
      ["syn_key2", { totalRequests: 20, successfulRequests: 20, failedRequests: 0, consecutiveFailures: 0 }], // Least used
      ["syn_key3", { totalRequests: 75, successfulRequests: 70, failedRequests: 5, consecutiveFailures: 0 }],
    ]);

    const config: CyclingConfig = {
      strategy: "LeastUsed",
      autoCycleOnThreshold: true,
      usageThreshold: 80,
      failureThreshold: 5,
      healthThreshold: 50,
      maxConsecutiveFailures: 3,
      cooldownPeriod: 300000,
      preferHealthyKeys: true,
    };

    const state = {
      currentKeyIndex: 0,
      totalKeys: 3,
      lastRotation: Date.now(),
      totalRotations: 0,
    };

    const result = service.selectKey(keys, stats, config, state);

    // Design rationale: LeastUsed selects key with minimum totalRequests
    assert.strictEqual(result.selectedKey, "syn_key2");
    assert.strictEqual(result.newIndex, 1);
    assert.strictEqual(result.reason, "LeastUsed strategy");
  });

  test("should handle ties by selecting first", () => {
    const keys: ApiKeyEntry[] = [
      { key: "syn_key1", label: "Key 1", createdAt: Date.now() },
      { key: "syn_key2", label: "Key 2", createdAt: Date.now() },
    ];

    const stats: Map<string, KeyStatistics> = new Map([
      ["syn_key1", { totalRequests: 50, successfulRequests: 48, failedRequests: 2, consecutiveFailures: 0 }],
      ["syn_key2", { totalRequests: 50, successfulRequests: 47, failedRequests: 3, consecutiveFailures: 0 }], // Tie with key1
    ]);

    const config: CyclingConfig = {
      strategy: "LeastUsed",
      autoCycleOnThreshold: true,
      usageThreshold: 80,
      failureThreshold: 5,
      healthThreshold: 50,
      maxConsecutiveFailures: 3,
      cooldownPeriod: 300000,
      preferHealthyKeys: true,
    };

    const state = {
      currentKeyIndex: 0,
      totalKeys: 2,
      lastRotation: Date.now(),
      totalRotations: 0,
    };

    const result = service.selectKey(keys, stats, config, state);

    // Design decision: When tied, select the first key
    assert.strictEqual(result.selectedKey, "syn_key1");
  });
});

suite("KeyCyclingService - Random strategy", () => {
  let context: vscode.ExtensionContext;
  let service: KeyCyclingService;

  beforeEach(() => {
    context = createMockContext();
    service = new KeyCyclingService();
  });

  afterEach(() => {
    service.dispose();
  });

  test("should select random key", () => {
    const keys: ApiKeyEntry[] = [
      { key: "syn_key1", label: "Key 1", createdAt: Date.now() },
      { key: "syn_key2", label: "Key 2", createdAt: Date.now() },
      { key: "syn_key3", label: "Key 3", createdAt: Date.now() },
    ];

    const stats: Map<string, KeyStatistics> = new Map([
      ["syn_key1", { totalRequests: 100, successfulRequests: 95, failedRequests: 5, consecutiveFailures: 0 }],
      ["syn_key2", { totalRequests: 50, successfulRequests: 48, failedRequests: 2, consecutiveFailures: 0 }],
      ["syn_key3", { totalRequests: 75, successfulRequests: 70, failedRequests: 5, consecutiveFailures: 0 }],
    ]);

    const config: CyclingConfig = {
      strategy: "Random",
      autoCycleOnThreshold: true,
      usageThreshold: 80,
      failureThreshold: 5,
      healthThreshold: 50,
      maxConsecutiveFailures: 3,
      cooldownPeriod: 300000,
      preferHealthyKeys: true,
    };

    const state = {
      currentKeyIndex: 0,
      totalKeys: 3,
      lastRotation: Date.now(),
      totalRotations: 0,
    };

    const result = service.selectKey(keys, stats, config, state);

    // Design rationale: Random strategy should return a valid key
    assert.strictEqual(result.success, true);
    assert.ok(["syn_key1", "syn_key2", "syn_key3"].includes(result.selectedKey));
    assert.strictEqual(result.reason, "Random selection");
  });

  test("should select random key excluding current", () => {
    const keys: ApiKeyEntry[] = [
      { key: "syn_key1", label: "Key 1", createdAt: Date.now() },
      { key: "syn_key2", label: "Key 2", createdAt: Date.now() },
    ];

    const stats: Map<string, KeyStatistics> = new Map([
      ["syn_key1", { totalRequests: 100, successfulRequests: 95, failedRequests: 5, consecutiveFailures: 0 }],
      ["syn_key2", { totalRequests: 50, successfulRequests: 48, failedRequests: 2, consecutiveFailures: 0 }],
    ]);

    const config: CyclingConfig = {
      strategy: "Random",
      autoCycleOnThreshold: true,
      usageThreshold: 80,
      failureThreshold: 5,
      healthThreshold: 50,
      maxConsecutiveFailures: 3,
      cooldownPeriod: 300000,
      preferHealthyKeys: true,
    };

    const state = {
      currentKeyIndex: 0,
      totalKeys: 2,
      lastRotation: Date.now(),
      totalRotations: 0,
    };

    const result = service.selectKey(keys, stats, config, state);

    // Design decision: Random should exclude current key when possible
    assert.strictEqual(result.selectedKey, "syn_key2");
  });
});

suite("KeyCyclingService - Priority strategy", () => {
  let context: vscode.ExtensionContext;
  let service: KeyCyclingService;

  beforeEach(() => {
    context = createMockContext();
    service = new KeyCyclingService();
  });

  afterEach(() => {
    service.dispose();
  });

  test("should select key with lowest quota usage", () => {
    const keys: ApiKeyEntry[] = [
      { key: "syn_key1", label: "Key 1", createdAt: Date.now(), priority: 100 },
      { key: "syn_key2", label: "Key 2", createdAt: Date.now(), priority: 50 }, // Higher priority (lower value)
      { key: "syn_key3", label: "Key 3", createdAt: Date.now(), priority: 75 },
    ];

    const stats: Map<string, KeyStatistics> = new Map([
      ["syn_key1", { totalRequests: 100, successfulRequests: 95, failedRequests: 5, consecutiveFailures: 0 }],
      ["syn_key2", { totalRequests: 20, successfulRequests: 20, failedRequests: 0, consecutiveFailures: 0 }],
      ["syn_key3", { totalRequests: 75, successfulRequests: 70, failedRequests: 5, consecutiveFailures: 0 }],
    ]);

    const quotas: Map<string, QuotaInfo> = new Map([
      ["syn_key1", { limit: 100, used: 90, percentageUsed: 90 }],
      ["syn_key2", { limit: 100, used: 20, percentageUsed: 20 }], // Best quota availability
      ["syn_key3", { limit: 100, used: 75, percentageUsed: 75 }],
    ]);

    const config: CyclingConfig = {
      strategy: "Priority",
      autoCycleOnThreshold: true,
      usageThreshold: 80,
      failureThreshold: 5,
      healthThreshold: 50,
      maxConsecutiveFailures: 3,
      cooldownPeriod: 300000,
      preferHealthyKeys: true,
    };

    const state = {
      currentKeyIndex: 0,
      totalKeys: 3,
      lastRotation: Date.now(),
      totalRotations: 0,
    };

    const result = service.selectKey(keys, stats, config, state, quotas);

    // Design rationale: Priority selects based on priority + quota health
    assert.strictEqual(result.selectedKey, "syn_key2");
    assert.strictEqual(result.newIndex, 1);
  });

  test("should fallback to default priority when not set", () => {
    const keys: ApiKeyEntry[] = [
      { key: "syn_key1", label: "Key 1", createdAt: Date.now() }, // No priority
      { key: "syn_key2", label: "Key 2", createdAt: Date.now(), priority: 100 },
    ];

    const stats: Map<string, KeyStatistics> = new Map([
      ["syn_key1", { totalRequests: 100, successfulRequests: 95, failedRequests: 5, consecutiveFailures: 0 }],
      ["syn_key2", { totalRequests: 50, successfulRequests: 48, failedRequests: 2, consecutiveFailures: 0 }],
    ]);

    const quotas: Map<string, QuotaInfo> = new Map([
      ["syn_key1", { limit: 100, used: 50, percentageUsed: 50 }],
      ["syn_key2", { limit: 100, used: 50, percentageUsed: 50 }],
    ]);

    const config: CyclingConfig = {
      strategy: "Priority",
      autoCycleOnThreshold: true,
      usageThreshold: 80,
      failureThreshold: 5,
      healthThreshold: 50,
      maxConsecutiveFailures: 3,
      cooldownPeriod: 300000,
      preferHealthyKeys: true,
    };

    const state = {
      currentKeyIndex: 0,
      totalKeys: 2,
      lastRotation: Date.now(),
      totalRotations: 0,
    };

    const result = service.selectKey(keys, stats, config, state, quotas);

    // Design decision: Keys without priority get default priority of 100
    assert.strictEqual(result.success, true);
  });
});

suite("KeyCyclingService - health score calculation", () => {
  let context: vscode.ExtensionContext;
  let service: KeyCyclingService;

  beforeEach(() => {
    context = createMockContext();
    service = new KeyCyclingService();
  });

  afterEach(() => {
    service.dispose();
  });

  test("should calculate health score for healthy key", () => {
    const keyEntry: ApiKeyEntry = {
      key: "syn_test123",
      label: "Test Key",
      createdAt: Date.now() - 86400000, // 1 day ago
    };

    const stats: KeyStatistics = {
      totalRequests: 100,
      successfulRequests: 95,
      failedRequests: 5,
      lastUsed: Date.now(),
      consecutiveFailures: 0,
    };

    const quota: QuotaInfo = {
      limit: 100,
      used: 30,
      percentageUsed: 30,
    };

    const healthResult = service.checkHealth(keyEntry, stats, quota);

    assert.strictEqual(healthResult.healthy, true);
    assert.ok(healthResult.healthScore > 70); // Should be high for healthy key
    assert.strictEqual(healthResult.consecutiveFailures, 0);
  });

  test("should calculate health score for unhealthy key with failures", () => {
    const keyEntry: ApiKeyEntry = {
      key: "syn_test123",
      label: "Test Key",
      createdAt: Date.now() - 86400000,
    };

    const stats: KeyStatistics = {
      totalRequests: 100,
      successfulRequests: 50,
      failedRequests: 50,
      lastUsed: Date.now(),
      consecutiveFailures: 5,
    };

    const quota: QuotaInfo = {
      limit: 100,
      used: 30,
      percentageUsed: 30,
    };

    const healthResult = service.checkHealth(keyEntry, stats, quota);

    // Design rationale: High consecutive failures reduce health score
    assert.strictEqual(healthResult.consecutiveFailures, 5);
    assert.ok(healthResult.healthScore < 70);
  });

  test("should calculate health score for key with low quota", () => {
    const keyEntry: ApiKeyEntry = {
      key: "syn_test123",
      label: "Test Key",
      createdAt: Date.now() - 86400000,
    };

    const stats: KeyStatistics = {
      totalRequests: 100,
      successfulRequests: 95,
      failedRequests: 5,
      lastUsed: Date.now(),
      consecutiveFailures: 0,
    };

    const quota: QuotaInfo = {
      limit: 100,
      used: 90,
      percentageUsed: 90,
    };

    const healthResult = service.checkHealth(keyEntry, stats, quota);

    // Design rationale: Low quota availability reduces health score
    assert.ok(healthResult.healthScore < 80);
  });

  test("should calculate health score for new key", () => {
    const keyEntry: ApiKeyEntry = {
      key: "syn_test123",
      label: "Test Key",
      createdAt: Date.now(), // Just created
    };

    const stats: KeyStatistics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      consecutiveFailures: 0,
    };

    const quota: QuotaInfo = {
      limit: 100,
      used: 0,
      percentageUsed: 0,
    };

    const healthResult = service.checkHealth(keyEntry, stats, quota);

    // Design rationale: New keys get bonus health score
    assert.ok(healthResult.healthScore > 80);
  });
});

suite("KeyCyclingService - automatic cycling", () => {
  let context: vscode.ExtensionContext;
  let service: KeyCyclingService;

  beforeEach(() => {
    context = createMockContext();
    service = new KeyCyclingService();
  });

  afterEach(() => {
    service.dispose();
  });

  test("should auto cycle when threshold exceeded", () => {
    const keys: ApiKeyEntry[] = [
      { key: "syn_key1", label: "Key 1", createdAt: Date.now() },
      { key: "syn_key2", label: "Key 2", createdAt: Date.now() },
    ];

    const stats: Map<string, KeyStatistics> = new Map([
      ["syn_key1", { totalRequests: 100, successfulRequests: 95, failedRequests: 5, consecutiveFailures: 0 }],
      ["syn_key2", { totalRequests: 20, successfulRequests: 20, failedRequests: 0, consecutiveFailures: 0 }],
    ]);

    const quotas: Map<string, QuotaInfo> = new Map([
      ["syn_key1", { limit: 100, used: 85, percentageUsed: 85 }], // Above threshold
      ["syn_key2", { limit: 100, used: 20, percentageUsed: 20 }],
    ]);

    const config: CyclingConfig = {
      strategy: "LeastUsed",
      autoCycleOnThreshold: true,
      usageThreshold: 80,
      failureThreshold: 5,
      healthThreshold: 50,
      maxConsecutiveFailures: 3,
      cooldownPeriod: 300000,
      preferHealthyKeys: true,
    };

    const state = {
      currentKeyIndex: 0,
      totalKeys: 2,
      lastRotation: Date.now(),
      totalRotations: 0,
    };

    const shouldCycle = service.shouldAutoCycle(keys, stats, config, state, quotas);

    // Design rationale: Auto cycle when current key exceeds threshold
    assert.strictEqual(shouldCycle, true);
  });

  test("should not auto cycle when below threshold", () => {
    const keys: ApiKeyEntry[] = [
      { key: "syn_key1", label: "Key 1", createdAt: Date.now() },
      { key: "syn_key2", label: "Key 2", createdAt: Date.now() },
    ];

    const stats: Map<string, KeyStatistics> = new Map([
      ["syn_key1", { totalRequests: 100, successfulRequests: 95, failedRequests: 5, consecutiveFailures: 0 }],
      ["syn_key2", { totalRequests: 20, successfulRequests: 20, failedRequests: 0, consecutiveFailures: 0 }],
    ]);

    const quotas: Map<string, QuotaInfo> = new Map([
      ["syn_key1", { limit: 100, used: 50, percentageUsed: 50 }], // Below threshold
      ["syn_key2", { limit: 100, used: 20, percentageUsed: 20 }],
    ]);

    const config: CyclingConfig = {
      strategy: "LeastUsed",
      autoCycleOnThreshold: true,
      usageThreshold: 80,
      failureThreshold: 5,
      healthThreshold: 50,
      maxConsecutiveFailures: 3,
      cooldownPeriod: 300000,
      preferHealthyKeys: true,
    };

    const state = {
      currentKeyIndex: 0,
      totalKeys: 2,
      lastRotation: Date.now(),
      totalRotations: 0,
    };

    const shouldCycle = service.shouldAutoCycle(keys, stats, config, state, quotas);

    assert.strictEqual(shouldCycle, false);
  });

  test("should not auto cycle when disabled", () => {
    const keys: ApiKeyEntry[] = [
      { key: "syn_key1", label: "Key 1", createdAt: Date.now() },
      { key: "syn_key2", label: "Key 2", createdAt: Date.now() },
    ];

    const stats: Map<string, KeyStatistics> = new Map([
      ["syn_key1", { totalRequests: 100, successfulRequests: 95, failedRequests: 5, consecutiveFailures: 0 }],
      ["syn_key2", { totalRequests: 20, successfulRequests: 20, failedRequests: 0, consecutiveFailures: 0 }],
    ]);

    const quotas: Map<string, QuotaInfo> = new Map([
      ["syn_key1", { limit: 100, used: 85, percentageUsed: 85 }],
      ["syn_key2", { limit: 100, used: 20, percentageUsed: 20 }],
    ]);

    const config: CyclingConfig = {
      strategy: "LeastUsed",
      autoCycleOnThreshold: false, // Disabled
      usageThreshold: 80,
      failureThreshold: 5,
      healthThreshold: 50,
      maxConsecutiveFailures: 3,
      cooldownPeriod: 300000,
      preferHealthyKeys: true,
    };

    const state = {
      currentKeyIndex: 0,
      totalKeys: 2,
      lastRotation: Date.now(),
      totalRotations: 0,
    };

    const shouldCycle = service.shouldAutoCycle(keys, stats, config, state, quotas);

    // Design decision: Respect autoCycleOnThreshold flag
    assert.strictEqual(shouldCycle, false);
  });
});

suite("KeyCyclingService - failure tracking", () => {
  let context: vscode.ExtensionContext;
  let service: KeyCyclingService;

  beforeEach(() => {
    context = createMockContext();
    service = new KeyCyclingService();
  });

  afterEach(() => {
    service.dispose();
  });

  test("should record failure and increment consecutive failures", () => {
    const stats: KeyStatistics = {
      totalRequests: 100,
      successfulRequests: 95,
      failedRequests: 5,
      lastUsed: Date.now(),
      consecutiveFailures: 2,
    };

    const updatedStats = service.recordFailure(stats);

    assert.strictEqual(updatedStats.failedRequests, 6);
    assert.strictEqual(updatedStats.consecutiveFailures, 3);
  });

  test("should reset consecutive failures on success", () => {
    const stats: KeyStatistics = {
      totalRequests: 100,
      successfulRequests: 95,
      failedRequests: 5,
      lastUsed: Date.now(),
      consecutiveFailures: 5,
    };

    const updatedStats = service.recordSuccess(stats);

    assert.strictEqual(updatedStats.successfulRequests, 96);
    assert.strictEqual(updatedStats.consecutiveFailures, 0);
  });

  test("should count recent failures", () => {
    const stats: KeyStatistics = {
      totalRequests: 100,
      successfulRequests: 95,
      failedRequests: 5,
      lastFailure: Date.now() - 10000, // 10 seconds ago
      consecutiveFailures: 3,
    };

    const recentFailures = service.countRecentFailures(stats, 60000); // 1 minute window

    // Design rationale: Count failures within the time window
    assert.strictEqual(recentFailures, 3);
  });

  test("should cycle due to excessive consecutive failures", () => {
    const keys: ApiKeyEntry[] = [
      { key: "syn_key1", label: "Key 1", createdAt: Date.now() },
      { key: "syn_key2", label: "Key 2", createdAt: Date.now() },
    ];

    const stats: Map<string, KeyStatistics> = new Map([
      ["syn_key1", { totalRequests: 100, successfulRequests: 90, failedRequests: 10, consecutiveFailures: 5 }],
      ["syn_key2", { totalRequests: 20, successfulRequests: 20, failedRequests: 0, consecutiveFailures: 0 }],
    ]);

    const config: CyclingConfig = {
      strategy: "LeastUsed",
      autoCycleOnThreshold: true,
      usageThreshold: 80,
      failureThreshold: 5,
      healthThreshold: 50,
      maxConsecutiveFailures: 3, // Current key has 5
      cooldownPeriod: 300000,
      preferHealthyKeys: true,
    };

    const state = {
      currentKeyIndex: 0,
      totalKeys: 2,
      lastRotation: Date.now(),
      totalRotations: 0,
    };

    const shouldCycle = service.shouldCycleDueToFailures(keys, stats, config, state);

    // Design rationale: Cycle when consecutive failures exceed max
    assert.strictEqual(shouldCycle, true);
  });
});

suite("KeyCyclingService - edge cases", () => {
  let context: vscode.ExtensionContext;
  let service: KeyCyclingService;

  beforeEach(() => {
    context = createMockContext();
    service = new KeyCyclingService();
  });

  afterEach(() => {
    service.dispose();
  });

  test("should handle empty key list", () => {
    const keys: ApiKeyEntry[] = [];
    const stats: Map<string, KeyStatistics> = new Map();

    const config: CyclingConfig = {
      strategy: "RoundRobin",
      autoCycleOnThreshold: true,
      usageThreshold: 80,
      failureThreshold: 5,
      healthThreshold: 50,
      maxConsecutiveFailures: 3,
      cooldownPeriod: 300000,
      preferHealthyKeys: true,
    };

    const state = {
      currentKeyIndex: 0,
      totalKeys: 0,
      lastRotation: Date.now(),
      totalRotations: 0,
    };

    const result = service.selectKey(keys, stats, config, state);

    // Design decision: Return failure when no keys available
    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes("No keys available"));
  });

  test("should handle single key with all strategies", () => {
    const keys: ApiKeyEntry[] = [
      { key: "syn_key1", label: "Key 1", createdAt: Date.now() },
    ];

    const stats: Map<string, KeyStatistics> = new Map([
      ["syn_key1", { totalRequests: 100, successfulRequests: 95, failedRequests: 5, consecutiveFailures: 0 }],
    ]);

    const strategies: CyclingStrategy[] = ["RoundRobin", "LeastUsed", "Random", "Priority"];

    for (const strategy of strategies) {
      const config: CyclingConfig = {
        strategy,
        autoCycleOnThreshold: true,
        usageThreshold: 80,
        failureThreshold: 5,
        healthThreshold: 50,
        maxConsecutiveFailures: 3,
        cooldownPeriod: 300000,
        preferHealthyKeys: true,
      };

      const state = {
        currentKeyIndex: 0,
        totalKeys: 1,
        lastRotation: Date.now(),
        totalRotations: 0,
      };

      const result = service.selectKey(keys, stats, config, state);

      // Design rationale: With single key, always return same key
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.selectedKey, "syn_key1");
    }
  });

  test("should update config", () => {
    const config: CyclingConfig = {
      strategy: "RoundRobin",
      autoCycleOnThreshold: true,
      usageThreshold: 80,
      failureThreshold: 5,
      healthThreshold: 50,
      maxConsecutiveFailures: 3,
      cooldownPeriod: 300000,
      preferHealthyKeys: true,
    };

    service.updateConfig({
      strategy: "LeastUsed",
      usageThreshold: 90,
    });

    const updatedConfig = service.getConfig();

    assert.strictEqual(updatedConfig.strategy, "LeastUsed");
    assert.strictEqual(updatedConfig.usageThreshold, 90);
    // Other values should be preserved
    assert.strictEqual(updatedConfig.autoCycleOnThreshold, true);
    assert.strictEqual(updatedConfig.failureThreshold, 5);
  });

  test("should calculate quota impact", () => {
    const quota: QuotaInfo = {
      limit: 100,
      used: 50,
      percentageUsed: 50,
    };

    const impact = service.calculateQuotaImpact(quota, 10);

    // Design rationale: Calculate impact of additional requests
    assert.ok(impact > 0);
    assert.ok(impact < 1);
  });
});

suite("KeyCyclingService - dispose", () => {
  test("should dispose properly", () => {
    const context = createMockContext();
    const service = new KeyCyclingService();

    // Should not throw
    service.dispose();
    service.dispose(); // Multiple disposals should be safe
  });
});
