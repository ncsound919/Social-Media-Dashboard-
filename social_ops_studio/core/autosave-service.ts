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
  private autosaveTimers: Map<string, NodeJS.Timeout> = new Map();
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

    this.autosaveTimers.set(postDraftId, timer);
  }

  /**
   * Stop autosaving for a post draft
   */
  stopAutosave(postDraftId: string): void {
    const timer = this.autosaveTimers.get(postDraftId);
    if (timer) {
      clearInterval(timer);
      this.autosaveTimers.delete(postDraftId);
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
    
    const newState: AutosaveState = {
      postDraftId: draft.id,
      content: this.extractChanges(draft),
      savedAt: new Date(),
      version: existingStates.length + 1,
    };

    // Add new state
    states.push(newState);

    // Keep only the latest maxVersions states per draft
    const draftStates = states.filter(s => s.postDraftId === draft.id);
    if (draftStates.length > this.config.maxVersions) {
      const toRemove = draftStates.length - this.config.maxVersions;
      const removeStates = draftStates.slice(0, toRemove);
      const filteredStates = states.filter(s => !removeStates.includes(s));
      this.saveAllStates(filteredStates);
    } else {
      this.saveAllStates(states);
    }
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
    localStorage.setItem(this.storageKey, JSON.stringify(states));
  }

  /**
   * Clean up on unmount
   */
  cleanup(): void {
    this.autosaveTimers.forEach(timer => clearTimeout(timer));
    this.autosaveTimers.clear();
    this.pendingChanges.clear();
  }
}
