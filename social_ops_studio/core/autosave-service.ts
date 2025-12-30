/**
 * Autosave service for draft protection
 * Workflow Protection: Aggressive autosave to prevent data loss
 */

import { PostDraft, AutosaveState } from '../data/models';

export interface AutosaveConfig {
  interval: number; // milliseconds
  maxVersions: number;
  debounceTime: number; // milliseconds
}

const defaultAutosaveConfig: AutosaveConfig = {
  interval: 5000, // 5 seconds
  maxVersions: 50,
  debounceTime: 1000, // 1 second
};

export class AutosaveService {
  private readonly config: AutosaveConfig;
  private autosaveTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private intervalTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private pendingChanges: Map<string, Partial<PostDraft>> = new Map();
  private readonly storageKey = 'autosave_states';

  constructor(config?: Partial<AutosaveConfig>) {
    this.config = { ...defaultAutosaveConfig, ...config };
  }

  /**
   * Start autosaving for a post draft
   */
  startAutosave(postDraftId: string, getCurrentDraft: () => PostDraft): void {
    // Clear existing timer if any
    this.stopAutosave(postDraftId);

    // Set up periodic autosave
    const timer = setInterval(() => {
      const draft = getCurrentDraft();
      this.saveState(draft);
    }, this.config.interval);

    this.intervalTimers.set(postDraftId, timer);
  }

  /**
   * Stop autosaving for a post draft
   */
  stopAutosave(postDraftId: string): void {
    const intervalTimer = this.intervalTimers.get(postDraftId);
    if (intervalTimer) {
      clearInterval(intervalTimer);
      this.intervalTimers.delete(postDraftId);
    }
    
    const debounceTimer = this.autosaveTimers.get(`debounce_${postDraftId}`);
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      this.autosaveTimers.delete(`debounce_${postDraftId}`);
    }
    
    this.pendingChanges.delete(postDraftId);
  }

  /**
   * Trigger an immediate save with debouncing
   */
  triggerSave(draft: PostDraft): void {
    const existing = this.pendingChanges.get(draft.id);
    
    // Merge with existing pending changes
    this.pendingChanges.set(draft.id, {
      ...existing,
      ...this.extractChanges(draft),
      updatedAt: new Date(),
    });

    // Debounce the actual save
    const existingTimer = this.autosaveTimers.get(`debounce_${draft.id}`);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      const changes = this.pendingChanges.get(draft.id);
      if (changes) {
        this.saveState({ ...draft, ...changes });
        this.pendingChanges.delete(draft.id);
      }
    }, this.config.debounceTime);

    this.autosaveTimers.set(`debounce_${draft.id}`, timer);
  }

  /**
   * Save current state to storage
   */
  private saveState(draft: PostDraft): void {
    const states = this.getAllStates();
    const existingStates = states.filter(s => s.postDraftId === draft.id);
    
    // Calculate next version from max existing version (not from count)
    const maxVersion = existingStates.length > 0
      ? Math.max(...existingStates.map(s => s.version))
      : 0;
    
    const newState: AutosaveState = {
      postDraftId: draft.id,
      content: this.extractChanges(draft),
      savedAt: new Date(),
      version: maxVersion + 1,
    };

    // Add new state
    states.push(newState);

    // Keep only the latest maxVersions states per draft in a single pass
    let keptForDraft = 0;
    const filteredStates: AutosaveState[] = [];

    // Traverse from newest to oldest so we keep the most recent versions
    for (let i = states.length - 1; i >= 0; i--) {
      const state = states[i];

      if (state.postDraftId === draft.id) {
        if (keptForDraft < this.config.maxVersions) {
          keptForDraft++;
          filteredStates.push(state);
        }
      } else {
        filteredStates.push(state);
      }
    }

    // Reverse to restore original chronological order
    filteredStates.reverse();
    this.saveAllStates(filteredStates);
  }

  /**
   * Extract changes from a draft for autosave
   */
  private extractChanges(draft: PostDraft): Partial<PostDraft> {
    return {
      title: draft.title,
      bodyRich: draft.bodyRich,
      platformVariants: draft.platformVariants,
      tags: draft.tags,
      status: draft.status,
      campaignId: draft.campaignId,
      updatedAt: draft.updatedAt,
    };
  }

  /**
   * Restore the latest saved state for a draft
   */
  restoreLatestState(postDraftId: string): AutosaveState | null {
    const states = this.getAllStates();
    const draftStates = states
      .filter(s => s.postDraftId === postDraftId)
      .sort((a, b) => b.version - a.version);
    
    return draftStates[0] || null;
  }

  /**
   * Get all saved states for a draft
   */
  getStateHistory(postDraftId: string): AutosaveState[] {
    const states = this.getAllStates();
    return states
      .filter(s => s.postDraftId === postDraftId)
      .sort((a, b) => b.version - a.version);
  }

  /**
   * Clear autosave states for a draft
   */
  clearStates(postDraftId: string): void {
    const states = this.getAllStates();
    const filteredStates = states.filter(s => s.postDraftId !== postDraftId);
    this.saveAllStates(filteredStates);
  }

  /**
   * Get all autosave states from storage
   */
  private getAllStates(): AutosaveState[] {
    if (typeof window === 'undefined') return [];
    
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) return [];
    
    try {
      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      return parsed.map((state: any) => ({
        ...state,
        savedAt: new Date(state.savedAt),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Save all autosave states to storage
   */
  private saveAllStates(states: AutosaveState[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(states));
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('Failed to save autosave states: Storage quota exceeded');
        throw new Error('Storage quota exceeded. Please free up space and try again.');
      }
      throw error;
    }
  }

  /**
   * Clean up on unmount
   */
  cleanup(): void {
    this.autosaveTimers.forEach(timer => clearTimeout(timer));
    this.intervalTimers.forEach(timer => clearInterval(timer));
    this.autosaveTimers.clear();
    this.intervalTimers.clear();
    this.pendingChanges.clear();
  }
}
