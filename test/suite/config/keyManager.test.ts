import assert from "node:assert";
import { suite, test, beforeEach, afterEach } from "mocha";
import * as vscode from "vscode";
import { KeyManager } from "../../../src/config/keyManager";
import { SyntheticService } from "../../../src/api/syntheticService";

/**
 * Unit tests for KeyManager
 * Tests multi-key management, backward compatibility, and validation
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

suite("KeyManager - addApiKey", () => {
  let context: vscode.ExtensionContext;
  let keyManager: KeyManager;

  beforeEach(() => {
    context = createMockContext();
    keyManager = new KeyManager(context);
  });

  afterEach(() => {
    keyManager.dispose();
  });

  test("should add a single API key", async () => {
    const result = await keyManager.addApiKey("syn_test123", "Test Key");
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.index, 0);

    const keys = keyManager.getAllKeys();
    assert.strictEqual(keys.length, 1);
    assert.strictEqual(keys[0].key, "syn_test123");
    assert.strictEqual(keys[0].label, "Test Key");
  });

  test("should add multiple API keys", async () => {
    await keyManager.addApiKey("syn_test123", "Key 1");
    await keyManager.addApiKey("syn_test456", "Key 2");
    await keyManager.addApiKey("syn_test789", "Key 3");

    const keys = keyManager.getAllKeys();
    assert.strictEqual(keys.length, 3);
    assert.strictEqual(keys[0].key, "syn_test123");
    assert.strictEqual(keys[1].key, "syn_test456");
    assert.strictEqual(keys[2].key, "syn_test789");
  });

  test("should reject invalid API key format", async () => {
    // Design decision: Validate API keys before storing them
    const result = await keyManager.addApiKey("invalid_key", "Invalid");
    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes("Invalid API key"));

    const keys = keyManager.getAllKeys();
    assert.strictEqual(keys.length, 0);
  });

  test("should reject empty API key", async () => {
    const result = await keyManager.addApiKey("", "Empty");
    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes("Invalid API key"));

    const keys = keyManager.getAllKeys();
    assert.strictEqual(keys.length, 0);
  });

  test("should reject duplicate API keys", async () => {
    await keyManager.addApiKey("syn_test123", "Key 1");
    const result = await keyManager.addApiKey("syn_test123", "Duplicate");

    // Design rationale: Prevent duplicate keys to avoid confusion
    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes("already exists"));

    const keys = keyManager.getAllKeys();
    assert.strictEqual(keys.length, 1);
  });

  test("should set first key as active when adding to empty collection", async () => {
    await keyManager.addApiKey("syn_test123", "Test Key");

    const activeKey = keyManager.getActiveKey();
    assert.strictEqual(activeKey, "syn_test123");
  });

  test("should not change active key when adding to existing collection", async () => {
    await keyManager.addApiKey("syn_test123", "Key 1");
    const activeKey1 = keyManager.getActiveKey();

    await keyManager.addApiKey("syn_test456", "Key 2");
    const activeKey2 = keyManager.getActiveKey();

    // Design decision: Preserve currently active key
    assert.strictEqual(activeKey1, "syn_test123");
    assert.strictEqual(activeKey2, "syn_test123");
  });
});

suite("KeyManager - removeApiKey", () => {
  let context: vscode.ExtensionContext;
  let keyManager: KeyManager;

  beforeEach(async () => {
    context = createMockContext();
    keyManager = new KeyManager(context);
    await keyManager.addApiKey("syn_test123", "Key 1");
    await keyManager.addApiKey("syn_test456", "Key 2");
    await keyManager.addApiKey("syn_test789", "Key 3");
  });

  afterEach(() => {
    keyManager.dispose();
  });

  test("should remove API key by index", async () => {
    const result = await keyManager.removeApiKey(1);
    assert.strictEqual(result.success, true);

    const keys = keyManager.getAllKeys();
    assert.strictEqual(keys.length, 2);
    assert.strictEqual(keys[0].key, "syn_test123");
    assert.strictEqual(keys[1].key, "syn_test789");
  });

  test("should remove active key and set next as active", async () => {
    await keyManager.setActiveKeyByIndex(1); // Set key at index 1 as active
    assert.strictEqual(keyManager.getActiveKey(), "syn_test456");

    await keyManager.removeApiKey(1);
    const activeKey = keyManager.getActiveKey();

    // Design rationale: Auto-select next key when active key is removed
    assert.strictEqual(activeKey, "syn_test789");
  });

  test("should remove last key and set previous as active", async () => {
    await keyManager.setActiveKeyByIndex(2); // Set last key as active
    await keyManager.removeApiKey(2);
    const activeKey = keyManager.getActiveKey();

    assert.strictEqual(activeKey, "syn_test456");
  });

  test("should fail to remove key with invalid index", async () => {
    const result = await keyManager.removeApiKey(99);
    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes("Invalid index"));

    const keys = keyManager.getAllKeys();
    assert.strictEqual(keys.length, 3);
  });

  test("should fail to remove key with negative index", async () => {
    const result = await keyManager.removeApiKey(-1);
    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes("Invalid index"));
  });

  test("should handle removing only remaining key", async () => {
    const singleKeyManager = new KeyManager(context);
    await singleKeyManager.addApiKey("syn_test123", "Test Key");
    await singleKeyManager.removeApiKey(0);

    const activeKey = singleKeyManager.getActiveKey();
    assert.strictEqual(activeKey, undefined);
  });
});

suite("KeyManager - setActiveKey", () => {
  let context: vscode.ExtensionContext;
  let keyManager: KeyManager;

  beforeEach(async () => {
    context = createMockContext();
    keyManager = new KeyManager(context);
    await keyManager.addApiKey("syn_test123", "Key 1");
    await keyManager.addApiKey("syn_test456", "Key 2");
    await keyManager.addApiKey("syn_test789", "Key 3");
  });

  afterEach(() => {
    keyManager.dispose();
  });

  test("should set active key by value", async () => {
    const result = await keyManager.setActiveKey("syn_test456");
    assert.strictEqual(result.success, true);

    const activeKey = keyManager.getActiveKey();
    assert.strictEqual(activeKey, "syn_test456");
  });

  test("should fail to set non-existent key as active", async () => {
    const result = await keyManager.setActiveKey("syn_nonexistent");
    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes("not found"));
  });

  test("should set active key by index", async () => {
    const result = await keyManager.setActiveKeyByIndex(2);
    assert.strictEqual(result.success, true);

    const activeKey = keyManager.getActiveKey();
    assert.strictEqual(activeKey, "syn_test789");
  });

  test("should fail to set active key by invalid index", async () => {
    const result = await keyManager.setActiveKeyByIndex(99);
    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes("Invalid index"));
  });

  test("should get active index", async () => {
    await keyManager.setActiveKeyByIndex(1);
    const activeIndex = keyManager.getActiveIndex();
    assert.strictEqual(activeIndex, 1);
  });

  test("should return -1 for active index when no keys", async () => {
    const emptyManager = new KeyManager(context);
    const activeIndex = emptyManager.getActiveIndex();
    assert.strictEqual(activeIndex, -1);
  });
});

suite("KeyManager - setKeyLabel", () => {
  let context: vscode.ExtensionContext;
  let keyManager: KeyManager;

  beforeEach(async () => {
    context = createMockContext();
    keyManager = new KeyManager(context);
    await keyManager.addApiKey("syn_test123", "Original Label");
  });

  afterEach(() => {
    keyManager.dispose();
  });

  test("should update key label", async () => {
    const result = await keyManager.setKeyLabel("syn_test123", "New Label");
    assert.strictEqual(result.success, true);

    const keys = keyManager.getAllKeys();
    assert.strictEqual(keys[0].label, "New Label");
  });

  test("should fail to update label for non-existent key", async () => {
    const result = await keyManager.setKeyLabel("syn_nonexistent", "Label");
    assert.strictEqual(result.success, false);
    assert.ok(result.error?.includes("not found"));
  });
});

suite("KeyManager - statistics", () => {
  let context: vscode.ExtensionContext;
  let keyManager: KeyManager;

  beforeEach(async () => {
    context = createMockContext();
    keyManager = new KeyManager(context);
    await keyManager.addApiKey("syn_test123", "Key 1");
    await keyManager.addApiKey("syn_test456", "Key 2");
  });

  afterEach(() => {
    keyManager.dispose();
  });

  test("should update key statistics", async () => {
    await keyManager.updateKeyStatistics("syn_test123", {
      totalRequests: 100,
      successfulRequests: 95,
      failedRequests: 5,
      lastUsed: new Date("2026-01-30T12:00:00Z"),
      lastFailure: new Date("2026-01-30T11:00:00Z"),
      consecutiveFailures: 2,
    });

    const stats = keyManager.getKeyStatistics("syn_test123");
    assert.ok(stats);
    assert.strictEqual(stats.totalRequests, 100);
    assert.strictEqual(stats.successfulRequests, 95);
    assert.strictEqual(stats.failedRequests, 5);
    assert.ok(stats.lastUsed);
    assert.strictEqual(stats.consecutiveFailures, 2);
  });

  test("should get statistics for key", async () => {
    await keyManager.updateKeyStatistics("syn_test123", {
      totalRequests: 50,
      successfulRequests: 48,
      failedRequests: 2,
      lastUsed: new Date("2026-01-30T12:00:00Z"),
    });

    const stats = keyManager.getKeyStatistics("syn_test123");
    assert.ok(stats);
    assert.strictEqual(stats.totalRequests, 50);
  });

  test("should return undefined for non-existent key statistics", () => {
    const stats = keyManager.getKeyStatistics("syn_nonexistent");
    assert.strictEqual(stats, undefined);
  });

  test("should reset statistics for single key", async () => {
    await keyManager.updateKeyStatistics("syn_test123", {
      totalRequests: 100,
      successfulRequests: 95,
      failedRequests: 5,
    });

    await keyManager.resetKeyStatistics("syn_test123");

    const stats = keyManager.getKeyStatistics("syn_test123");
    assert.ok(stats);
    assert.strictEqual(stats.totalRequests, 0);
    assert.strictEqual(stats.successfulRequests, 0);
    assert.strictEqual(stats.failedRequests, 0);
    assert.strictEqual(stats.consecutiveFailures, 0);
  });

  test("should reset all statistics", async () => {
    await keyManager.updateKeyStatistics("syn_test123", {
      totalRequests: 100,
      successfulRequests: 95,
      failedRequests: 5,
    });
    await keyManager.updateKeyStatistics("syn_test456", {
      totalRequests: 200,
      successfulRequests: 190,
      failedRequests: 10,
    });

    await keyManager.resetAllStatistics();

    const stats1 = keyManager.getKeyStatistics("syn_test123");
    const stats2 = keyManager.getKeyStatistics("syn_test456");

    assert.strictEqual(stats1?.totalRequests, 0);
    assert.strictEqual(stats2?.totalRequests, 0);
  });
});

suite("KeyManager - backward compatibility", () => {
  let context: vscode.ExtensionContext;
  let keyManager: KeyManager;

  beforeEach(() => {
    context = createMockContext();
    keyManager = new KeyManager(context);
  });

  afterEach(() => {
    keyManager.dispose();
  });

  test("should migrate legacy single key format", async () => {
    // Mock legacy key in secrets
    const mockSecrets = {
      get: async (key: string) => {
        if (key === "syntheticApiKey") {
          return "syn_legacy123";
        }
        return undefined;
      },
      store: () => Promise.resolve(),
      delete: () => Promise.resolve(),
    };
    (context as any).secrets = mockSecrets;

    // Trigger migration by checking for API key
    const hasKey = await keyManager.hasApiKey();
    assert.strictEqual(hasKey, true);

    const activeKey = keyManager.getActiveKey();
    assert.strictEqual(activeKey, "syn_legacy123");

    const keys = keyManager.getAllKeys();
    assert.strictEqual(keys.length, 1);
    assert.strictEqual(keys[0].key, "syn_legacy123");
  });

  test("should handle both new and legacy formats", async () => {
    // Mock both formats present
    const mockSecrets = {
      get: async (key: string) => {
        if (key === "syntheticApiKeys") {
          return JSON.stringify([
            { key: "syn_new123", label: "New Key" },
          ]);
        }
        if (key === "syntheticApiKey") {
          return "syn_legacy123";
        }
        return undefined;
      },
      store: () => Promise.resolve(),
      delete: () => Promise.resolve(),
    };
    (context as any).secrets = mockSecrets;

    const hasKey = await keyManager.hasApiKey();
    assert.strictEqual(hasKey, true);

    // Design decision: Prefer new format over legacy
    const activeKey = keyManager.getActiveKey();
    assert.strictEqual(activeKey, "syn_new123");
  });
});

suite("KeyManager - collection and state", () => {
  let context: vscode.ExtensionContext;
  let keyManager: KeyManager;

  beforeEach(async () => {
    context = createMockContext();
    keyManager = new KeyManager(context);
    await keyManager.addApiKey("syn_test123", "Key 1");
    await keyManager.addApiKey("syn_test456", "Key 2");
  });

  afterEach(() => {
    keyManager.dispose();
  });

  test("should get active entry", async () => {
    await keyManager.setActiveKeyByIndex(1);
    const activeEntry = keyManager.getActiveEntry();

    assert.ok(activeEntry);
    assert.strictEqual(activeEntry.key, "syn_test456");
    assert.strictEqual(activeEntry.label, "Key 2");
  });

  test("should return undefined for active entry when no keys", () => {
    const emptyManager = new KeyManager(context);
    const activeEntry = emptyManager.getActiveEntry();
    assert.strictEqual(activeEntry, undefined);
  });

  test("should get collection", () => {
    const collection = keyManager.getCollection();

    assert.strictEqual(collection.keys.length, 2);
    assert.strictEqual(collection.activeIndex, 0);
    assert.strictEqual(collection.keys[0].key, "syn_test123");
  });

  test("should get cycling state", () => {
    const state = keyManager.getCyclingState();

    assert.strictEqual(state.currentKeyIndex, 0);
    assert.strictEqual(state.totalKeys, 2);
  });

  test("should update cycling state", async () => {
    await keyManager.updateCyclingState({
      currentKeyIndex: 1,
      totalKeys: 2,
      lastRotation: new Date("2026-01-30T12:00:00Z"),
      totalRotations: 5,
    });

    const state = keyManager.getCyclingState();
    assert.strictEqual(state.currentKeyIndex, 1);
    assert.strictEqual(state.totalRotations, 5);
  });

  test("should get keys timestamp", async () => {
    const timestamp = await keyManager.getKeysTimestamp();
    assert.ok(typeof timestamp === "number");
    assert.ok(timestamp > 0);
  });
});

suite("KeyManager - hasApiKey", () => {
  let context: vscode.ExtensionContext;
  let keyManager: KeyManager;

  beforeEach(() => {
    context = createMockContext();
    keyManager = new KeyManager(context);
  });

  afterEach(() => {
    keyManager.dispose();
  });

  test("should return true when key exists", async () => {
    await keyManager.addApiKey("syn_test123", "Test Key");
    const hasKey = await keyManager.hasApiKey();
    assert.strictEqual(hasKey, true);
  });

  test("should return false when no keys", async () => {
    const hasKey = await keyManager.hasApiKey();
    assert.strictEqual(hasKey, false);
  });

  test("should return true with legacy key", async () => {
    const mockSecrets = {
      get: async (key: string) => {
        if (key === "syntheticApiKey") {
          return "syn_legacy123";
        }
        return undefined;
      },
      store: () => Promise.resolve(),
      delete: () => Promise.resolve(),
    };
    (context as any).secrets = mockSecrets;

    const hasKey = await keyManager.hasApiKey();
    assert.strictEqual(hasKey, true);
  });
});

suite("KeyManager - onKeysChanged", () => {
  let context: vscode.ExtensionContext;
  let keyManager: KeyManager;

  beforeEach(() => {
    context = createMockContext();
    keyManager = new KeyManager(context);
  });

  afterEach(() => {
    keyManager.dispose();
  });

  test("should call callback when keys change", async () => {
    let callbackCalled = false;
    keyManager.onKeysChanged(() => {
      callbackCalled = true;
    });

    await keyManager.addApiKey("syn_test123", "Test Key");
    assert.strictEqual(callbackCalled, true);
  });

  test("should call callback when key is removed", async () => {
    await keyManager.addApiKey("syn_test123", "Test Key");

    let callbackCalled = false;
    keyManager.onKeysChanged(() => {
      callbackCalled = true;
    });

    await keyManager.removeApiKey(0);
    assert.strictEqual(callbackCalled, true);
  });

  test("should call callback when active key changes", async () => {
    await keyManager.addApiKey("syn_test123", "Key 1");
    await keyManager.addApiKey("syn_test456", "Key 2");

    let callbackCalled = false;
    keyManager.onKeysChanged(() => {
      callbackCalled = true;
    });

    await keyManager.setActiveKeyByIndex(1);
    assert.strictEqual(callbackCalled, true);
  });
});

suite("KeyManager - dispose", () => {
  test("should dispose properly", async () => {
    const context = createMockContext();
    const keyManager = new KeyManager(context);
    await keyManager.addApiKey("syn_test123", "Test Key");

    // Should not throw
    keyManager.dispose();
    keyManager.dispose(); // Multiple disposals should be safe
  });
});
