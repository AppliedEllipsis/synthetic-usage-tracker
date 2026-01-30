/**
 * KeyCyclingService - Orchestrates key cycling logic for multi-key management
 *
 * Design decision: This service acts as the coordinator between the KeyManager and the
 * SyntheticService. It implements all four cycling strategies (RoundRobin, LeastUsed,
 * Random, Priority) and handles health-based key selection.
 *
 * The service maintains a cycling lock to prevent concurrent cycling operations across
 * multiple API calls, which could lead to race conditions where different keys are
 * selected simultaneously.
 */

import type { ApiError } from "./syntheticService";
import type {
  ApiKeyEntry,
  ActivationReason,
  CyclingStrategy,
  KeyCyclingState,
  CyclingConfig,
  KeySelectionResult,
  HealthCheckResult,
  QuotaInfo,
} from "../types/keys";

// Import enums as values since they are used in switch statements
import { ActivationReason as ActivationReasonEnum, CyclingStrategy as CyclingStrategyEnum } from "../types/keys";

/**
 * Interface for key statistics tracking
 */
interface KeyStatistics {
  usageCount: number;
  quota: QuotaInfo | null;
  consecutiveFailures: number;
  totalFailures: number;
  failures: FailureRecord[];
  activationHistory: ActivationEntry[];
  lastSuccessTimestamp: Date | null;
  lastFailureTimestamp: Date | null;
  lastActivatedTimestamp: Date | null;
}

/**
 * Record of a key failure
 */
interface FailureRecord {
  timestamp: number;
  errorType: string;
  message: string;
}

/**
 * Record of a key activation
 */
interface ActivationEntry {
  timestamp: number;
  keyIndex: number;
  reason: ActivationReason;
}

/**
 * Extended cycling config with additional properties for health checking
 */
interface ExtendedCyclingConfig extends CyclingConfig {
  apiEndpoint: string;
  failureWindow: number;
  maxFailuresBeforeUnhealthy: number;
  healthyThreshold: number;
  warningThreshold: number;
  autoCycle: boolean;
  maxHistoryLength: number;
}

/**
 * Health factor with weight
 */
interface HealthFactorWithWeight {
  name: string;
  impact: number;
  weight: number;
  description: string;
}

/**
 * Health check result with key information
 */
interface HealthCheckResultWithKey extends HealthCheckResult {
  key: ApiKeyEntry;
}

/**
 * Key selection result with success flag
 */
interface KeySelectionResultExtended extends KeySelectionResult {
  success: boolean;
}

/**
 * Default extended cycling configuration
 */
const DEFAULT_EXTENDED_CONFIG: ExtendedCyclingConfig = {
  enabled: true,
  strategy: CyclingStrategyEnum.RoundRobin,
  cycleThreshold: 90,
  maxKeyFailures: 3,
  skipUnhealthyKeys: true,
  cycleOnQuotaExceeded: false,
  apiEndpoint: "https://api.synthetic.new/v2",
  failureWindow: 5 * 60 * 1000, // 5 minutes
  maxFailuresBeforeUnhealthy: 3,
  healthyThreshold: 70,
  warningThreshold: 50,
  autoCycle: true,
  maxHistoryLength: 100,
};

/**
 * Service for orchestrating key cycling logic
 */
export class KeyCyclingService {
  private cyclingLock: boolean = false;

  constructor(
    private getKeys: () => ApiKeyEntry[],
    private getCyclingState: () => KeyCyclingState,
    private updateCyclingState: (state: KeyCyclingState) => Promise<void>,
    private setActiveKeyByIndex: (index: number, reason: ActivationReason) => Promise<void>,
    private getKeyStatistics: (keyId: string) => KeyStatistics | null,
    private updateKeyStatistics: (keyId: string, stats: Partial<KeyStatistics>) => Promise<void>,
    private config: ExtendedCyclingConfig = DEFAULT_EXTENDED_CONFIG,
  ) {}

  /**
   * Select the best key based on the configured strategy
   *
   * Design decision: This method evaluates all available keys and selects the best one
   * according to the configured strategy. It respects the skipUnhealthyKeys setting and
   * returns the first healthy key if skipping is enabled.
   *
   * @param reason The reason for key selection
   * @returns The selected key entry and its index
   */
  async selectKey(reason: ActivationReason): Promise<KeySelectionResultExtended> {
    const keys = this.getKeys();

    if (keys.length === 0) {
      return {
        success: false,
        entry: {} as ApiKeyEntry,
        index: -1,
        reason,
        didCycle: false,
      };
    }

    if (keys.length === 1) {
      return {
        success: true,
        entry: keys[0]!,
        index: 0,
        reason,
        didCycle: false,
      };
    }

    // Get current active key index
    const state = this.getCyclingState();
    const currentIndex = state.activeIndex;

    // Select candidate keys based on strategy
    let candidateIndex = -1;

    switch (this.config.strategy) {
      case CyclingStrategyEnum.RoundRobin:
        candidateIndex = this.selectRoundRobin(currentIndex, keys.length);
        break;
      case CyclingStrategyEnum.LeastUsed:
        candidateIndex = await this.selectLeastUsed(keys);
        break;
      case CyclingStrategyEnum.Random:
        candidateIndex = this.selectRandom(keys.length);
        break;
      case CyclingStrategyEnum.Priority:
        candidateIndex = this.selectByPriority(keys);
        break;
      default:
        candidateIndex = this.selectRoundRobin(currentIndex, keys.length);
    }

    // If configured to skip unhealthy keys, find the first healthy one
    if (this.config.skipUnhealthyKeys) {
      const healthyIndex = await this.findFirstHealthyKey(keys);
      if (healthyIndex !== -1) {
        candidateIndex = healthyIndex;
      }
    }

    // If no candidate found, fall back to first key
    if (candidateIndex === -1) {
      candidateIndex = 0;
    }

    return {
      success: true,
      entry: keys[candidateIndex]!,
      index: candidateIndex,
      reason,
      didCycle: candidateIndex !== currentIndex,
    };
  }

  /**
   * Cycle to the next key in the sequence
   *
   * Design decision: This method uses a lock to prevent concurrent cycling operations.
   * Multiple cycling attempts (e.g., from multiple API calls failing simultaneously)
   * could cause race conditions where different keys are selected at the same time.
   *
   * @param reason The reason for cycling
   * @returns The new active key index, or -1 if cycling failed
   */
  async cycleKey(reason: ActivationReason): Promise<number> {
    if (this.cyclingLock) {
      console.warn("Cycling operation already in progress, skipping");
      return -1;
    }

    this.cyclingLock = true;

    try {
      const keys = this.getKeys();
      if (keys.length === 0) {
        console.warn("No keys available for cycling");
        return -1;
      }

      if (keys.length === 1) {
        console.warn("Only one key available, cannot cycle");
        return -1;
      }

      // Select next key based on strategy
      const selection = await this.selectKey(reason);

      if (!selection.success || selection.index === -1) {
        console.warn("Failed to select key for cycling");
        return -1;
      }

      // Set the new active key
      await this.setActiveKeyByIndex(selection.index, reason);

      console.log(`Cycled to key at index ${selection.index} (reason: ${reason})`);

      return selection.index;
    } finally {
      this.cyclingLock = false;
    }
  }

  /**
   * Check the health of a specific key
   *
   * Design rationale: Health is calculated based on multiple factors to provide a
   * comprehensive assessment of key viability. Each factor contributes to the overall
   * health score, allowing the extension to make informed decisions about key selection.
   *
   * @param key The key to check
   * @returns The health check result
   */
  async checkHealth(key: ApiKeyEntry): Promise<HealthCheckResultWithKey> {
    const factors: HealthFactorWithWeight[] = [];
    let totalScore = 100;

    // Factor 1: Recent failures (40% weight)
    const recentFailures = this.countRecentFailures(key);
    const failureScore = Math.max(0, 100 - (recentFailures * 20));
    factors.push({
      name: "Recent Failures",
      impact: failureScore - 100,
      weight: 40,
      description: `Recent failures in the last ${this.config.failureWindow}ms`,
    });
    totalScore += (failureScore - 100) * 0.4;

    // Factor 2: Quota availability (30% weight)
    const stats = this.getKeyStatistics(key.id);
    if (stats?.quota) {
      const quotaScore = stats.quota.percentageUsed > 0 ? 100 - stats.quota.percentageUsed : 100;
      factors.push({
        name: "Quota Availability",
        impact: quotaScore - 100,
        weight: 30,
        description: `Quota usage: ${stats.quota.percentageUsed}%`,
      });
      totalScore += (quotaScore - 100) * 0.3;
    }

    // Factor 3: Key age (10% weight)
    const ageScore = this.calculateAgeScore(key.addedAt);
    factors.push({
      name: "Key Age",
      impact: ageScore - 100,
      weight: 10,
      description: `Key added: ${new Date(key.addedAt).toISOString()}`,
    });
    totalScore += (ageScore - 100) * 0.1;

    // Factor 4: Activation frequency (20% weight)
    const frequencyScore = this.calculateFrequencyScore(stats);
    factors.push({
      name: "Activation Frequency",
      impact: frequencyScore - 100,
      weight: 20,
      description: "How frequently the key has been activated",
    });
    totalScore += (frequencyScore - 100) * 0.2;

    // Normalize score to 0-100 range
    totalScore = Math.max(0, Math.min(100, totalScore));

    const isHealthy = totalScore >= this.config.healthyThreshold;
    // isWarning is calculated but not currently used
    const isWarning = totalScore >= this.config.warningThreshold && totalScore < this.config.healthyThreshold;

    return {
      key,
      score: totalScore,
      isHealthy,
      factors: factors.map((f) => ({
        name: f.name,
        impact: f.impact,
        description: f.description,
      })),
    };
  }

  /**
   * Check the health of all keys
   *
   * @returns Array of health check results for all keys
   */
  async checkAllKeysHealth(): Promise<HealthCheckResultWithKey[]> {
    const keys = this.getKeys();
    const results: HealthCheckResultWithKey[] = [];

    for (const key of keys) {
      const health = await this.checkHealth(key);
      results.push(health);
    }

    return results;
  }

  /**
   * Record a failure for the active key
   *
   * Design decision: Records are stored with timestamps to allow time-based filtering.
   * The consecutive failure counter is incremented and reset on success to track
   * transient vs persistent failures.
   *
   * @param error The error that occurred
   */
  async recordFailure(error: ApiError): Promise<void> {
    const keys = this.getKeys();
    const state = this.getCyclingState();

    if (state.activeIndex === -1 || state.activeIndex >= keys.length) {
      console.warn("No active key to record failure for");
      return;
    }

    const activeKey = keys[state.activeIndex]!;
    const stats = this.getKeyStatistics(activeKey.id);

    if (!stats) {
      console.warn("No statistics found for active key");
      return;
    }

    // Create failure record
    const failureRecord: FailureRecord = {
      timestamp: Date.now(),
      errorType: error.type,
      message: error.message,
    };

    // Update statistics
    const updatedStats: Partial<KeyStatistics> = {
      consecutiveFailures: stats.consecutiveFailures + 1,
      totalFailures: stats.totalFailures + 1,
      lastFailureTimestamp: new Date(),
      failures: [...stats.failures, failureRecord],
    };

    // Trim failure history
    if (updatedStats.failures && updatedStats.failures.length > this.config.maxHistoryLength) {
      updatedStats.failures = updatedStats.failures.slice(-this.config.maxHistoryLength);
    }

    await this.updateKeyStatistics(activeKey.id, updatedStats);

    console.log(`Recorded failure for key ${activeKey.id}: ${error.type}`);
  }

  /**
   * Record a successful API call for the active key
   *
   * Design decision: Successes reset the consecutive failure counter, allowing the
   * key to recover from transient failures. This prevents temporary network issues
   * from permanently marking a key as unhealthy.
   */
  async recordSuccess(): Promise<void> {
    const keys = this.getKeys();
    const state = this.getCyclingState();

    if (state.activeIndex === -1 || state.activeIndex >= keys.length) {
      console.warn("No active key to record success for");
      return;
    }

    const activeKey = keys[state.activeIndex]!;
    const stats = this.getKeyStatistics(activeKey.id);

    if (!stats) {
      console.warn("No statistics found for active key");
      return;
    }

    // Update statistics
    const updatedStats: Partial<KeyStatistics> = {
      usageCount: stats.usageCount + 1,
      consecutiveFailures: 0,
      lastSuccessTimestamp: new Date(),
    };

    await this.updateKeyStatistics(activeKey.id, updatedStats);

    console.log(`Recorded success for key ${activeKey.id}`);
  }

  /**
   * Record a key activation
   *
   * @param keyIndex The index of the key being activated
   * @param reason The reason for activation
   */
  async recordActivation(keyIndex: number, reason: ActivationReason): Promise<void> {
    const keys = this.getKeys();

    if (keyIndex === -1 || keyIndex >= keys.length) {
      console.warn("Invalid key index for activation");
      return;
    }

    const key = keys[keyIndex]!;
    const stats = this.getKeyStatistics(key.id);

    if (!stats) {
      console.warn("No statistics found for key");
      return;
    }

    // Create activation record
    const activationRecord: ActivationEntry = {
      timestamp: Date.now(),
      keyIndex,
      reason,
    };

    // Update statistics
    const updatedStats: Partial<KeyStatistics> = {
      lastActivatedTimestamp: new Date(),
      activationHistory: [...stats.activationHistory, activationRecord],
    };

    // Trim activation history
    if (updatedStats.activationHistory && updatedStats.activationHistory.length > this.config.maxHistoryLength) {
      updatedStats.activationHistory = updatedStats.activationHistory.slice(-this.config.maxHistoryLength);
    }

    await this.updateKeyStatistics(key.id, updatedStats);

    console.log(`Recorded activation for key ${key.id} (reason: ${reason})`);
  }

  /**
   * Check if automatic cycling should occur
   *
   * Design decision: Automatic cycling is based on multiple conditions to avoid
   * unnecessary key switches. The extension only cycles when there's a clear
   * reason (quota exceeded, unhealthy key, or excessive failures).
   *
   * @returns Whether automatic cycling should occur
   */
  async shouldAutoCycle(): Promise<boolean> {
    if (!this.config.autoCycle) {
      return false;
    }

    const keys = this.getKeys();
    const state = this.getCyclingState();

    if (keys.length <= 1) {
      return false;
    }

    if (state.activeIndex === -1 || state.activeIndex >= keys.length) {
      return false;
    }

    const activeKey = keys[state.activeIndex]!;
    const stats = this.getKeyStatistics(activeKey.id);

    if (!stats) {
      return false;
    }

    // Check if quota exceeded
    if (this.config.cycleOnQuotaExceeded && stats.quota?.percentageUsed && stats.quota.percentageUsed >= this.config.cycleThreshold) {
      return true;
    }

    // Check if key is unhealthy
    const health = await this.checkHealth(activeKey);
    if (!health.isHealthy && this.config.skipUnhealthyKeys) {
      return true;
    }

    // Check if consecutive failures exceed threshold
    if (stats.consecutiveFailures >= this.config.maxKeyFailures) {
      return true;
    }

    return false;
  }

  /**
   * Automatically cycle to the next key if conditions are met
   *
   * @returns The new active key index, or -1 if no cycling occurred
   */
  async autoCycleIfNeeded(): Promise<number> {
    if (!(await this.shouldAutoCycle())) {
      return -1;
    }

    return await this.cycleKey(ActivationReasonEnum.AutomaticThreshold);
  }

  // Private helper methods

  /**
   * Select the next key using round-robin strategy
   */
  private selectRoundRobin(currentIndex: number, keyCount: number): number {
    if (currentIndex === -1) {
      return 0;
    }
    return (currentIndex + 1) % keyCount;
  }

  /**
   * Select the key with the least usage
   */
  private async selectLeastUsed(keys: ApiKeyEntry[]): Promise<number> {
    let minUsage = Infinity;
    let selectedIndex = 0;

    for (let i = 0; i < keys.length; i++) {
      const stats = this.getKeyStatistics(keys[i]!.id);
      const usage = stats?.usageCount ?? 0;

      if (usage < minUsage) {
        minUsage = usage;
        selectedIndex = i;
      }
    }

    return selectedIndex;
  }

  /**
   * Select a random key
   */
  private selectRandom(keyCount: number): number {
    return Math.floor(Math.random() * keyCount);
  }

  /**
   * Select a key based on priority order
   */
  private selectByPriority(keys: ApiKeyEntry[]): number {
    // Sort keys by priority (higher priority first)
    const sortedKeys = [...keys].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    return keys.indexOf(sortedKeys[0]!);
  }

  /**
   * Find the first healthy key
   */
  private async findFirstHealthyKey(keys: ApiKeyEntry[]): Promise<number> {
    for (let i = 0; i < keys.length; i++) {
      const health = await this.checkHealth(keys[i]!);
      if (health.isHealthy) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Count recent failures for a key
   */
  private countRecentFailures(key: ApiKeyEntry): number {
    const stats = this.getKeyStatistics(key.id);
    if (!stats) {
      return 0;
    }

    const now = Date.now();
    const recentFailures = stats.failures.filter(
      (f) => f.timestamp > now - this.config.failureWindow,
    );

    return recentFailures.length;
  }

  /**
   * Calculate age score for a key
   */
  private calculateAgeScore(addedAt: number): number {
    const age = Date.now() - addedAt;
    const oneDay = 24 * 60 * 60 * 1000;

    // Newer keys get higher scores
    if (age < oneDay) {
      return 100;
    } else if (age < 7 * oneDay) {
      return 80;
    } else if (age < 30 * oneDay) {
      return 60;
    } else {
      return 40;
    }
  }

  /**
   * Calculate frequency score based on activation history
   */
  private calculateFrequencyScore(stats: KeyStatistics | null): number {
    if (!stats || stats.activationHistory.length === 0) {
      return 100;
    }

    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const recentActivations = stats.activationHistory.filter(
      (a) => a.timestamp > now - oneHour,
    );

    // Fewer recent activations = higher score (less used)
    if (recentActivations.length === 0) {
      return 100;
    } else if (recentActivations.length <= 5) {
      return 80;
    } else if (recentActivations.length <= 10) {
      return 60;
    } else {
      return 40;
    }
  }
}
