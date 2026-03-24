/**
 * Multi-key cycling type definitions
 *
 * This file defines all TypeScript interfaces and types for the multi-key
 * API key cycling infrastructure. These types support storing multiple
 * API keys with labels, tracking usage statistics, and managing cycling state.
 */

/**
 * Represents a single API key entry in the collection
 */
export interface ApiKeyEntry {
  /**
   * Unique identifier for this key entry
   */
  id: string;

  /**
   * The API key string (sensitive data)
   */
  key: string;

  /**
   * User-defined label for the key (e.g., "Production", "Development")
   */
  label: string;

  /**
   * Usage statistics for this key
   */
  statistics: KeyStatistics;

  /**
   * Timestamp when this key was added to the collection
   */
  addedAt: number;

  /**
   * Priority for Priority cycling strategy (higher values = higher priority)
   * Default: 0
   */
  priority?: number;
}

/**
 * Statistics tracked for each API key
 */
export interface KeyStatistics {
  /**
   * Number of times this key has been used to make API requests
   */
  usageCount: number;

  /**
   * Most recent quota information from the API
   */
  quota: QuotaInfo | null;

  /**
   * Number of consecutive failures for this key
   */
  consecutiveFailures: number;

  /**
   * Total number of failures for this key
   */
  totalFailures: number;

  /**
   * Array of recent failure timestamps for health tracking
   */
  failures: number[];

  /**
   * History of activations for this key
   */
  activationHistory: ActivationEntry[];

  /**
   * Timestamp of the last successful API request
   */
  lastSuccessTimestamp: number | null;

  /**
   * Timestamp of the last failed API request
   */
  lastFailureTimestamp: number | null;

  /**
   * Timestamp when this key was last activated
   */
  lastActivatedTimestamp: number | null;
}

/**
 * Quota information from the Synthetic.new API
 *
 * Design decision: This interface now supports both legacy quota-based fields
 * and the new mana-based resource pool system for backward compatibility.
 * The API transitioned from { limit, requests, remaining, percentageUsed, renewsAt }
 * to { balance, maxBalance, regenRate, nextRegen }.
 *
 * Migration path: When mana fields are present, legacy fields are calculated from them.
 * This allows existing UI components to continue working without modification.
 */
export interface QuotaInfo {
  /**
   * Current mana balance (new mana-based system)
   * Represents the available resource pool at this moment
   */
  balance?: number;

  /**
   * Maximum mana balance (new mana-based system)
   * Represents the total capacity of the resource pool
   */
  maxBalance?: number;

  /**
   * Mana regeneration rate in mana per minute (new mana-based system)
   * Rate at which the resource pool replenishes
   */
  regenRate?: number;

  /**
   * Seconds until next mana regeneration (new mana-based system)
   * Time remaining before the next regen tick
   */
  nextRegen?: number;

  /**
   * Total quota limit for the billing period (legacy quota system)
   * @deprecated Use maxBalance instead. Kept for backward compatibility.
   */
  limit: number;

  /**
   * Number of requests used in the current period (legacy quota system)
   * @deprecated Calculated from (maxBalance - balance). Kept for backward compatibility.
   */
  requests: number;

  /**
   * Number of requests remaining in the current period (legacy quota system)
   * @deprecated Use balance instead. Kept for backward compatibility.
   */
  remaining: number;

  /**
   * Percentage of quota used (0-100) (legacy quota system)
   * @deprecated Calculate from ((maxBalance - balance) / maxBalance) * 100. Kept for backward compatibility.
   */
  percentageUsed: number;

  /**
   * Timestamp when the quota renews (legacy quota system)
   * @deprecated Calculate from new Date(Date.now() + nextRegen * 1000). Kept for backward compatibility.
   */
  renewsAt: Date;
}

/**
 * Configuration for key cycling behavior
 */
export interface CyclingConfig {
  /**
   * Whether automatic key cycling is enabled
   * Default: true
   */
  enabled: boolean;

  /**
   * Strategy to use for selecting the next key
   * Default: RoundRobin
   */
  strategy: CyclingStrategy;

  /**
   * Percentage threshold (0-100) that triggers automatic cycling
   * Default: 90 (cycle when quota reaches 90%)
   */
  cycleThreshold: number;

  /**
   * Maximum number of consecutive failures before marking key as unhealthy
   * Default: 3
   */
  maxKeyFailures: number;

  /**
   * Whether to skip unhealthy keys when cycling
   * Default: true
   */
  skipUnhealthyKeys: boolean;

  /**
   * Whether to automatically cycle when quota is exceeded (NoSubscription error)
   * Default: false
   */
  cycleOnQuotaExceeded: boolean;
}

/**
 * Strategies for selecting which API key to use
 */
export enum CyclingStrategy {
  /**
   * Round-robin: cycle through keys sequentially
   * Best for: Fair distribution across all keys
   */
  RoundRobin = "round-robin",

  /**
   * Least-used: always select key with most remaining quota
   * Best for: Maximizing total available quota
   */
  LeastUsed = "least-used",

  /**
   * Random: randomly select from available keys
   * Best for: Load distribution when quota is balanced
   */
  Random = "random",

  /**
   * Priority: select based on user-defined priority order
   * Best for: Preferred keys for specific use cases
   */
  Priority = "priority",
}

/**
 * Runtime state for key cycling
 */
export interface KeyCyclingState {
  /**
   * Index of the currently active key in the collection
   * -1 indicates no key is active
   */
  activeIndex: number;

  /**
   * History of key activations for analytics
   * Stores last 100 activations
   */
  activationHistory: ActivationEntry[];

  /**
   * Health scores for each key (0-100)
   * Higher values indicate healthier keys
   */
  healthScores: Map<number, number>;

  /**
   * Timestamp of the last cycling operation
   */
  lastCycledTimestamp: number | null;
}

/**
 * Entry in the activation history
 */
export interface ActivationEntry {
  /**
   * Index of the key that was activated
   */
  keyIndex: number;

  /**
   * Reason for the activation
   */
  reason: ActivationReason;

  /**
   * Timestamp of the activation
   */
  timestamp: number;

  /**
   * Optional message providing additional context
   */
  message?: string;
}

/**
 * Reasons for activating a specific key
 */
export enum ActivationReason {
  /**
   * Initial activation when extension starts
   */
  Initial = "initial",

  /**
   * User manually selected this key
   */
  ManualSelection = "manual-selection",

  /**
   * Automatic cycling triggered by threshold
   */
  AutomaticThreshold = "automatic-threshold",

  /**
   * Previous key failed
   */
  KeyFailure = "key-failure",

  /**
   * Previous key exceeded quota
   */
  QuotaExceeded = "quota-exceeded",

  /**
   * Previous key was marked as unhealthy
   */
  KeyUnhealthy = "key-unhealthy",

  /**
   * Keys collection was modified
   */
  CollectionModified = "collection-modified",

  /**
   * Configuration changed
   */
  ConfigurationChange = "configuration-change",
}

/**
 * Container for all API keys and cycling configuration
 */
export interface ApiKeyCollection {
  /**
   * Array of API key entries
   */
  keys: ApiKeyEntry[];

  /**
   * Cycling behavior configuration
   */
  config: CyclingConfig;

  /**
   * Runtime cycling state
   */
  state: KeyCyclingState;

  /**
   * Version of the collection (for conflict resolution)
   */
  version: number;
}

/**
 * Result of a key selection operation
 */
export interface KeySelectionResult {
  /**
   * The selected API key entry
   */
  entry: ApiKeyEntry;

  /**
   * Index of the selected key in the collection
   */
  index: number;

  /**
   * Reason for the selection
   */
  reason: ActivationReason;

  /**
   * Whether this selection represents a change from the previous key
   */
  didCycle: boolean;
}

/**
 * Result of a health check operation
 */
export interface HealthCheckResult {
  /**
   * Health score (0-100)
   */
  score: number;

  /**
   * Whether the key is considered healthy
   */
  isHealthy: boolean;

  /**
   * Factors affecting the health score
   */
  factors: HealthFactor[];
}

/**
 * Individual factor affecting health score
 */
export interface HealthFactor {
  /**
   * Name of the factor
   */
  name: string;

  /**
   * Impact on the health score (negative = reduces health)
   */
  impact: number;

  /**
   * Description of the factor
   */
  description: string;
}

/**
 * Shared state keys for cross-window synchronization
 */
export const SHARED_STATE_KEYS = {
  /**
   * Timestamp when the key collection was last updated
   */
  KEY_COLLECTION_TIMESTAMP: "syntheticKeyCollectionTimestamp",

  /**
   * Timestamp when the active key was last changed
   */
  ACTIVE_KEY_TIMESTAMP: "syntheticActiveKeyTimestamp",

  /**
   * Version of the key collection (for conflict resolution)
   */
  KEY_COLLECTION_VERSION: "syntheticKeyCollectionVersion",
} as const;

/**
 * Secret storage keys
 */
export const SECRET_STORAGE_KEYS = {
  /**
   * New format: Array of keys with labels
   */
  API_KEYS: "syntheticApiKeys",

  /**
   * Legacy format: Single key string (for migration)
   */
  API_KEY_LEGACY: "syntheticApiKey",
} as const;

/**
 * Default cycling configuration
 */
export const DEFAULT_CYCLING_CONFIG: CyclingConfig = {
  enabled: true,
  strategy: CyclingStrategy.RoundRobin,
  cycleThreshold: 90,
  maxKeyFailures: 3,
  skipUnhealthyKeys: true,
  cycleOnQuotaExceeded: false,
};

/**
 * Default cycling state
 */
export const DEFAULT_CYCLING_STATE: KeyCyclingState = {
  activeIndex: -1,
  activationHistory: [],
  healthScores: new Map<number, number>(),
  lastCycledTimestamp: null,
};

/**
 * Default key statistics
 */
export const DEFAULT_KEY_STATISTICS: KeyStatistics = {
  usageCount: 0,
  quota: null,
  consecutiveFailures: 0,
  totalFailures: 0,
  failures: [],
  activationHistory: [],
  lastSuccessTimestamp: null,
  lastFailureTimestamp: null,
  lastActivatedTimestamp: null,
};
