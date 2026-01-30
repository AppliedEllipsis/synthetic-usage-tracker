import * as vscode from "vscode";
import { SyntheticService } from "../api/syntheticService";
import type {
  ApiKeyEntry,
  KeyStatistics,
  ApiKeyCollection,
  KeyCyclingState,
  ActivationReason,
} from "../types/keys";
import {
  DEFAULT_CYCLING_CONFIG,
  DEFAULT_CYCLING_STATE,
  DEFAULT_KEY_STATISTICS,
  SECRET_STORAGE_KEYS,
  SHARED_STATE_KEYS,
} from "../types/keys";

/**
 * Manages storage and retrieval of multiple API keys
 *
 * Design decision: Separate key management from configuration to maintain clear separation
 * of concerns and make key operations testable and reusable.
 *
 * Backward compatibility: Supports both legacy single-key format and new multi-key array format.
 * When migrating from legacy to new format, the legacy key is preserved in the new array.
 */
export class KeyManager {
  private context: vscode.ExtensionContext;
  private onKeysChangedCallback: (() => void) | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Set callback to be invoked when keys are modified
   *
   * Design rationale: Allows the extension to respond to key changes (e.g., refresh usage,
   * update status bar) without tight coupling between key manager and extension logic.
   */
  onKeysChanged(callback: () => void): void {
    this.onKeysChangedCallback = callback;
  }

  /**
   * Check if any API keys are configured
   *
   * Design decision: Check both legacy and new formats to support all installation scenarios.
   * This ensures the extension can detect keys regardless of storage format.
   */
  async hasApiKey(): Promise<boolean> {
    const collection = await this.getCollection();
    return collection.keys.length > 0;
  }

  /**
   * Get the currently active API key
   *
   * Design decision: Return undefined if no keys are configured, allowing caller to
   * handle the case gracefully (e.g., show idle state instead of error).
   */
  async getActiveKey(): Promise<string | undefined> {
    const collection = await this.getCollection();
    if (collection.keys.length === 0) {
      return undefined;
    }

    const activeIndex = collection.state.activeIndex;
    if (activeIndex < 0 || activeIndex >= collection.keys.length) {
      return undefined;
    }

    // Non-null assertion is safe here because we validated the index is within bounds
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return collection.keys[activeIndex]!.key;
  }

  /**
   * Get the active key entry with full metadata
   *
   * Design decision: Return the full entry to provide access to label, statistics, and
   * other metadata without requiring additional lookups.
   */
  async getActiveEntry(): Promise<ApiKeyEntry | undefined> {
    const collection = await this.getCollection();
    if (collection.keys.length === 0) {
      return undefined;
    }

    const activeIndex = collection.state.activeIndex;
    if (activeIndex < 0 || activeIndex >= collection.keys.length) {
      return undefined;
    }

    return collection.keys[activeIndex];
  }

  /**
   * Get the index of the currently active key
   *
   * Design rationale: This method is needed by the cycling service to determine which
   * key is currently active before cycling to the next one.
   */
  async getActiveIndex(): Promise<number> {
    const collection = await this.getCollection();
    return collection.state.activeIndex;
  }

  /**
   * Get all configured API keys
   *
   * Design decision: Return a copy of the keys array to prevent external modifications
   * from corrupting internal state. This maintains encapsulation and data integrity.
   */
  async getAllKeys(): Promise<ApiKeyEntry[]> {
    const collection = await this.getCollection();
    return [...collection.keys];
  }

  /**
   * Get the complete API key collection
   *
   * Design decision: Return a copy of the collection to prevent external modifications.
   * This maintains encapsulation and data integrity while providing full access to
   * configuration and state.
   */
  async getCollection(): Promise<ApiKeyCollection> {
    // Try new format first
    const collectionJson = await this.context.secrets.get(SECRET_STORAGE_KEYS.API_KEYS);
    if (collectionJson) {
      try {
        const collection = JSON.parse(collectionJson) as ApiKeyCollection;
        // Reconstruct Map from plain object
        collection.state.healthScores = new Map(
          Object.entries(collection.state.healthScores as unknown as Record<string, number>).map(
            ([k, v]) => [Number(k), v],
          ),
        );
        return collection;
      } catch {
        // Silent fallthrough to legacy format
      }
    }

    // Fallback to legacy format
    const legacyKey = await this.context.secrets.get(SECRET_STORAGE_KEYS.API_KEY_LEGACY);
    if (legacyKey) {
      // Migrate to new format with generated ID
      const collection: ApiKeyCollection = {
        keys: [
          {
            id: this.generateKeyId(),
            key: legacyKey,
            label: "Default Key",
            statistics: { ...DEFAULT_KEY_STATISTICS },
            addedAt: Date.now(),
          },
        ],
        config: { ...DEFAULT_CYCLING_CONFIG },
        state: {
          ...DEFAULT_CYCLING_STATE,
          activeIndex: 0,
        },
        version: 1,
      };

      // Save in new format
      await this.saveCollection(collection);

      // Delete legacy format to avoid duplicate storage
      await this.context.secrets.delete(SECRET_STORAGE_KEYS.API_KEY_LEGACY);

      return collection;
    }

    // No keys configured
    return this.getDefaultCollection();
  }

  /**
   * Generate a unique key ID
   *
   * Design decision: Use timestamp-based ID generation for simplicity and uniqueness.
   * This provides sufficient uniqueness for key identification without requiring
   * external dependencies like UUID libraries.
   */
  private generateKeyId(): string {
    // Use timestamp + random number for uniqueness
    return `key_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Add a new API key to the collection
   *
   * Design rationale: Validate key format before storage to prevent invalid keys from
   * being saved. Auto-generate a label if not provided to ensure all keys are identifiable.
   *
   * Design decision: Set the new key as active if it's the first key, otherwise keep the
   * current active key. This provides a sensible default without surprising the user.
   */
  async addApiKey(
    key: string,
    label: string | undefined,
    reason: ActivationReason,
  ): Promise<void> {
    // Validate key format
    if (!SyntheticService.validateApiKey(key)) {
      throw new Error("Invalid API key format. API keys should start with 'syn_'");
    }

    const collection = await this.getCollection();

    // Check for duplicate keys
    if (collection.keys.some((entry) => entry.key === key)) {
      throw new Error("This API key is already in your collection.");
    }

    // Create new key entry with generated ID
    const newEntry: ApiKeyEntry = {
      id: this.generateKeyId(),
      key,
      label: label || `Key ${collection.keys.length + 1}`,
      statistics: { ...DEFAULT_KEY_STATISTICS },
      addedAt: Date.now(),
    };

    // Add to collection
    collection.keys.push(newEntry);

    // Set as active if it's the first key
    if (collection.keys.length === 1) {
      collection.state.activeIndex = 0;
    }

    // Record activation
    await this.recordActivation(collection, 0, reason);

    // Increment version for cross-window sync
    collection.version++;

    // Save collection
    await this.saveCollection(collection);

    // Notify callback
    this.onKeysChangedCallback?.();

    // Update timestamp for cross-window sync
    await this.updateKeysTimestamp();
  }

  /**
   * Remove an API key from the collection
   *
   * Design decision: Prevent removal of the last key to ensure the extension always has
   * at least one key configured. This prevents the extension from becoming unusable.
   *
   * Design rationale: Adjust active index when removing the active key to ensure a valid
   * key remains active. Default to the first key if the removed key was active.
   */
  async removeApiKey(key: string): Promise<void> {
    const collection = await this.getCollection();

    if (collection.keys.length <= 1) {
      throw new Error("Cannot remove the last API key. Add another key first.");
    }

    const index = collection.keys.findIndex((entry) => entry.key === key);
    if (index === -1) {
      throw new Error("API key not found in collection.");
    }

    // Remove the key
    collection.keys.splice(index, 1);

    // Adjust active index if needed
    if (collection.state.activeIndex >= collection.keys.length) {
      collection.state.activeIndex = collection.keys.length - 1;
    }

    // Update health scores map
    collection.state.healthScores.delete(index);
    // Rebuild health scores map with corrected indices
    const newHealthScores = new Map<number, number>();
    collection.state.healthScores.forEach((score, oldIndex) => {
      if (oldIndex < index) {
        newHealthScores.set(oldIndex, score);
      } else if (oldIndex > index) {
        newHealthScores.set(oldIndex - 1, score);
      }
    });
    collection.state.healthScores = newHealthScores;

    // Increment version for cross-window sync
    collection.version++;

    // Save collection
    await this.saveCollection(collection);

    // Notify callback
    this.onKeysChangedCallback?.();

    // Update timestamp for cross-window sync
    await this.updateKeysTimestamp();
  }

  /**
   * Set the active API key by index
   *
   * Design decision: Validate index bounds to prevent errors when selecting keys.
   * This provides clear error messages for invalid selections.
   */
  async setActiveKeyByIndex(index: number, reason: ActivationReason): Promise<void> {
    const collection = await this.getCollection();

    if (index < 0 || index >= collection.keys.length) {
      throw new Error(
        `Invalid key index: ${index}. Must be between 0 and ${collection.keys.length - 1}.`,
      );
    }

    collection.state.activeIndex = index;

    // Record activation
    await this.recordActivation(collection, index, reason);

    // Increment version for cross-window sync
    collection.version++;

    // Save collection
    await this.saveCollection(collection);

    // Notify callback
    this.onKeysChangedCallback?.();

    // Update timestamp for cross-window sync
    await this.updateKeysTimestamp();
  }

  /**
   * Set the active API key by key value
   *
   * Design decision: Find key by value and set as active. Throws error if key not found
   * to provide clear feedback to the user.
   */
  async setActiveKey(key: string, reason: ActivationReason): Promise<void> {
    const collection = await this.getCollection();
    const index = collection.keys.findIndex((entry) => entry.key === key);

    if (index === -1) {
      throw new Error("API key not found in collection.");
    }

    await this.setActiveKeyByIndex(index, reason);
  }

  /**
   * Update statistics for a specific key
   *
   * Design rationale: Partial update allows updating only the statistics that changed,
   * preserving other statistics and metadata. This supports incremental updates from
   * API responses without losing historical data.
   */
  async updateKeyStatistics(key: string, statistics: Partial<KeyStatistics>): Promise<void> {
    const collection = await this.getCollection();
    const entry = collection.keys.find((e) => e.key === key);

    if (!entry) {
      throw new Error("API key not found in collection.");
    }

    // Merge statistics
    entry.statistics = {
      ...entry.statistics,
      ...statistics,
    };

    // Save collection
    await this.saveCollection(collection);
  }

  /**
   * Get statistics for a specific key
   *
   * Design decision: Return a copy of the statistics to prevent external code from
   * modifying the internal state directly. This ensures data integrity.
   */
  async getKeyStatistics(key: string): Promise<KeyStatistics | undefined> {
    const collection = await this.getCollection();
    const entry = collection.keys.find((e) => e.key === key);

    if (!entry) {
      return undefined;
    }

    // Return a copy to prevent external mutation
    return { ...entry.statistics };
  }

  /**
   * Reset statistics for a specific key
   *
   * Design decision: Reset to default values while preserving the key and label.
   * This allows users to clear accumulated statistics without removing the key.
   */
  async resetKeyStatistics(key: string): Promise<void> {
    const collection = await this.getCollection();
    const entry = collection.keys.find((e) => e.key === key);

    if (!entry) {
      throw new Error("API key not found in collection.");
    }

    entry.statistics = { ...DEFAULT_KEY_STATISTICS };

    // Save collection
    await this.saveCollection(collection);
  }

  /**
   * Reset statistics for all keys
   *
   * Design decision: Batch operation to reset all statistics at once. This is useful
   * for testing or when users want to start fresh with all keys.
   */
  async resetAllStatistics(): Promise<void> {
    const collection = await this.getCollection();

    for (const entry of collection.keys) {
      entry.statistics = { ...DEFAULT_KEY_STATISTICS };
    }

    // Save collection
    await this.saveCollection(collection);
  }

  /**
   * Get the key cycling state
   *
   * Design decision: Return the cycling state from the collection. This provides
   * access to the active index, activation history, and health scores.
   */
  async getCyclingState(): Promise<KeyCyclingState> {
    const collection = await this.getCollection();
    return { ...collection.state };
  }

  /**
   * Update the key cycling state
   *
   * Design rationale: Update the state in the collection and save. This allows
   * external components to modify cycling state (e.g., active index, health scores).
   */
  async updateCyclingState(state: Partial<KeyCyclingState>): Promise<void> {
    const collection = await this.getCollection();
    collection.state = {
      ...collection.state,
      ...state,
    };

    // Save collection
    await this.saveCollection(collection);
  }

  /**
   * Get the timestamp of the last key update
   *
   * Design decision: Used for cross-window synchronization. Returns 0 if no timestamp
   * exists, indicating no keys have been added, removed, or activated yet.
   */
  async getKeysTimestamp(): Promise<number> {
    const timestamp = await this.context.globalState.get<number>(SHARED_STATE_KEYS.KEY_COLLECTION_TIMESTAMP);
    return timestamp ?? 0;
  }

  /**
   * Dispose of resources
   *
   * Design decision: Clear callback reference to prevent memory leaks. The key manager
   * itself doesn't hold any disposable resources (timers, event listeners, etc.).
   */
  dispose(): void {
    this.onKeysChangedCallback = undefined;
  }

  /**
   * Save the API key collection to storage
   *
   * Design decision: Store in SecretStorage for security. API keys are sensitive data
   * that should never be stored in plain text or globalState.
   */
  private async saveCollection(collection: ApiKeyCollection): Promise<void> {
    // Convert Map to plain object for JSON serialization
    const collectionToSave: ApiKeyCollection = {
      ...collection,
      state: {
        ...collection.state,
        healthScores: Object.fromEntries(collection.state.healthScores) as unknown as Map<number, number>,
      },
    };
    await this.context.secrets.store(SECRET_STORAGE_KEYS.API_KEYS, JSON.stringify(collectionToSave));
  }

  /**
   * Record an activation event for a key
   *
   * Design rationale: Track activation history for debugging and analytics. This helps
   * understand key usage patterns and can inform future improvements to cycling strategies.
   */
  private async recordActivation(
    collection: ApiKeyCollection,
    keyIndex: number,
    reason: ActivationReason,
  ): Promise<void> {
    const entry = collection.keys[keyIndex];
    if (!entry) {
      return;
    }

    const now = Date.now();

    // Update key statistics
    entry.statistics.lastActivatedTimestamp = now;

    // Add to activation history (keep last 100)
    const activation = {
      keyIndex,
      reason,
      timestamp: now,
    };

    collection.state.activationHistory.push(activation);
    if (collection.state.activationHistory.length > 100) {
      collection.state.activationHistory.shift();
    }

    // Update last cycled timestamp
    collection.state.lastCycledTimestamp = now;

    // Update health score for the key
    collection.state.healthScores.set(keyIndex, 100); // Reset to healthy on activation
  }

  /**
   * Update the timestamp for cross-window synchronization
   *
   * Design decision: Use globalState (not secrets) for timestamp because it's not
   * sensitive data and needs to be accessible from all windows for synchronization.
   */
  private async updateKeysTimestamp(): Promise<void> {
    const timestamp = Date.now();
    await this.context.globalState.update(SHARED_STATE_KEYS.KEY_COLLECTION_TIMESTAMP, timestamp);
  }

  /**
   * Get default collection when no keys are configured
   *
   * Design decision: Return empty collection with index -1 to indicate no active key.
   * This allows code to safely access collection.keys and collection.state.activeIndex
   * without null checks.
   */
  private getDefaultCollection(): ApiKeyCollection {
    return {
      keys: [],
      config: { ...DEFAULT_CYCLING_CONFIG },
      state: { ...DEFAULT_CYCLING_STATE },
      version: 0,
    };
  }
}
