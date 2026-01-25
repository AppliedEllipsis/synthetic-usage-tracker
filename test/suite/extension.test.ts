import * as vscode from "vscode";
import * as assert from "assert";
import { ConfigurationManager } from "../../src/config/configuration";
import { SyntheticService, ApiError, ApiErrorType } from "../../src/api/syntheticService";
import { UsageIndicator } from "../../src/statusBar/usageIndicator";

suite("Synthetic Usage Tracker Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("ConfigurationManager should be created", () => {
    const context = {
      secrets: {
        get: async () => undefined,
        store: async () => undefined,
        delete: async () => undefined,
      },
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;

    const configManager = new ConfigurationManager(context);
    assert.ok(configManager);
    configManager.dispose();
  });

  test("ConfigurationManager should get config", () => {
    const context = {
      secrets: {
        get: async () => undefined,
        store: async () => undefined,
        delete: async () => undefined,
      },
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;

    const configManager = new ConfigurationManager(context);
    const config = configManager.getConfig();
    assert.ok(config);
    assert.strictEqual(typeof config.refreshInterval, "number");
    assert.strictEqual(config.refreshInterval, 60);
    configManager.dispose();
  });

  test("SyntheticService should validate API key", () => {
    assert.strictEqual(SyntheticService.validateApiKey("syn_123456"), true);
    assert.strictEqual(SyntheticService.validateApiKey("api_123456"), false);
    assert.strictEqual(SyntheticService.validateApiKey(""), false);
  });

  test("SyntheticService should be created", () => {
    const service = new SyntheticService("syn_test_key");
    assert.ok(service);
  });

  test("ApiError should be created with correct properties", () => {
    const error = new ApiError(ApiErrorType.Network, "Test error");
    assert.strictEqual(error.type, ApiErrorType.Network);
    assert.strictEqual(error.message, "Test error");
    assert.strictEqual(error.name, "ApiError");
  });

  test("UsageIndicator should be created", () => {
    const context = {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);
    assert.ok(indicator);
    indicator.dispose();
  });

  test("UsageIndicator should handle loading state", () => {
    const context = {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);
    indicator.setLoading();
    indicator.dispose();
  });

  test("UsageIndicator should handle error state", () => {
    const context = {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);
    indicator.setError("Test error");
    indicator.dispose();
  });

  test("UsageIndicator should handle idle state", () => {
    const context = {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);
    indicator.setIdle();
    indicator.dispose();
  });

  test("UsageIndicator should update usage", () => {
    const context = {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;

    const indicator = new UsageIndicator(context);
    const usage = {
      limit: 100,
      requests: 50,
      remaining: 50,
      percentageUsed: 50,
      renewsAt: new Date(),
      renewsAtString: "2024-01-01T00:00:00.000Z",
    };

    indicator.updateUsage(usage, {
      showPercentage: true,
      showRawNumbers: false,
      warningThreshold: 80,
      criticalThreshold: 90,
      enableNotifications: false,
    });

    const currentUsage = indicator.getCurrentUsage();
    assert.ok(currentUsage);
    assert.strictEqual(currentUsage.requests, 50);
    indicator.dispose();
  });
});
