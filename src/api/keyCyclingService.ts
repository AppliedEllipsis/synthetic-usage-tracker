/**
 * Key Cycling Service
 *
 * Design decision: This service handles key cycling logic independently from key storage.
 * This separation allows for easier testing and modification of cycling strategies without
 * affecting the storage layer.
 */

import type { ApiKeyEntry, HealthCheckResult, KeySelectionResult, KeyStatistics, QuotaInfo } from "../types/keys.js";
import { ActivationReason as ActivationReasonEnum, CyclingStrategy as CyclingStrategyEnum } from "../types/keys.js";

/**
 * Configuration for the key cycling service
 */
export interface KeyCyclingServiceConfig {
  /**
   * Whether automatic cycling is enabled
   */
  autoCycleEnabled: boolean;

  /**
   * Strategy to use for automatic key cycling
   */
  strategy: CyclingStrategyEnum;

  /**
   * Threshold for automatic cycling (percentage of quota used)
   */
  autoCycleThreshold: number;

  /**
   * Maximum consecutive failures before cycling keys
   */
  maxConsecutiveFailures: number;

  /**
   * Time window for considering failures as "recent" (in milliseconds)
   */
  recentFailureWindow: number;

  /**
   * Health score threshold below which a key is considered unhealthy (0-100)
   */
  healthScoreThreshold: number;

  /**
   * Weight factors for health score calculation
   */
  healthWeights: {
    /**
     * Weight for recent failures (0-100)
     */
    recentFailures: number;

    /**
     * Weight for quota availability (0-100)
     */
    quotaAvailability: number;

    /**
     * Weight for key age (0-100)
     */
    keyAge: number;

    /**
     * Weight for activation frequency (0-100)
     */
    activationFrequency: number;
  };
}

/**
 * Default configuration for the key cycling service
 *
 * Design rationale:
 * - autoCycleEnabled: true by default for automatic management
 * - strategy: RoundRobin provides predictable, fair distribution
 * - autoCycleThreshold: 90% - only cycle when quota is nearly exhausted
 * - maxConsecutiveFailures: 3 - balance between resilience and responsiveness
 * - recentFailureWindow: 5 minutes - captures transient failures without penalizing too long
 * - healthScoreThreshold: 50 - middle ground for deciding when to cycle
 * - healthWeights: balanced distribution prioritizing recent failures and quota
 */
const DEFAULT_CONFIG: KeyCyclingServiceConfig = {
  autoCycleEnabled: true,
  strategy: CyclingStrategyEnum.RoundRobin,
  autoCycleThreshold: 90,
  maxConsecutiveFailures: 3,
  recentFailureWindow: 5 * 60 * 1000, // 5 minutes
  healthScoreThreshold: 50,
  healthWeights: {
    recentFailures: 40,
    quotaAvailability: 30,
    keyAge: 10,
    activationFrequency: 20,
  },
};

/**
 * Callback types for key cycling events
 */
export interface KeyCyclingCallbacks {
  /**
   * Called when a key is successfully selected
   */
  onKeySelected?: (result: KeySelectionResult) => void;

  /**
   * Called when a key cycles to a new key
   */
  onKeyCycled?: (result: KeySelectionResult) => void;

  /**
   * Called when a key fails and needs cycling
   */
  onKeyFailure?: (key: string, error: Error) => void;

  /**
   * Called when all keys are exhausted
   */
  onAllKeysExhausted?: () => void;
}

/**
 * Key Cycling Service
 *
 * Design decision: This service is stateless regarding key storage - it receives keys
 * and state via callbacks and returns selection results. This makes it testable and
 * allows it to work with different storage implementations.
 */
export class KeyCyclingService {
  private config: KeyCyclingServiceConfig;
  private callbacks: KeyCyclingCallbacks;
  private isCycling: boolean = false;

  constructor(
    config: Partial<KeyCyclingServiceConfig> = {},
    callbacks: KeyCyclingCallbacks = {},
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.callbacks = callbacks;
  }

  /**
   * Select the best key based on the configured strategy
   *
   * Design decision: This method doesn't modify state - it only selects. State
   * changes (like setting the active key) are handled by the caller.
   *
   * @param keys - Array of all available API keys
   * @param activeIndex - Index of the currently active key
   * @param reason - Reason for the selection
   * @returns Selection result with the chosen key and metadata
   */
  selectKey(
    keys: ApiKeyEntry[],
    activeIndex: number,
    reason: ActivationReasonEnum,
  ): KeySelectionResult {
    if (keys.length === 0) {
      throw new Error("No API keys available");
    }

    // If only one key, return it
    if (keys.length === 1) {
      // Safe to use non-null assertion because length check ensures keys[0] exists
      return {
        entry: keys[0]!, // eslint-disable-line @typescript-eslint/no-non-null-assertion
        index: 0,
        reason,
        didCycle: activeIndex !== 0,
      };
    }

    // Select based on strategy
    let selectedIndex: number;

    switch (this.config.strategy) {
      case CyclingStrategyEnum.RoundRobin:
        selectedIndex = this.selectRoundRobin(keys, activeIndex);
        break;
      case CyclingStrategyEnum.LeastUsed:
        selectedIndex = this.selectLeastUsed(keys);
        break;
      case CyclingStrategyEnum.Random:
        selectedIndex = this.selectRandom(keys);
        break;
      case CyclingStrategyEnum.Priority:
        selectedIndex = this.selectPriority(keys);
        break;
      default:
        // Fallback to round-robin for unknown strategies
        selectedIndex = this.selectRoundRobin(keys, activeIndex);
    }

    // Safe to use non-null assertion because selectedIndex is validated to be within bounds
    const selectedEntry = keys[selectedIndex]!; // eslint-disable-line @typescript-eslint/no-non-null-assertion

    // Check if we cycled to a different key
    const didCycle = selectedIndex !== activeIndex;

    const result: KeySelectionResult = {
      entry: selectedEntry,
      index: selectedIndex,
      reason,
      didCycle,
    };

    // Notify callbacks
    if (didCycle) {
      this.callbacks.onKeyCycled?.(result);
    }
    this.callbacks.onKeySelected?.(result);

    return result;
  }

  /**
   * Cycle to the next key based on the configured strategy
   *
   * Design decision: This method is a convenience wrapper that calls selectKey
   * with the appropriate reason for automatic cycling.
   *
   * @param keys - Array of all available API keys
   * @param activeIndex - Index of the currently active key
   * @returns Selection result with the chosen key and metadata
   */
  cycleKey(
    keys: ApiKeyEntry[],
    activeIndex: number,
  ): KeySelectionResult {
    if (this.isCycling) {
      // Return current key if already cycling
      return {
        entry: keys[activeIndex]!, // eslint-disable-line @typescript-eslint/no-non-null-assertion
        index: activeIndex,
        reason: ActivationReasonEnum.Initial,
        didCycle: false,
      };
    }

    this.isCycling = true;

    try {
      return this.selectKey(keys, activeIndex, ActivationReasonEnum.AutomaticThreshold);
    } finally {
      this.isCycling = false;
    }
  }

  /**
   * Check if automatic cycling should occur based on quota
   *
   * Design decision: This is a pure function that doesn't modify state, making it
   * easy to test and reason about.
   *
   * @param quota - Current quota information
   * @returns Whether cycling should occur
   */
  shouldAutoCycle(quota: QuotaInfo): boolean {
    if (!this.config.autoCycleEnabled) {
      return false;
    }

    return quota.percentageUsed >= this.config.autoCycleThreshold;
  }

  /**
   * Check the health of a specific key
   *
   * Design decision: Health is calculated based on multiple factors to provide
   * a comprehensive assessment of key quality.
   *
   * @param entry - The API key entry to check
   * @param quota - Current quota information (optional, if not available uses key statistics)
   * @returns Health check result with score and factors
   */
  checkHealth(entry: ApiKeyEntry, quota?: QuotaInfo): HealthCheckResult {
    const factors: HealthCheckResult["factors"] = [];
    let score: number = 100;

    // Factor 1: Recent failures
    const recentFailures = this.countRecentFailures(entry.statistics.failures);
    if (recentFailures > 0) {
      const impact = -(recentFailures * this.config.healthWeights.recentFailures);
      factors.push({
        name: "Recent Failures",
        impact,
        description: `${recentFailures} recent failure(s) in the last ${this.config.recentFailureWindow / 1000 / 60} minutes`,
      });
      score += impact;
    }

    // Factor 2: Quota availability
    const quotaImpact = this.calculateQuotaImpact(entry, quota);
    if (quotaImpact !== 0) {
      factors.push({
        name: "Quota Availability",
        impact: quotaImpact,
        description: `${quotaImpact < 0 ? "Low" : "Good"} quota availability`,
      });
      score += quotaImpact;
    }

    // Factor 3: Key age
    const age = Date.now() - entry.addedAt;
    const ageDays = age / (1000 * 60 * 60 * 24);
    if (ageDays > 30) {
      const impact = -((ageDays - 30) * this.config.healthWeights.keyAge / 100);
      factors.push({
        name: "Key Age",
        impact,
        description: `Key is ${Math.floor(ageDays)} days old`,
      });
      score += impact;
    }

    // Factor 4: Activation frequency
    const activationCount = entry.statistics.activationHistory.length;
    if (activationCount > 100) {
      const impact = -((activationCount - 100) * this.config.healthWeights.activationFrequency / 100);
      factors.push({
        name: "Activation Frequency",
        impact,
        description: `Key has been activated ${activationCount} times`,
      });
      score += impact;
    }

    // Clamp score between 0 and 100
    score = Math.max(0, Math.min(100, score));

    const isHealthy = score >= this.config.healthScoreThreshold;

    return {
      score,
      isHealthy,
      factors,
    };
  }

  /**
   * Check the health of all keys and return the healthiest one
   *
   * @param keys - Array of all available API keys
   * @param quotaInfo - Quota information for each key (optional)
   * @returns Health check result for the healthiest key, or undefined if no keys
   */
  checkAllKeysHealth(keys: ApiKeyEntry[], quotaInfo?: Map<string, QuotaInfo>): HealthCheckResult | undefined {
    if (keys.length === 0) {
      return undefined;
    }

    let bestResult: HealthCheckResult | undefined;

    for (const entry of keys) {
      const quota = quotaInfo?.get(entry.key);
      const result = this.checkHealth(entry, quota);

      if (!bestResult || result.score > bestResult.score) {
        bestResult = result;
      }
    }

    return bestResult;
  }

  /**
   * Record a failure for a specific key
   *
   * Design decision: This returns the updated statistics so the caller can
   * persist the changes. The service itself doesn't persist data.
   *
   * @param statistics - Current statistics for the key
   * @param error - The error that occurred
   * @returns Updated statistics
   */
  recordFailure(statistics: KeyStatistics, _error: Error): KeyStatistics {
    const timestamp = Date.now();

    // Add failure timestamp
    statistics.failures.push(timestamp);

    // Trim old failures beyond history limit
    const maxFailures = 100; // Keep last 100 failures
    if (statistics.failures.length > maxFailures) {
      statistics.failures = statistics.failures.slice(-maxFailures);
    }

    // Increment consecutive failures
    statistics.consecutiveFailures++;

    // Increment total failures
    statistics.totalFailures++;

    // Update last failure timestamp
    statistics.lastFailureTimestamp = timestamp;

    return statistics;
  }

  /**
   * Record a successful operation for a specific key
   *
   * @param statistics - Current statistics for the key
   * @returns Updated statistics
   */
  recordSuccess(statistics: KeyStatistics): KeyStatistics {
    // Reset consecutive failures on success
    statistics.consecutiveFailures = 0;

    // Increment usage count
    statistics.usageCount++;

    // Update last success timestamp
    statistics.lastSuccessTimestamp = Date.now();

    return statistics;
  }

  /**
   * Record that a key was activated
   *
   * Design decision: Activation history is tracked separately from usage count
   * to distinguish between successful operations and key switches.
   *
   * @param statistics - Current statistics for the key
   * @param keyIndex - Index of the key in the collection
   * @param reason - Reason for the activation
   * @returns Updated statistics
   */
  recordActivation(
    statistics: KeyStatistics,
    keyIndex: number,
    reason: ActivationReasonEnum,
  ): KeyStatistics {
    const activationEntry = {
      timestamp: Date.now(),
      keyIndex,
      reason,
    };

    // Add to activation history
    statistics.activationHistory.push(activationEntry);

    // Trim old activations beyond history limit
    const maxActivations = 100; // Keep last 100 activations
    if (statistics.activationHistory.length > maxActivations) {
      statistics.activationHistory = statistics.activationHistory.slice(-maxActivations);
    }

    // Update last activated timestamp
    statistics.lastActivatedTimestamp = Date.now();

    return statistics;
  }

  /**
   * Check if a key should be cycled due to failures
   *
   * Design decision: This is a pure function that makes a recommendation based
   * on the current state. The caller decides whether to actually cycle.
   *
   * @param statistics - Current statistics for the key
   * @returns Whether the key should be cycled
   */
  shouldCycleDueToFailures(statistics: KeyStatistics): boolean {
    // Check consecutive failures
    if (statistics.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      return true;
    }

    // Check recent failures in the time window
    const recentFailures = this.countRecentFailures(statistics.failures);
    if (recentFailures >= this.config.maxConsecutiveFailures) {
      return true;
    }

    return false;
  }

  /**
   * Automatically cycle if needed based on quota and health
   *
   * Design decision: This method combines quota and health checks to determine
   * if cycling is needed. It returns the selection result if cycling occurred.
   *
   * @param keys - Array of all available API keys
   * @param activeIndex - Index of the currently active key
   * @param activeQuota - Current quota information for the active key
   * @returns Selection result if cycling occurred, undefined otherwise
   */
  autoCycleIfNeeded(
    keys: ApiKeyEntry[],
    activeIndex: number,
    activeQuota?: QuotaInfo,
  ): KeySelectionResult | undefined {
    // Check if cycling should occur based on quota
    if (activeQuota && this.shouldAutoCycle(activeQuota)) {
      return this.cycleKey(keys, activeIndex);
    }

    // Check if cycling should occur based on health
    const activeEntry = keys[activeIndex];
    if (activeEntry && !this.checkHealth(activeEntry, activeQuota).isHealthy) {
      return this.cycleKey(keys, activeIndex);
    }

    // Check if cycling should occur due to failures
    if (activeEntry && this.shouldCycleDueToFailures(activeEntry.statistics)) {
      return this.cycleKey(keys, activeIndex);
    }

    return undefined;
  }

  /**
   * Select the next key using round-robin strategy
   *
   * Design rationale: Round-robin provides predictable, fair distribution of
   * load across keys. Each key gets equal opportunity over time.
   *
   * @param keys - Array of all available API keys
   * @param activeIndex - Index of the currently active key
   * @returns Index of the selected key
   */
  private selectRoundRobin(keys: ApiKeyEntry[], activeIndex: number): number {
    return (activeIndex + 1) % keys.length;
  }

  /**
   * Select the least used key based on quota
   *
   * Design rationale: This strategy maximizes available quota by selecting
   * the key with the most remaining requests.
   *
   * @param keys - Array of all available API keys
   * @returns Index of the selected key
   */
  private selectLeastUsed(keys: ApiKeyEntry[]): number {
    let bestIndex = 0;
    let bestRemaining = -1;

    for (let i = 0; i < keys.length; i++) {
      // Safe to use non-null assertion because loop iterates within array bounds
      const key = keys[i]!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
      // Skip keys without quota information
      if (!key.statistics.quota) {
        continue;
      }
      const remaining = key.statistics.quota.remaining;

      if (remaining > bestRemaining) {
        bestRemaining = remaining;
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  /**
   * Select a random key
   *
   * Design rationale: Random selection provides load distribution without
   * maintaining complex state. It's simple and effective for many use cases.
   *
   * @param keys - Array of all available API keys
   * @returns Index of the selected key
   */
  private selectRandom(keys: ApiKeyEntry[]): number {
    return Math.floor(Math.random() * keys.length);
  }

  /**
   * Select the key with the highest priority
   *
   * Design rationale: Priority allows users to define an explicit ordering
   * of keys. Higher priority keys are preferred.
   *
   * @param keys - Array of all available API keys
   * @returns Index of the selected key
   */
  private selectPriority(keys: ApiKeyEntry[]): number {
    let bestIndex = 0;
    let bestPriority = Number.MIN_SAFE_INTEGER;

    for (let i = 0; i < keys.length; i++) {
      // Safe to use non-null assertion because loop iterates within array bounds
      const key = keys[i]!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
      // Skip keys without priority defined
      if (key.priority === undefined || key.priority === null) {
        continue;
      }
      if (key.priority > bestPriority) {
        bestPriority = key.priority;
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  /**
   * Count the number of recent failures within the time window
   *
   * @param failures - Array of failure timestamps
   * @returns Number of recent failures
   */
  private countRecentFailures(failures: number[]): number {
    const now = Date.now();
    const cutoff = now - this.config.recentFailureWindow;

    return failures.filter((timestamp) => timestamp >= cutoff).length;
  }

  /**
   * Calculate the health impact based on quota availability
   *
   * @param entry - The API key entry
   * @param quota - Current quota information (optional)
   * @returns Health impact score
   */
  private calculateQuotaImpact(entry: ApiKeyEntry, quota?: QuotaInfo): number {
    if (!quota) {
      // If no quota info provided, use the quota stored in the key entry
      const storedQuota = entry.statistics.quota;
      if (storedQuota) {
        quota = storedQuota;
      } else {
        // No quota information available, return neutral score
        return 0;
      }
    }

    const remaining = quota.remaining;
    const limit = quota.limit;
    const percentageUsed = (remaining / limit) * 100;

    if (percentageUsed < 10) {
      // Very low quota
      return -this.config.healthWeights.quotaAvailability;
    } else if (percentageUsed < 30) {
      // Low quota
      return -(this.config.healthWeights.quotaAvailability * 0.5);
    } else if (percentageUsed > 80) {
      // Good quota
      return this.config.healthWeights.quotaAvailability * 0.25;
    }

    return 0;
  }

  /**
   * Update the configuration of the cycling service
   *
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<KeyCyclingServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get the current configuration
   *
   * @returns Current configuration
   */
  getConfig(): KeyCyclingServiceConfig {
    return { ...this.config };
  }
}
