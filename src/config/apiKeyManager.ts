import * as vscode from "vscode";

/**
 * API Key Profile Interface
 *
 * Design decision: Each profile has a unique ID, full key, label, and active state.
 * The ID ensures we can uniquely identify and manage profiles even if labels or keys change.
 * The key is stored in full but displayed with only the last 6 characters for security.
 */
export interface ApiKeyProfile {
  id: string;
  key: string;
  label: string;
  isActive: boolean;
}

/**
 * Shared state keys for cross-window communication
 *
 * Design decision: Use a separate timestamp key for profiles to distinguish from legacy
 * single-key updates. This allows independent tracking of profile changes.
 */
const SHARED_STATE_KEYS = {
  PROFILES_UPDATE_TIMESTAMP: 'syntheticProfilesUpdateTimestamp',
} as const;

/**
 * API Key Manager
 *
 * Design decision: This class encapsulates all profile management logic including storage,
 * retrieval, activation, and cross-window synchronization. It provides a clean interface
 * for the extension to manage multiple API keys without exposing storage details.
 *
 * The manager uses VSCode's SecretStorage for secure key storage and globalState for
 * cross-window synchronization via polling.
 */
export class ApiKeyManager {
  private context: vscode.ExtensionContext;
  private onProfilesChangedCallback?: () => void;
  private sharedStateWatcherDisposable: vscode.Disposable | null = null;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Get all API key profiles
   *
   * Returns profiles sorted by activation state (active first) and then by label.
   * This ensures the active profile always appears first in UI lists.
   */
  async getProfiles(): Promise<ApiKeyProfile[]> {
    const profilesJson = await this.context.secrets.get("syntheticApiKeys");
    
    if (!profilesJson) {
      return [];
    }

    try {
      const profiles = JSON.parse(profilesJson) as ApiKeyProfile[];
      
      // Validate and filter profiles
      const validProfiles = profiles.filter(profile => 
        profile.id && 
        profile.key && 
        profile.label &&
        typeof profile.isActive === 'boolean'
      );

      // Sort: active profiles first, then by label
      return validProfiles.sort((a, b) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return a.label.localeCompare(b.label);
      });
    } catch {
      // If parsing fails, return empty array
      return [];
    }
  }

  /**
   * Add a new API key profile
   *
   * Design decision: Automatically set the new profile as active if no profiles exist.
   * This provides a better user experience for first-time setup. If profiles already
   * exist, the new profile is added but not activated.
   */
  async addProfile(key: string, label?: string): Promise<void> {
    const profiles = await this.getProfiles();
    
    // Generate unique ID
    const id = this.generateId();
    
    // Use provided label or default
    const profileLabel = label || `Profile ${profiles.length + 1}`;
    
    // Determine if this should be the active profile
    const isActive = profiles.length === 0;

    const newProfile: ApiKeyProfile = {
      id,
      key,
      label: profileLabel,
      isActive,
    };

    profiles.push(newProfile);
    
    // If this is the new active profile, deactivate others
    if (isActive) {
      profiles.forEach(p => {
        if (p.id !== id) {
          p.isActive = false;
        }
      });
    }

    await this.saveProfiles(profiles);
    await this.updateProfilesTimestamp();
  }

  /**
   * Delete a profile by ID
   *
   * Design decision: Prevent deletion of the active profile if it's the only one.
   * This ensures users always have at least one profile available. If deleting the
   * active profile and others exist, the first remaining profile becomes active.
   */
  async deleteProfile(id: string): Promise<void> {
    const profiles = await this.getProfiles();
    
    // Find the profile to delete
    const profileToDelete = profiles.find(p => p.id === id);
    
    if (!profileToDelete) {
      throw new Error(`Profile with ID ${id} not found`);
    }

    // Prevent deletion if it's the only profile
    if (profiles.length === 1) {
      throw new Error("Cannot delete the only profile");
    }

    // Check if we're deleting the active profile
    const wasActive = profileToDelete.isActive;
    
    // Filter out the profile
    const remainingProfiles = profiles.filter(p => p.id !== id);
    
    // If we deleted the active profile, activate the first remaining profile
    if (wasActive && remainingProfiles.length > 0) {
      // Safe to access index 0 because we checked length > 0
      const firstRemaining = remainingProfiles[0];
      if (firstRemaining) {
        firstRemaining.isActive = true;
      }
    }

    await this.saveProfiles(remainingProfiles);
    await this.updateProfilesTimestamp();
  }

  /**
   * Set a profile as active by ID
   *
   * Design decision: Only one profile can be active at a time. Setting a profile as
   * active automatically deactivates all others. This ensures clear, predictable
   * behavior when switching between profiles.
   */
  async setActiveProfile(id: string): Promise<void> {
    const profiles = await this.getProfiles();
    
    const profileExists = profiles.some(p => p.id === id);
    if (!profileExists) {
      throw new Error(`Profile with ID ${id} not found`);
    }

    // Update active states
    profiles.forEach(p => {
      p.isActive = p.id === id;
    });

    await this.saveProfiles(profiles);
    await this.updateProfilesTimestamp();
  }

  /**
   * Get the currently active profile
   *
   * Returns undefined if no profiles exist or no profile is active.
   */
  async getActiveProfile(): Promise<ApiKeyProfile | undefined> {
    const profiles = await this.getProfiles();
    return profiles.find(p => p.isActive);
  }

  /**
   * Cycle to the next profile
   *
   * Design decision: Cyclic behavior means after the last profile, we wrap around
   * to the first. This provides a convenient way to quickly switch between profiles
   * without opening the full UI.
   */
  async cycleProfiles(): Promise<ApiKeyProfile | undefined> {
    const profiles = await this.getProfiles();
    
    if (profiles.length === 0) {
      return undefined;
    }

    if (profiles.length === 1) {
      return profiles[0];
    }

    // Find current active profile index
    const currentIndex = profiles.findIndex(p => p.isActive);
    
    // Calculate next index (with wrap-around)
    const nextIndex = (currentIndex + 1) % profiles.length;
    
    // Safe to access nextIndex because we checked profiles.length > 0 earlier
    const nextProfile = profiles[nextIndex];
    if (!nextProfile) {
      return undefined;
    }
    
    // Set next profile as active
    await this.setActiveProfile(nextProfile.id);
    
    // Return the newly activated profile
    return nextProfile;
  }

  /**
   * Register a callback for profile changes
   *
   * Design decision: Callback pattern allows the extension to react to profile changes
   * (e.g., refresh usage data when switching profiles) without tight coupling.
   */
  onProfilesChanged(callback: () => void): void {
    this.onProfilesChangedCallback = callback;
  }

  /**
   * Watch for cross-window profile changes
   *
   * Design decision: Polling is used because VSCode's globalState doesn't support
   * change events across windows. Polling every 5 seconds provides a good balance
   * between responsiveness and performance.
   */
  watchSharedStateChanges(pollInterval: number = 5000): vscode.Disposable {
    let lastKnownTimestamp = 0;
    
    this.getProfilesTimestamp().then(timestamp => {
      lastKnownTimestamp = timestamp;
    });

    const intervalId = setInterval(async () => {
      const currentTimestamp = await this.getProfilesTimestamp();
      if (currentTimestamp > lastKnownTimestamp) {
        lastKnownTimestamp = currentTimestamp;
        this.onProfilesChangedCallback?.();
      }
    }, pollInterval);

    this.sharedStateWatcherDisposable = {
      dispose: () => clearInterval(intervalId),
    };

    return this.sharedStateWatcherDisposable;
  }

  /**
   * Dispose of resources
   *
   * Design decision: Clean up the watcher to prevent memory leaks and unnecessary
   * polling after the extension deactivates.
   */
  dispose(): void {
    this.sharedStateWatcherDisposable?.dispose();
    this.sharedStateWatcherDisposable = null;
  }

  /**
   * Save profiles to secure storage
   *
   * Design decision: Private method to encapsulate storage details. Only the manager
   * should directly manipulate the stored profiles array.
   */
  private async saveProfiles(profiles: ApiKeyProfile[]): Promise<void> {
    const profilesJson = JSON.stringify(profiles);
    await this.context.secrets.store("syntheticApiKeys", profilesJson);
    
    // Clean up legacy single-key format if it exists
    await this.context.secrets.delete("syntheticApiKey");
  }

  /**
   * Update the shared state timestamp to signal that profiles have changed
   *
   * Design decision: This allows other VS Code windows to detect profile changes
   * and update their UI accordingly.
   */
  private async updateProfilesTimestamp(): Promise<void> {
    const timestamp = Date.now();
    await this.context.globalState.update(SHARED_STATE_KEYS.PROFILES_UPDATE_TIMESTAMP, timestamp);
  }

  /**
   * Get the profiles timestamp from shared state
   */
  private async getProfilesTimestamp(): Promise<number> {
    return this.context.globalState.get<number>(SHARED_STATE_KEYS.PROFILES_UPDATE_TIMESTAMP, 0);
  }

  /**
   * Generate a unique ID for a new profile
   *
   * Design decision: Use timestamp + random string for uniqueness. This is sufficient
   * for the use case and doesn't require external dependencies.
   */
  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `${timestamp}-${random}`;
  }

  /**
   * Get a display-safe version of an API key (last 6 characters only)
   *
   * Design decision: This is a utility method for UI display. The full key is never
   * exposed through this method, ensuring security in the UI layer.
   */
  static getDisplayKey(key: string): string {
    if (key.length <= 6) {
      return key;
    }
    return `syn_...${key.slice(-6)}`;
  }
}
