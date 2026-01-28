import * as vscode from "vscode";
import {
  Model,
  ModelChange,
  ModelSnapshot,
  ModelHistory,
  ModelService,
  detectChanges,
  generateChecksum,
} from "../api/modelService";
import { ApiError } from "../api/syntheticService";

/**
 * Storage keys for model data in globalState
 */
const STORAGE_KEYS = {
  MODEL_HISTORY: "syntheticModelHistory",
  LAST_CHECKSUM: "syntheticModelChecksum",
  LAST_CHECK: "syntheticModelLastCheck",
  MODEL_UPDATE_TIMESTAMP: "syntheticModelUpdateTimestamp",
} as const;

/**
 * Maximum number of snapshots to keep
 * Design decision: Limit storage to prevent excessive memory usage.
 * 30 snapshots at 6-hour intervals = ~7.5 days of history
 */
const MAX_SNAPSHOTS = 30;

/**
 * Maximum number of changes to keep
 */
const MAX_CHANGES = 100;

/**
 * Model update result
 */
export interface ModelUpdateResult {
  models: Model[];
  changes: ModelChange[];
  hasChanges: boolean;
  isFirstFetch: boolean;
}

/**
 * Model manager for handling model state, change detection, and caching
 *
 * Design decision: Centralize model state management in a single class.
 * This provides a clean interface for the extension to interact with model data
 * and ensures consistent handling of storage, change detection, and cross-window
 * synchronization.
 */
export class ModelManager {
  private context: vscode.ExtensionContext;
  private currentModels: Model[] = [];
  private isFetching: boolean = false;
  private onModelsUpdatedCallback?: (result: ModelUpdateResult) => void;
  private onErrorCallback?: (error: Error) => void;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Fetch models from the API and detect changes
   *
   * Design decision: Compare checksum before doing full change detection
   * to avoid unnecessary processing when models haven't changed.
   */
  async fetchAndUpdateModels(apiKey: string): Promise<ModelUpdateResult> {
    if (this.isFetching) {
      return {
        models: this.currentModels,
        changes: [],
        hasChanges: false,
        isFirstFetch: false,
      };
    }

    this.isFetching = true;

    try {
      const service = new ModelService(apiKey);
      const models = await service.fetchModels();

      const result = await this.processModelUpdate(models);
      this.currentModels = models;

      if (result.hasChanges || result.isFirstFetch) {
        this.onModelsUpdatedCallback?.(result);
      }

      return result;
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error(String(error));
      this.onErrorCallback?.(err);
      throw err;
    } finally {
      this.isFetching = false;
    }
  }

  /**
   * Process model update and detect changes
   */
  private async processModelUpdate(models: Model[]): Promise<ModelUpdateResult> {
    const newChecksum = generateChecksum(models);
    const lastChecksum = await this.getLastChecksum();

    // Check if this is the first fetch
    const history = await this.getHistory();
    const isFirstFetch = history.snapshots.length === 0;

    // If checksum matches, no changes detected
    if (newChecksum === lastChecksum && !isFirstFetch) {
      return {
        models,
        changes: [],
        hasChanges: false,
        isFirstFetch: false,
      };
    }

    // Detect changes by comparing with last snapshot
    let changes: ModelChange[] = [];
    if (history.snapshots.length > 0) {
      const lastSnapshot = history.snapshots[history.snapshots.length - 1];
      changes = detectChanges(lastSnapshot.models, models);
    }

    // Save new snapshot
    const snapshot: ModelSnapshot = {
      models,
      timestamp: Date.now(),
      checksum: newChecksum,
    };
    await this.saveSnapshot(snapshot);

    // Save changes if any
    if (changes.length > 0) {
      await this.saveChanges(changes);
      await this.updateModelTimestamp();
    }

    return {
      models,
      changes,
      hasChanges: changes.length > 0,
      isFirstFetch,
    };
  }

  /**
   * Get current models
   */
  getCurrentModels(): Model[] {
    return this.currentModels;
  }

  /**
   * Get model by ID
   */
  getModelById(id: string): Model | undefined {
    return this.currentModels.find((m) => m.id === id);
  }

  /**
   * Get model history from storage
   */
  async getHistory(): Promise<ModelHistory> {
    const history = await this.context.globalState.get<ModelHistory>(
      STORAGE_KEYS.MODEL_HISTORY
    );
    return (
      history || {
        snapshots: [],
        changes: [],
        lastChecked: 0,
      }
    );
  }

  /**
   * Save a new model snapshot
   *
   * Design decision: Limit the number of snapshots to prevent excessive
   * storage usage. Old snapshots are removed in FIFO order.
   */
  private async saveSnapshot(snapshot: ModelSnapshot): Promise<void> {
    const history = await this.getHistory();

    // Add new snapshot
    history.snapshots.push(snapshot);
    history.lastChecked = Date.now();

    // Trim old snapshots
    if (history.snapshots.length > MAX_SNAPSHOTS) {
      history.snapshots = history.snapshots.slice(-MAX_SNAPSHOTS);
    }

    await this.saveHistory(history);
    await this.context.globalState.update(
      STORAGE_KEYS.LAST_CHECKSUM,
      snapshot.checksum
    );
    await this.context.globalState.update(
      STORAGE_KEYS.LAST_CHECK,
      snapshot.timestamp
    );
  }

  /**
   * Save detected changes
   */
  private async saveChanges(changes: ModelChange[]): Promise<void> {
    const history = await this.getHistory();

    history.changes.push(...changes);

    // Trim old changes
    if (history.changes.length > MAX_CHANGES) {
      history.changes = history.changes.slice(-MAX_CHANGES);
    }

    await this.saveHistory(history);
  }

  /**
   * Save history to storage
   */
  private async saveHistory(history: ModelHistory): Promise<void> {
    await this.context.globalState.update(STORAGE_KEYS.MODEL_HISTORY, history);
  }

  /**
   * Get last checksum
   */
  private async getLastChecksum(): Promise<string | undefined> {
    return this.context.globalState.get<string>(STORAGE_KEYS.LAST_CHECKSUM);
  }

  /**
   * Get last check timestamp
   */
  async getLastCheck(): Promise<number> {
    return this.context.globalState.get<number>(STORAGE_KEYS.LAST_CHECK, 0);
  }

  /**
   * Update the shared state timestamp to signal that models have changed
   * This allows other VS Code windows to detect the change
   */
  private async updateModelTimestamp(): Promise<void> {
    const timestamp = Date.now();
    await this.context.globalState.update(
      STORAGE_KEYS.MODEL_UPDATE_TIMESTAMP,
      timestamp
    );
  }

  /**
   * Get model update timestamp
   */
  async getModelTimestamp(): Promise<number> {
    return this.context.globalState.get<number>(
      STORAGE_KEYS.MODEL_UPDATE_TIMESTAMP,
      0
    );
  }

  /**
   * Watch for changes in shared state (for cross-window model updates)
   * Uses polling to detect changes from other windows
   *
   * Design decision: Polling is used instead of event-based synchronization because
   * VS Code's globalState doesn't support change events across windows. Polling every
   * 30 seconds provides a good balance between responsiveness and performance for
   * model updates, which are less frequent than usage updates.
   */
  watchSharedStateChanges(pollInterval: number = 30000): vscode.Disposable {
    let lastKnownTimestamp = 0;

    this.getModelTimestamp().then((timestamp) => {
      lastKnownTimestamp = timestamp;
    });

    const intervalId = setInterval(async () => {
      const currentTimestamp = await this.getModelTimestamp();
      if (currentTimestamp > lastKnownTimestamp) {
        lastKnownTimestamp = currentTimestamp;
        // Reload models from storage
        const history = await this.getHistory();
        if (history.snapshots.length > 0) {
          const lastSnapshot =
            history.snapshots[history.snapshots.length - 1];
          this.currentModels = lastSnapshot.models;
          this.onModelsUpdatedCallback?.({
            models: lastSnapshot.models,
            changes: [],
            hasChanges: false,
            isFirstFetch: false,
          });
        }
      }
    }, pollInterval);

    return {
      dispose: () => {
        clearInterval(intervalId);
      },
    };
  }

  /**
   * Clear all model data
   */
  async clearData(): Promise<void> {
    this.currentModels = [];
    await this.context.globalState.update(STORAGE_KEYS.MODEL_HISTORY, undefined);
    await this.context.globalState.update(
      STORAGE_KEYS.LAST_CHECKSUM,
      undefined
    );
    await this.context.globalState.update(STORAGE_KEYS.LAST_CHECK, undefined);
    await this.context.globalState.update(
      STORAGE_KEYS.MODEL_UPDATE_TIMESTAMP,
      undefined
    );
  }

  /**
   * Register callback for model updates
   */
  onModelsUpdated(callback: (result: ModelUpdateResult) => void): void {
    this.onModelsUpdatedCallback = callback;
  }

  /**
   * Register callback for errors
   */
  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * Check if a fetch is in progress
   */
  isFetchingModels(): boolean {
    return this.isFetching;
  }

  /**
   * Get models grouped by provider
   */
  getModelsByProvider(): Map<string, Model[]> {
    const grouped = new Map<string, Model[]>();
    for (const model of this.currentModels) {
      const existing = grouped.get(model.provider) || [];
      existing.push(model);
      grouped.set(model.provider, existing);
    }
    return grouped;
  }

  /**
   * Get models sorted by name
   */
  getModelsSorted(): Model[] {
    return [...this.currentModels].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  /**
   * Get recent changes
   */
  async getRecentChanges(limit: number = 10): Promise<ModelChange[]> {
    const history = await this.getHistory();
    return history.changes.slice(-limit).reverse();
  }

  /**
   * Get unread changes count
   */
  async getUnreadChangesCount(): Promise<number> {
    const history = await this.getHistory();
    // Consider changes from the last 24 hours as "unread"
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return history.changes.filter((c) => c.timestamp > cutoff).length;
  }
}
