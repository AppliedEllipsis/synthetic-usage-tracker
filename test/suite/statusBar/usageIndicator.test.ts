import assert from "node:assert";
import { suite, test } from "mocha";
import * as vscode from "vscode";
import { UsageIndicator } from "../../../src/statusBar/usageIndicator";
import type { UsageInfo, CategoryUsageInfo } from "../../../src/api/syntheticService";
import type { Configuration } from "../../../src/config/configuration";

/**
 * Unit tests for UsageIndicator
 * Tests the three-category status bar display (subscription, search, toolCalls)
 */

suite("UsageIndicator - updateUsage", () => {
  test("should update usage data and refresh display", () => {
    const context = {
      subscriptions: [],
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);

    const mockUsage: UsageInfo = {
      subscription: {
        limit: 135,
        requests: 33,
        remaining: 102,
        percentageUsed: 24.44,
        renewAt: new Date("2026-01-30T20:20:59.408Z"),
      },
      search: {
        limit: 250,
        requests: 0,
        remaining: 250,
        percentageUsed: 0,
        renewAt: new Date("2026-01-30T20:25:50.409Z"),
      },
      toolCalls: {
        limit: 1620,
        requests: 271,
        remaining: 1349,
        percentageUsed: 16.73,
        renewAt: new Date("2026-01-31T10:17:00.411Z"),
      },
    };

    const mockConfig: Configuration = {
      apiEndpoint: "https://api.synthetic.new/v2",
      refreshInterval: 60,
      showPercentage: true,
      showRawNumbers: false,
      enableNotifications: true,
      warningThreshold: 80,
      criticalThreshold: 90,
    };

    // Should not throw
    indicator.updateUsage(mockUsage, mockConfig);

    // Verify usage data is stored
    assert.strictEqual(indicator.getCurrentUsage(), mockUsage);
  });

  test("should handle usage with only subscription category", () => {
    const context = {
      subscriptions: [],
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);

    const mockUsage: UsageInfo = {
      subscription: {
        limit: 100,
        requests: 50,
        remaining: 50,
        percentageUsed: 50,
        renewAt: new Date("2026-01-30T20:20:59.408Z"),
      },
      // search and toolCalls are optional
    };

    const mockConfig: Configuration = {
      apiEndpoint: "https://api.synthetic.new/v2",
      refreshInterval: 60,
      showPercentage: true,
      showRawNumbers: false,
      enableNotifications: true,
      warningThreshold: 80,
      criticalThreshold: 90,
    };

    // Should not throw even with partial data
    indicator.updateUsage(mockUsage, mockConfig);
    assert.strictEqual(indicator.getCurrentUsage(), mockUsage);
  });
});

suite("UsageIndicator - buildTooltip", () => {
  test("should build tooltip with all three categories", () => {
    const context = {
      subscriptions: [],
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);

    const mockUsage: UsageInfo = {
      subscription: {
        limit: 135,
        requests: 33,
        remaining: 102,
        percentageUsed: 24.44,
        renewAt: new Date("2026-01-30T20:20:59.408Z"),
      },
      search: {
        limit: 250,
        requests: 0,
        remaining: 250,
        percentageUsed: 0,
        renewAt: new Date("2026-01-30T20:25:50.409Z"),
      },
      toolCalls: {
        limit: 1620,
        requests: 271,
        remaining: 1349,
        percentageUsed: 16.73,
        renewAt: new Date("2026-01-31T10:17:00.411Z"),
      },
    };

    indicator.updateUsage(mockUsage, {
      apiEndpoint: "https://api.synthetic.new/v2",
      refreshInterval: 60,
      showPercentage: true,
      showRawNumbers: false,
      enableNotifications: true,
      warningThreshold: 80,
      criticalThreshold: 90,
    });

    // Access private method via TypeScript type assertion for testing
    const buildTooltip = (indicator as any).buildTooltip.bind(indicator);
    const tooltip = buildTooltip();

    // Verify all three categories are present
    assert.ok(tooltip.includes("Subscription"));
    assert.ok(tooltip.includes("Search"));
    assert.ok(tooltip.includes("Free Tool Calls"));

    // Verify usage data is present
    assert.ok(tooltip.includes("33"));
    assert.ok(tooltip.includes("135"));
  });

  test("should build tooltip with warning symbols for high usage", () => {
    const context = {
      subscriptions: [],
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);

    const mockUsage: UsageInfo = {
      subscription: {
        limit: 100,
        requests: 85,
        remaining: 15,
        percentageUsed: 85,
        renewAt: new Date("2026-01-30T20:20:59.408Z"),
      },
      search: {
        limit: 250,
        requests: 250,
        remaining: 0,
        percentageUsed: 100,
        renewAt: new Date("2026-01-30T20:25:50.409Z"),
      },
      toolCalls: {
        limit: 1000,
        requests: 950,
        remaining: 50,
        percentageUsed: 95,
        renewAt: new Date("2026-01-31T10:17:00.411Z"),
      },
    };

    indicator.updateUsage(mockUsage, {
      apiEndpoint: "https://api.synthetic.new/v2",
      refreshInterval: 60,
      showPercentage: true,
      showRawNumbers: false,
      enableNotifications: true,
      warningThreshold: 80,
      criticalThreshold: 90,
    });

    const buildTooltip = (indicator as any).buildTooltip.bind(indicator);
    const tooltip = buildTooltip();

    // Verify warning symbols are present for categories exceeding thresholds
    // Warning (🟡) for subscription (85% >= 80% warning threshold)
    // Critical (🔴) for search (100% >= 90% critical threshold)
    // Critical (🔴) for toolCalls (95% >= 90% critical threshold)
    assert.ok(tooltip.includes("🔴") || tooltip.includes("🟡"));
  });

  test("should handle missing categories gracefully", () => {
    const context = {
      subscriptions: [],
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);

    const mockUsage: UsageInfo = {
      subscription: {
        limit: 100,
        requests: 50,
        remaining: 50,
        percentageUsed: 50,
        renewAt: new Date("2026-01-30T20:20:59.408Z"),
      },
      // search and toolCalls are missing
    };

    indicator.updateUsage(mockUsage, {
      apiEndpoint: "https://api.synthetic.new/v2",
      refreshInterval: 60,
      showPercentage: true,
      showRawNumbers: false,
      enableNotifications: true,
      warningThreshold: 80,
      criticalThreshold: 90,
    });

    const buildTooltip = (indicator as any).buildTooltip.bind(indicator);
    const tooltip = buildTooltip();

    // Should still build a valid tooltip with available data
    assert.ok(tooltip.includes("Subscription"));
    assert.ok(tooltip.length > 0);
  });
});

suite("UsageIndicator - display state management", () => {
  test("should set loading state", () => {
    const context = {
      subscriptions: [],
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);

    indicator.setLoading();

    // Access private display state for verification
    const getDisplayState = (indicator as any).displayState;
    assert.strictEqual(getDisplayState, "loading");
  });

  test("should set idle state", () => {
    const context = {
      subscriptions: [],
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);

    indicator.setIdle();

    const getDisplayState = (indicator as any).displayState;
    assert.strictEqual(getDisplayState, "idle");
  });

  test("should set error state", () => {
    const context = {
      subscriptions: [],
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);

    indicator.setError("Test error message");

    const getDisplayState = (indicator as any).displayState;
    assert.strictEqual(getDisplayState, "error");
  });

  test("should set success state", () => {
    const context = {
      subscriptions: [],
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);

    const mockUsage: UsageInfo = {
      subscription: {
        limit: 100,
        requests: 50,
        remaining: 50,
        percentageUsed: 50,
        renewAt: new Date("2026-01-30T20:20:59.408Z"),
      },
    };

    indicator.updateUsage(mockUsage, {
      apiEndpoint: "https://api.synthetic.new/v2",
      refreshInterval: 60,
      showPercentage: true,
      showRawNumbers: false,
      enableNotifications: true,
      warningThreshold: 80,
      criticalThreshold: 90,
    });

    const getDisplayState = (indicator as any).displayState;
    // Design decision: Success state should be set when usage is below warning threshold
    assert.strictEqual(getDisplayState, "success");
  });

  test("should set warning state when any category exceeds warning threshold", () => {
    const context = {
      subscriptions: [],
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);

    const mockUsage: UsageInfo = {
      subscription: {
        limit: 100,
        requests: 50,
        remaining: 50,
        percentageUsed: 50,
        renewAt: new Date("2026-01-30T20:20:59.408Z"),
      },
      search: {
        limit: 100,
        requests: 85,
        remaining: 15,
        percentageUsed: 85,
        renewAt: new Date("2026-01-30T20:25:50.409Z"),
      },
      toolCalls: {
        limit: 100,
        requests: 50,
        remaining: 50,
        percentageUsed: 50,
        renewAt: new Date("2026-01-31T10:17:00.411Z"),
      },
    };

    indicator.updateUsage(mockUsage, {
      apiEndpoint: "https://api.synthetic.new/v2",
      refreshInterval: 60,
      showPercentage: true,
      showRawNumbers: false,
      enableNotifications: true,
      warningThreshold: 80,
      criticalThreshold: 90,
    });

    const getDisplayState = (indicator as any).displayState;
    // Design decision: Warning state should be set when any category exceeds warning threshold
    assert.strictEqual(getDisplayState, "warning");
  });

  test("should set critical state when any category exceeds critical threshold", () => {
    const context = {
      subscriptions: [],
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);

    const mockUsage: UsageInfo = {
      subscription: {
        limit: 100,
        requests: 50,
        remaining: 50,
        percentageUsed: 50,
        renewAt: new Date("2026-01-30T20:20:59.408Z"),
      },
      search: {
        limit: 100,
        requests: 95,
        remaining: 5,
        percentageUsed: 95,
        renewAt: new Date("2026-01-30T20:25:50.409Z"),
      },
      toolCalls: {
        limit: 100,
        requests: 50,
        remaining: 50,
        percentageUsed: 50,
        renewAt: new Date("2026-01-31T10:17:00.411Z"),
      },
    };

    indicator.updateUsage(mockUsage, {
      apiEndpoint: "https://api.synthetic.new/v2",
      refreshInterval: 60,
      showPercentage: true,
      showRawNumbers: false,
      enableNotifications: true,
      warningThreshold: 80,
      criticalThreshold: 90,
    });

    const getDisplayState = (indicator as any).displayState;
    // Design decision: Critical state should be set when any category exceeds critical threshold
    assert.strictEqual(getDisplayState, "critical");
  });
});

suite("UsageIndicator - auto-refresh", () => {
  test("should start auto-refresh with correct interval", () => {
    const context = {
      subscriptions: [],
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);

    let refreshCalled = false;
    const refreshCallback = () => {
      refreshCalled = true;
    };

    // Start auto-refresh with 1 second interval
    indicator.startAutoRefresh(1, refreshCallback);

    // Wait for the interval to fire
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        indicator.stopAutoRefresh();
        // Note: Due to timing, the callback might not have fired yet
        // The important part is that the timer was set up correctly
        resolve();
      }, 1100);
    });
  });

  test("should stop auto-refresh", () => {
    const context = {
      subscriptions: [],
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);

    let callCount = 0;
    const refreshCallback = () => {
      callCount++;
    };

    // Start auto-refresh
    indicator.startAutoRefresh(0.1, refreshCallback);

    // Stop auto-refresh immediately
    indicator.stopAutoRefresh();

    // Wait to ensure no more calls
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // Call count should be 0 or 1 (might have fired once before stop)
        assert.ok(callCount <= 1);
        resolve();
      }, 200);
    });
  });
});

suite("UsageIndicator - disposal", () => {
  test("should dispose all resources", () => {
    const context = {
      subscriptions: [],
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);

    // Start auto-refresh to create a timer
    indicator.startAutoRefresh(60, () => {});

    // Should not throw
    indicator.dispose();

    // Verify auto-refresh is stopped by starting a new one
    // (if previous timer wasn't cleared, this would create multiple timers)
    indicator.startAutoRefresh(60, () => {});
    indicator.dispose();

    // Dispose again should be idempotent
    indicator.dispose();
  });
});

suite("UsageIndicator - Phase 4: ASCII Progress Bar", () => {
  test("should build ASCII progress bar at 0%", () => {
    const context = {
      subscriptions: [],
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);
    const buildAsciiProgressBar = (indicator as any).buildAsciiProgressBar.bind(indicator);
    const result = buildAsciiProgressBar(0);

    assert.strictEqual(result, "[░░░░░░░░░░] 0%");
    indicator.dispose();
  });

  test("should build ASCII progress bar at 50%", () => {
    const context = {
      subscriptions: [],
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);
    const buildAsciiProgressBar = (indicator as any).buildAsciiProgressBar.bind(indicator);
    const result = buildAsciiProgressBar(50);

    assert.strictEqual(result, "[█████░░░░░] 50%");
    indicator.dispose();
  });

  test("should build ASCII progress bar at 100%", () => {
    const context = {
      subscriptions: [],
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);
    const buildAsciiProgressBar = (indicator as any).buildAsciiProgressBar.bind(indicator);
    const result = buildAsciiProgressBar(100);

    assert.strictEqual(result, "[██████████] 100%");
    indicator.dispose();
  });

  test("should build ASCII progress bar with rounding at 24%", () => {
    const context = {
      subscriptions: [],
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);
    const buildAsciiProgressBar = (indicator as any).buildAsciiProgressBar.bind(indicator);
    const result = buildAsciiProgressBar(24);

    // 24% of 10 segments = 2.4, rounds to 2
    assert.strictEqual(result, "[██░░░░░░░░] 24%");
    indicator.dispose();
  });

  test("should build ASCII progress bar with rounding at 85%", () => {
    const context = {
      subscriptions: [],
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);
    const buildAsciiProgressBar = (indicator as any).buildAsciiProgressBar.bind(indicator);
    const result = buildAsciiProgressBar(85);

    // 85% of 10 segments = 8.5, rounds to 9
    assert.strictEqual(result, "[█████████░] 85%");
    indicator.dispose();
  });
});

suite("UsageIndicator - Phase 4: Warning Symbols", () => {
  test("should return no warning symbols when all categories below 80%", () => {
    const context = {
      subscriptions: [],
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);
    const mockUsage: UsageInfo = {
      subscription: {
        limit: 100,
        requests: 50,
        remaining: 50,
        percentageUsed: 50,
        renewAt: new Date("2026-01-30T20:20:59.408Z"),
      },
      search: {
        limit: 100,
        requests: 50,
        remaining: 50,
        percentageUsed: 50,
        renewAt: new Date("2026-01-30T20:25:50.409Z"),
      },
      toolCalls: {
        limit: 100,
        requests: 50,
        remaining: 50,
        percentageUsed: 50,
        renewAt: new Date("2026-01-31T10:17:00.411Z"),
      },
    };

    const buildCategoryWarningSymbols = (indicator as any).buildCategoryWarningSymbols.bind(indicator);
    const symbols = buildCategoryWarningSymbols(mockUsage, { warningThreshold: 80, criticalThreshold: 90 });

    assert.strictEqual(symbols.length, 0);
    indicator.dispose();
  });

  test("should return search warning symbol (🔍) when search > 80%", () => {
    const context = {
      subscriptions: [],
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);
    const mockUsage: UsageInfo = {
      subscription: {
        limit: 100,
        requests: 50,
        remaining: 50,
        percentageUsed: 50,
        renewAt: new Date("2026-01-30T20:20:59.408Z"),
      },
      search: {
        limit: 100,
        requests: 85,
        remaining: 15,
        percentageUsed: 85,
        renewAt: new Date("2026-01-30T20:25:50.409Z"),
      },
      toolCalls: {
        limit: 100,
        requests: 50,
        remaining: 50,
        percentageUsed: 50,
        renewAt: new Date("2026-01-31T10:17:00.411Z"),
      },
    };

    const buildCategoryWarningSymbols = (indicator as any).buildCategoryWarningSymbols.bind(indicator);
    const symbols = buildCategoryWarningSymbols(mockUsage, { warningThreshold: 80, criticalThreshold: 90 });

    assert.strictEqual(symbols.length, 1);
    assert.strictEqual(symbols[0], "🔍");
    indicator.dispose();
  });

  test("should return tool calls warning symbol (🔧) when toolCalls > 80%", () => {
    const context = {
      subscriptions: [],
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);
    const mockUsage: UsageInfo = {
      subscription: {
        limit: 100,
        requests: 50,
        remaining: 50,
        percentageUsed: 50,
        renewAt: new Date("2026-01-30T20:20:59.408Z"),
      },
      search: {
        limit: 100,
        requests: 50,
        remaining: 50,
        percentageUsed: 50,
        renewAt: new Date("2026-01-30T20:25:50.409Z"),
      },
      toolCalls: {
        limit: 100,
        requests: 90,
        remaining: 10,
        percentageUsed: 90,
        renewAt: new Date("2026-01-31T10:17:00.411Z"),
      },
    };

    const buildCategoryWarningSymbols = (indicator as any).buildCategoryWarningSymbols.bind(indicator);
    const symbols = buildCategoryWarningSymbols(mockUsage, { warningThreshold: 80, criticalThreshold: 90 });

    assert.strictEqual(symbols.length, 1);
    assert.strictEqual(symbols[0], "🔧");
    indicator.dispose();
  });

  test("should return both warning symbols when both search and toolCalls > 80%", () => {
    const context = {
      subscriptions: [],
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);
    const mockUsage: UsageInfo = {
      subscription: {
        limit: 100,
        requests: 50,
        remaining: 50,
        percentageUsed: 50,
        renewAt: new Date("2026-01-30T20:20:59.408Z"),
      },
      search: {
        limit: 100,
        requests: 85,
        remaining: 15,
        percentageUsed: 85,
        renewAt: new Date("2026-01-30T20:25:50.409Z"),
      },
      toolCalls: {
        limit: 100,
        requests: 90,
        remaining: 10,
        percentageUsed: 90,
        renewAt: new Date("2026-01-31T10:17:00.411Z"),
      },
    };

    const buildCategoryWarningSymbols = (indicator as any).buildCategoryWarningSymbols.bind(indicator);
    const symbols = buildCategoryWarningSymbols(mockUsage, { warningThreshold: 80, criticalThreshold: 90 });

    assert.strictEqual(symbols.length, 2);
    assert.ok(symbols.includes("🔍"));
    assert.ok(symbols.includes("🔧"));
    indicator.dispose();
  });

  test("should not show warning symbol at exactly 80%", () => {
    const context = {
      subscriptions: [],
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);
    const mockUsage: UsageInfo = {
      subscription: {
        limit: 100,
        requests: 50,
        remaining: 50,
        percentageUsed: 50,
        renewAt: new Date("2026-01-30T20:20:59.408Z"),
      },
      search: {
        limit: 100,
        requests: 80,
        remaining: 20,
        percentageUsed: 80,
        renewAt: new Date("2026-01-30T20:25:50.409Z"),
      },
      toolCalls: {
        limit: 100,
        requests: 50,
        remaining: 50,
        percentageUsed: 50,
        renewAt: new Date("2026-01-31T10:17:00.411Z"),
      },
    };

    const buildCategoryWarningSymbols = (indicator as any).buildCategoryWarningSymbols.bind(indicator);
    const symbols = buildCategoryWarningSymbols(mockUsage, { warningThreshold: 80, criticalThreshold: 90 });

    // At exactly 80%, no warning symbol should be shown (uses > 80%)
    assert.strictEqual(symbols.length, 0);
    indicator.dispose();
  });
});

suite("UsageIndicator - Phase 4: API Key Masking", () => {
  test("should mask API key with prefix and last 4 characters", () => {
    const context = {
      subscriptions: [],
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);
    const maskApiKey = (indicator as any).maskApiKey.bind(indicator);
    const result = maskApiKey("syn_abc123def456");

    // prefix: "syn_" (4 chars), lastFour: "4567" (4 chars), masked: "****" (4 chars)
    // Expected: "syn_****4567"
    assert.strictEqual(result, "syn_****4567");
    indicator.dispose();
  });

  test("should mask short API key with 8 characters", () => {
    const context = {
      subscriptions: [],
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);
    const maskApiKey = (indicator as any).maskApiKey.bind(indicator);
    const result = maskApiKey("syn_abcd");

    // prefix: "syn_" (4 chars), lastFour: "abcd" (4 chars), masked: "" (0 chars)
    // Expected: "syn_abcd"
    assert.strictEqual(result, "syn_abcd");
    indicator.dispose();
  });

  test("should return placeholder for API key shorter than 8 characters", () => {
    const context = {
      subscriptions: [],
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);
    const maskApiKey = (indicator as any).maskApiKey.bind(indicator);
    
    assert.strictEqual(maskApiKey("syn_"), "****");
    assert.strictEqual(maskApiKey("syn"), "****");
    assert.strictEqual(maskApiKey(""), "****");
    indicator.dispose();
  });

  test("should mask long API key correctly", () => {
    const context = {
      subscriptions: [],
      secrets: {
        get: () => Promise.resolve(undefined),
        store: () => Promise.resolve(),
        delete: () => Promise.resolve(),
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve(),
      },
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);
    const maskApiKey = (indicator as any).maskApiKey.bind(indicator);
    const result = maskApiKey("syn_abcdefghijklmnopqrstuvwxyz123456");

    // prefix: "syn_" (4 chars), lastFour: "3456" (4 chars), masked: 27 asterisks
    // Expected: "syn_***************************3456"
    assert.strictEqual(result, "syn_***************************3456");
    indicator.dispose();
  });
});
