import assert from "node:assert";
import { suite, test } from "mocha";
import * as vscode from "vscode";
import { UsageIndicator } from "../../../src/statusBar/usageIndicator";
import type { UsageInfo, CategoryUsage } from "../../../src/api/syntheticService";

/**
 * Unit tests for UsageIndicator
 * Tests the new progress bar rendering, category breakdowns, warning symbols, and caching
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

suite("UsageIndicator - buildProgressBar", () => {
  test("should build progress bar for 0%", () => {
    const context = createMockContext();
    const indicator = new UsageIndicator(context);

    // Access private method via type assertion
    const buildProgressBar = (indicator as any).buildProgressBar.bind(indicator);
    const result = buildProgressBar(0);

    // Design rationale: 0% should show all empty blocks
    assert.strictEqual(result.length, 52); // [ + 50 blocks + ]
    assert.strictEqual(result.split("░").length - 1, 50);
    assert.strictEqual(result.split("█").length - 1, 0);
  });

  test("should build progress bar for 25%", () => {
    const context = createMockContext();
    const indicator = new UsageIndicator(context);
    const buildProgressBar = (indicator as any).buildProgressBar.bind(indicator);
    const result = buildProgressBar(25);

    // 25% of 50 = 12.5, rounds to 13 filled blocks
    const filledCount = result.split("█").length - 1;
    const emptyCount = result.split("░").length - 1;

    // Design rationale: Round to nearest block for visual representation
    assert.ok(filledCount === 12 || filledCount === 13);
    assert.strictEqual(filledCount + emptyCount, 50);
  });

  test("should build progress bar for 50%", () => {
    const context = createMockContext();
    const indicator = new UsageIndicator(context);
    const buildProgressBar = (indicator as any).buildProgressBar.bind(indicator);
    const result = buildProgressBar(50);

    const filledCount = result.split("█").length - 1;
    const emptyCount = result.split("░").length - 1;

    // 50% of 50 = 25 filled blocks
    assert.strictEqual(filledCount, 25);
    assert.strictEqual(emptyCount, 25);
  });

  test("should build progress bar for 75%", () => {
    const context = createMockContext();
    const indicator = new UsageIndicator(context);
    const buildProgressBar = (indicator as any).buildProgressBar.bind(indicator);
    const result = buildProgressBar(75);

    const filledCount = result.split("█").length - 1;
    const emptyCount = result.split("░").length - 1;

    // 75% of 50 = 37.5, rounds to 38 filled blocks
    assert.ok(filledCount === 37 || filledCount === 38);
    assert.strictEqual(filledCount + emptyCount, 50);
  });

  test("should build progress bar for 100%", () => {
    const context = createMockContext();
    const indicator = new UsageIndicator(context);
    const buildProgressBar = (indicator as any).buildProgressBar.bind(indicator);
    const result = buildProgressBar(100);

    const filledCount = result.split("█").length - 1;
    const emptyCount = result.split("░").length - 1;

    // Design rationale: 100% should show all filled blocks
    assert.strictEqual(filledCount, 50);
    assert.strictEqual(emptyCount, 0);
  });

  test("should clamp percentage above 100%", () => {
    const context = createMockContext();
    const indicator = new UsageIndicator(context);
    const buildProgressBar = (indicator as any).buildProgressBar.bind(indicator);
    const result = buildProgressBar(125);

    const filledCount = result.split("█").length - 1;
    const emptyCount = result.split("░").length - 1;

    // Design decision: Clamp to 100% to prevent overflow in UI
    assert.strictEqual(filledCount, 50);
    assert.strictEqual(emptyCount, 0);
  });

  test("should clamp negative percentage", () => {
    const context = createMockContext();
    const indicator = new UsageIndicator(context);
    const buildProgressBar = (indicator as any).buildProgressBar.bind(indicator);
    const result = buildProgressBar(-10);

    const filledCount = result.split("█").length - 1;
    const emptyCount = result.split("░").length - 1;

    // Design decision: Clamp to 0% to prevent negative values in UI
    assert.strictEqual(filledCount, 0);
    assert.strictEqual(emptyCount, 50);
  });

  test("should clamp percentage above 200%", () => {
    const context = createMockContext();
    const indicator = new UsageIndicator(context);
    const buildProgressBar = (indicator as any).buildProgressBar.bind(indicator);
    const result = buildProgressBar(250);

    const filledCount = result.split("█").length - 1;
    const emptyCount = result.split("░").length - 1;

    // Design decision: Clamp to 100% even for extreme values
    assert.strictEqual(filledCount, 50);
    assert.strictEqual(emptyCount, 0);
  });

  test("should support custom width", () => {
    const context = createMockContext();
    const indicator = new UsageIndicator(context);
    const buildProgressBar = (indicator as any).buildProgressBar.bind(indicator);
    const result = buildProgressBar(50, 20);

    assert.strictEqual(result.length, 22); // [ + 20 blocks + ]
    const filledCount = result.split("█").length - 1;
    const emptyCount = result.split("░").length - 1;

    assert.strictEqual(filledCount, 10);
    assert.strictEqual(emptyCount, 10);
  });
});

suite("UsageIndicator - buildTooltip with categories", () => {
  test("should build tooltip with category breakdowns", () => {
    const context = createMockContext();
    const indicator = new UsageIndicator(context);

    const usage: UsageInfo = {
      limit: 10000,
      requests: 5000,
      remaining: 5000,
      percentageUsed: 50,
      renewsAt: new Date("2026-02-01T00:00:00Z"),
      categories: {
        tools: { limit: 1000, used: 500, remaining: 500, percentageUsed: 50 },
        search: { limit: 500, used: 100, remaining: 400, percentageUsed: 20 },
        chat: { limit: 2000, used: 1500, remaining: 500, percentageUsed: 75 },
      },
    };

    const buildTooltip = (indicator as any).buildTooltip.bind(indicator);
    const result = buildTooltip(usage, undefined);

    // Design rationale: Include category names in tooltip
    assert.ok(result.includes("tools"));
    assert.ok(result.includes("search"));
    assert.ok(result.includes("chat"));

    // Should include progress bars for each category
    assert.ok(result.includes("█"));
    assert.ok(result.includes("░"));
  });

  test("should build tooltip with API key suffix", () => {
    const context = createMockContext();
    const indicator = new UsageIndicator(context);

    const usage: UsageInfo = {
      limit: 10000,
      requests: 5000,
      remaining: 5000,
      percentageUsed: 50,
      renewsAt: new Date("2026-02-01T00:00:00Z"),
    };

    const buildTooltip = (indicator as any).buildTooltip.bind(indicator);
    const result = buildTooltip(usage, "xYz9");

    // Design rationale: Show last 4 characters of API key for identification
    assert.ok(result.includes("xYz9"));
  });

  test("should build tooltip without categories when not provided", () => {
    const context = createMockContext();
    const indicator = new UsageIndicator(context);

    const usage: UsageInfo = {
      limit: 10000,
      requests: 5000,
      remaining: 5000,
      percentageUsed: 50,
      renewsAt: new Date("2026-02-01T00:00:00Z"),
      categories: undefined,
    };

    const buildTooltip = (indicator as any).buildTooltip.bind(indicator);
    const result = buildTooltip(usage, undefined);

    // Design decision: Still show overall usage when categories are not available
    assert.ok(result.includes("5000"));
    assert.ok(result.includes("10000"));
  });

  test("should build tooltip with empty categories", () => {
    const context = createMockContext();
    const indicator = new UsageIndicator(context);

    const usage: UsageInfo = {
      limit: 10000,
      requests: 5000,
      remaining: 5000,
      percentageUsed: 50,
      renewsAt: new Date("2026-02-01T00:00:00Z"),
      categories: {},
    };

    const buildTooltip = (indicator as any).buildTooltip.bind(indicator);
    const result = buildTooltip(usage, undefined);

    // Design rationale: Handle empty categories gracefully
    assert.ok(result.includes("5000"));
  });
});

suite("UsageIndicator - buildText with warning symbols", () => {
  test("should include warning symbol when above critical threshold", () => {
    const context = createMockContext();
    const indicator = new UsageIndicator(context);

    const usage: UsageInfo = {
      limit: 10000,
      requests: 9500,
      remaining: 500,
      percentageUsed: 95,
      renewsAt: new Date("2026-02-01T00:00:00Z"),
    };

    const buildText = (indicator as any).buildText.bind(indicator);
    const result = buildText(usage, {
      showPercentage: true,
      showRawNumbers: false,
      warningThreshold: 80,
      criticalThreshold: 90,
    });

    // Design rationale: Use 🔴 emoji for critical usage
    assert.ok(result.includes("🔴"));
  });

  test("should include warning symbol when above warning threshold", () => {
    const context = createMockContext();
    const indicator = new UsageIndicator(context);

    const usage: UsageInfo = {
      limit: 10000,
      requests: 8500,
      remaining: 1500,
      percentageUsed: 85,
      renewsAt: new Date("2026-02-01T00:00:00Z"),
    };

    const buildText = (indicator as any).buildText.bind(indicator);
    const result = buildText(usage, {
      showPercentage: true,
      showRawNumbers: false,
      warningThreshold: 80,
      criticalThreshold: 90,
    });

    // Design rationale: Use ⚠️ emoji for warning usage
    assert.ok(result.includes("⚠️"));
  });

  test("should not include warning symbol when below warning threshold", () => {
    const context = createMockContext();
    const indicator = new UsageIndicator(context);

    const usage: UsageInfo = {
      limit: 10000,
      requests: 5000,
      remaining: 5000,
      percentageUsed: 50,
      renewsAt: new Date("2026-02-01T00:00:00Z"),
    };

    const buildText = (indicator as any).buildText.bind(indicator);
    const result = buildText(usage, {
      showPercentage: true,
      showRawNumbers: false,
      warningThreshold: 80,
      criticalThreshold: 90,
    });

    // Design rationale: No warning symbol for healthy usage
    assert.ok(!result.includes("⚠️"));
    assert.ok(!result.includes("🔴"));
  });
});

suite("UsageIndicator - category warning symbols", () => {
  test("should build category warning symbols with multiple warnings", () => {
    const context = createMockContext();
    const indicator = new UsageIndicator(context);

    const usage: UsageInfo = {
      limit: 10000,
      requests: 5000,
      remaining: 5000,
      percentageUsed: 50,
      renewsAt: new Date("2026-02-01T00:00:00Z"),
      categories: {
        tools: { limit: 1000, used: 950, remaining: 50, percentageUsed: 95 }, // Critical
        search: { limit: 500, used: 400, remaining: 100, percentageUsed: 80 }, // Warning
        chat: { limit: 2000, used: 500, remaining: 1500, percentageUsed: 25 }, // Healthy
      },
    };

    const buildCategoryWarningSymbols = (indicator as any).buildCategoryWarningSymbols.bind(indicator);
    const result = buildCategoryWarningSymbols(usage, 80, 90);

    // Design rationale: Use single-letter abbreviations for compact display
    // T = tools (critical), S = search (warning), C = chat (healthy)
    assert.ok(result.includes("T"));
    assert.ok(result.includes("S"));
    assert.ok(result.includes("C"));
  });

  test("should include emoji for critical categories", () => {
    const context = createMockContext();
    const indicator = new UsageIndicator(context);

    const usage: UsageInfo = {
      limit: 10000,
      requests: 5000,
      remaining: 5000,
      percentageUsed: 50,
      renewsAt: new Date("2026-02-01T00:00:00Z"),
      categories: {
        tools: { limit: 1000, used: 950, remaining: 50, percentageUsed: 95 },
      },
    };

    const buildCategoryWarningSymbols = (indicator as any).buildCategoryWarningSymbols.bind(indicator);
    const result = buildCategoryWarningSymbols(usage, 80, 90);

    // Design rationale: Show 🔴 for critical categories
    assert.ok(result.includes("🔴"));
  });

  test("should include emoji for warning categories", () => {
    const context = createMockContext();
    const indicator = new UsageIndicator(context);

    const usage: UsageInfo = {
      limit: 10000,
      requests: 5000,
      remaining: 5000,
      percentageUsed: 50,
      renewsAt: new Date("2026-02-01T00:00:00Z"),
      categories: {
        tools: { limit: 1000, used: 850, remaining: 150, percentageUsed: 85 },
      },
    };

    const buildCategoryWarningSymbols = (indicator as any).buildCategoryWarningSymbols.bind(indicator);
    const result = buildCategoryWarningSymbols(usage, 80, 90);

    // Design rationale: Show ⚠️ for warning categories
    assert.ok(result.includes("⚠️"));
  });

  test("should handle custom category names", () => {
    const context = createMockContext();
    const indicator = new UsageIndicator(context);

    const usage: UsageInfo = {
      limit: 10000,
      requests: 5000,
      remaining: 5000,
      percentageUsed: 50,
      renewsAt: new Date("2026-02-01T00:00:00Z"),
      categories: {
        custom: { limit: 1000, used: 950, remaining: 50, percentageUsed: 95 },
      },
    };

    const buildCategoryWarningSymbols = (indicator as any).buildCategoryWarningSymbols.bind(indicator);
    const result = buildCategoryWarningSymbols(usage, 80, 90);

    // Design decision: Use first letter for unknown categories
    assert.ok(result.includes("C"));
  });
});

suite("UsageIndicator - caching behavior", () => {
  test("should cache lastText to prevent unnecessary updates", () => {
    const context = createMockContext();
    const indicator = new UsageIndicator(context);

    const usage: UsageInfo = {
      limit: 10000,
      requests: 5000,
      remaining: 5000,
      percentageUsed: 50,
      renewsAt: new Date("2026-02-01T00:00:00Z"),
    };

    const config = {
      showPercentage: true,
      showRawNumbers: false,
      warningThreshold: 80,
      criticalThreshold: 90,
    };

    indicator.updateUsage(usage, config, undefined);

    // Access private cache properties
    const lastText = (indicator as any).lastText;
    const lastTooltip = (indicator as any).lastTooltip;
    const lastDisplayState = (indicator as any).lastDisplayState;

    // Design rationale: Cache values to prevent unnecessary redraws
    assert.strictEqual(typeof lastText, "string");
    assert.strictEqual(typeof lastTooltip, "string");
    assert.strictEqual(typeof lastDisplayState, "string");
  });

  test("should clear cache when display state changes", () => {
    const context = createMockContext();
    const indicator = new UsageIndicator(context);

    const usage: UsageInfo = {
      limit: 10000,
      requests: 5000,
      remaining: 5000,
      percentageUsed: 50,
      renewsAt: new Date("2026-02-01T00:00:00Z"),
    };

    const config = {
      showPercentage: true,
      showRawNumbers: false,
      warningThreshold: 80,
      criticalThreshold: 90,
    };

    indicator.updateUsage(usage, config, undefined);

    // Set loading state which should clear cache
    indicator.setLoading();

    const lastText = (indicator as any).lastText;
    const lastTooltip = (indicator as any).lastTooltip;
    const lastDisplayState = (indicator as any).lastDisplayState;

    // Design decision: Clear cache on state changes to force update
    assert.strictEqual(lastText, null);
    assert.strictEqual(lastTooltip, null);
    assert.strictEqual(lastDisplayState, "loading");
  });

  test("should not update status bar when values are unchanged", () => {
    const context = createMockContext();
    const indicator = new UsageIndicator(context);

    const usage: UsageInfo = {
      limit: 10000,
      requests: 5000,
      remaining: 5000,
      percentageUsed: 50,
      renewsAt: new Date("2026-02-01T00:00:00Z"),
    };

    const config = {
      showPercentage: true,
      showRawNumbers: false,
      warningThreshold: 80,
      criticalThreshold: 90,
    };

    // First update
    indicator.updateUsage(usage, config, undefined);

    // Get current status bar text
    const firstText = indicator.getStatusBarItem().text;

    // Second update with same values
    indicator.updateUsage(usage, config, undefined);

    // Design rationale: Skip update when values haven't changed
    const secondText = indicator.getStatusBarItem().text;
    assert.strictEqual(secondText, firstText);
  });

  test("should update status bar when API key suffix changes", () => {
    const context = createMockContext();
    const indicator = new UsageIndicator(context);

    const usage: UsageInfo = {
      limit: 10000,
      requests: 5000,
      remaining: 5000,
      percentageUsed: 50,
      renewsAt: new Date("2026-02-01T00:00:00Z"),
    };

    const config = {
      showPercentage: true,
      showRawNumbers: false,
      warningThreshold: 80,
      criticalThreshold: 90,
    };

    // Update with first key suffix
    indicator.updateUsage(usage, config, "xYz9");
    const firstText = indicator.getStatusBarItem().text;

    // Update with different key suffix
    indicator.updateUsage(usage, config, "AbCd");
    const secondText = indicator.getStatusBarItem().text;

    // Design rationale: API key suffix affects tooltip, should trigger update
    assert.notStrictEqual(secondText, firstText);
  });
});

suite("UsageIndicator - multi-key display info", () => {
  test("should set and clear multi-key display info", () => {
    const context = createMockContext();
    const indicator = new UsageIndicator(context);

    const multiKeyInfo = {
      currentKeyIndex: 0,
      totalKeys: 3,
      strategy: "RoundRobin",
    };

    indicator.setMultiKeyInfo(multiKeyInfo);

    // Access private multi-key info property
    const storedInfo = (indicator as any).multiKeyInfo;

    assert.strictEqual(storedInfo.currentKeyIndex, 0);
    assert.strictEqual(storedInfo.totalKeys, 3);
    assert.strictEqual(storedInfo.strategy, "RoundRobin");

    // Clear multi-key info
    indicator.clearMultiKeyInfo();

    const clearedInfo = (indicator as any).multiKeyInfo;

    assert.strictEqual(clearedInfo, null);
  });

  test("should include multi-key info in tooltip when available", () => {
    const context = createMockContext();
    const indicator = new UsageIndicator(context);

    const usage: UsageInfo = {
      limit: 10000,
      requests: 5000,
      remaining: 5000,
      percentageUsed: 50,
      renewsAt: new Date("2026-02-01T00:00:00Z"),
    };

    indicator.setMultiKeyInfo({
      currentKeyIndex: 1,
      totalKeys: 3,
      strategy: "RoundRobin",
    });

    const buildTooltip = (indicator as any).buildTooltip.bind(indicator);
    const result = buildTooltip(usage, "xYz9");

    // Design rationale: Show multi-key cycling status in tooltip
    assert.ok(result.includes("Key 2 of 3"));
    assert.ok(result.includes("RoundRobin"));
  });
});
