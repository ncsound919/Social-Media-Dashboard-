/**
 * Evergreen Content Service
 * Smart Automation: Tag and recycle timeless content
 */

import { v4 as uuidv4 } from 'uuid';
import { EvergreenContent, PostDraft, ScheduledPost } from '../data/models';

export interface RecycleConfig {
  minEngagementRate: number; // Minimum engagement rate to qualify as evergreen
  defaultRecycleFrequency: number; // Days between reposts
  maxRecycleCount?: number; // Optional limit on number of times to recycle
}

const defaultRecycleConfig: RecycleConfig = {
  minEngagementRate: 5.0, // 5% engagement rate
  defaultRecycleFrequency: 30, // 30 days
  maxRecycleCount: 10,
};

export class EvergreenContentService {
  private readonly config: RecycleConfig;
  private readonly storageKey = 'evergreen_content';

  constructor(config?: Partial<RecycleConfig>) {
    this.config = { ...defaultRecycleConfig, ...config };
  }

  /**
   * Mark a post as evergreen
   */
  markAsEvergreen(
    postDraftId: string,
    recycleFrequency?: number,
    performanceThreshold?: number
  ): EvergreenContent {
    const evergreen: EvergreenContent = {
      postDraftId,
      isEvergreen: true,
      recycleFrequency: recycleFrequency || this.config.defaultRecycleFrequency,
      lastRecycledAt: null,
      nextRecycleAt: this.calculateNextRecycleDate(recycleFrequency),
      recycleCount: 0,
      performanceThreshold: performanceThreshold || this.config.minEngagementRate,
    };

    this.saveEvergreenContent(evergreen);
    return evergreen;
  }

  /**
   * Remove evergreen status from a post
   */
  unmarkAsEvergreen(postDraftId: string): void {
    const allContent = this.getAllEvergreenContent();
    const filtered = allContent.filter(e => e.postDraftId !== postDraftId);
    this.saveAllEvergreenContent(filtered);
  }

  /**
   * Check if a post should be recycled
   */
  shouldRecycle(postDraftId: string): boolean {
    const evergreen = this.getEvergreenContent(postDraftId);
    if (!evergreen || !evergreen.isEvergreen) return false;

    // Check if max recycle count reached
    if (this.config.maxRecycleCount && evergreen.recycleCount >= this.config.maxRecycleCount) {
      return false;
    }

    // Check if it's time to recycle
    if (!evergreen.nextRecycleAt) return false;
    return new Date() >= new Date(evergreen.nextRecycleAt);
  }

  /**
   * Automatically detect high-performing posts that qualify as evergreen
   */
  autoDetectEvergreen(
    postDraftId: string,
    engagementRate: number
  ): EvergreenContent | null {
    if (engagementRate < this.config.minEngagementRate) {
      return null;
    }

    // Check if already marked as evergreen
    const existing = this.getEvergreenContent(postDraftId);
    if (existing) {
      return existing;
    }

    // Automatically mark as evergreen
    return this.markAsEvergreen(postDraftId);
  }

  /**
   * Record that a post was recycled
   */
  recordRecycle(postDraftId: string): EvergreenContent | null {
    const allContent = this.getAllEvergreenContent();
    const evergreen = allContent.find(e => e.postDraftId === postDraftId);

    if (!evergreen) return null;

    evergreen.lastRecycledAt = new Date();
    evergreen.recycleCount++;
    evergreen.nextRecycleAt = this.calculateNextRecycleDate(evergreen.recycleFrequency);

    this.saveAllEvergreenContent(allContent);
    return evergreen;
  }

  /**
   * Get posts ready for recycling
   */
  getPostsReadyForRecycle(): EvergreenContent[] {
    const allContent = this.getAllEvergreenContent();
    return allContent.filter(e => this.shouldRecycle(e.postDraftId));
  }

  /**
   * Get all evergreen posts
   */
  getAllEvergreen(): EvergreenContent[] {
    return this.getAllEvergreenContent().filter(e => e.isEvergreen);
  }

  /**
   * Suggest optimal time slots for recycled content
   */
  suggestRecycleSlot(existingSchedule: ScheduledPost[]): Date | null {
    const minGapHours = 2; // Minimum 2 hours between posts
    const minGapMs = minGapHours * 60 * 60 * 1000;
    
    // Find gaps in the schedule
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // Look 7 days ahead

    const scheduledTimes = existingSchedule
      .map(s => new Date(s.scheduledFor))
      .filter(d => d >= now && d <= futureDate)
      .sort((a, b) => a.getTime() - b.getTime());

    // If no scheduled posts, suggest tomorrow at 9 AM
    if (scheduledTimes.length === 0) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      return tomorrow;
    }

    // Find the largest gap between scheduled posts that meets minimum threshold
    let largestGap = 0;
    let suggestedTime: Date | null = null;

    for (let i = 0; i < scheduledTimes.length - 1; i++) {
      const gap = scheduledTimes[i + 1].getTime() - scheduledTimes[i].getTime();
      if (gap > largestGap && gap >= minGapMs) {
        largestGap = gap;
        // Suggest midpoint of the gap
        const midpoint = new Date(scheduledTimes[i].getTime() + gap / 2);
        suggestedTime = midpoint;
      }
    }

    return suggestedTime;
  }

  /**
   * Update evergreen settings
   */
  updateSettings(
    postDraftId: string,
    updates: Partial<Omit<EvergreenContent, 'postDraftId'>>
  ): EvergreenContent | null {
    const allContent = this.getAllEvergreenContent();
    const evergreen = allContent.find(e => e.postDraftId === postDraftId);

    if (!evergreen) return null;

    Object.assign(evergreen, updates);

    // Recalculate next recycle date if frequency changed
    if (updates.recycleFrequency) {
      evergreen.nextRecycleAt = this.calculateNextRecycleDate(updates.recycleFrequency);
    }

    this.saveAllEvergreenContent(allContent);
    return evergreen;
  }

  /**
   * Calculate next recycle date
   */
  private calculateNextRecycleDate(frequency?: number): Date {
    const days = frequency || this.config.defaultRecycleFrequency;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
  }

  /**
   * Get evergreen content for a specific post
   */
  private getEvergreenContent(postDraftId: string): EvergreenContent | null {
    const allContent = this.getAllEvergreenContent();
    return allContent.find(e => e.postDraftId === postDraftId) || null;
  }

  /**
   * Save a single evergreen content entry
   */
  private saveEvergreenContent(content: EvergreenContent): void {
    const allContent = this.getAllEvergreenContent();
    const index = allContent.findIndex(e => e.postDraftId === content.postDraftId);

    if (index >= 0) {
      allContent[index] = content;
    } else {
      allContent.push(content);
    }

    this.saveAllEvergreenContent(allContent);
  }

  /**
   * Get all evergreen content from storage
   */
  private getAllEvergreenContent(): EvergreenContent[] {
    if (typeof window === 'undefined') return [];

    const stored = localStorage.getItem(this.storageKey);
    if (!stored) return [];

    try {
      const parsed = JSON.parse(stored);
      return parsed.map((content: any) => ({
        ...content,
        lastRecycledAt: content.lastRecycledAt ? new Date(content.lastRecycledAt) : null,
        nextRecycleAt: content.nextRecycleAt ? new Date(content.nextRecycleAt) : null,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Save all evergreen content to storage
   */
  private saveAllEvergreenContent(content: EvergreenContent[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.storageKey, JSON.stringify(content));
  }
}
