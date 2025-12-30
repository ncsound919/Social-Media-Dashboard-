/**
 * Content Pillars Service
 * Workflow Protection: Organize ideas into strategic pillars
 */

import { v4 as uuidv4 } from 'uuid';
import { ContentPillar, PostDraft } from '../data/models';

// Common stop words to filter out when matching keywords
const STOP_WORDS = new Set(['and', 'the', 'for', 'to', 'a', 'an', 'of', 'in', 'on', 'is', 'it', 'at', 'by', 'or', 'be', 'this', 'that', 'with', 'from']);

export class ContentPillarService {
  private readonly storageKey = 'content_pillars';

  /**
   * Create a new content pillar
   */
  createPillar(
    name: string,
    description: string,
    category: ContentPillar['category'],
    color: string,
    targetFrequency?: number
  ): ContentPillar {
    const pillar: ContentPillar = {
      id: uuidv4(),
      name,
      description,
      category,
      color,
      postIds: [],
      targetFrequency,
    };

    const pillars = this.getAllPillars();
    pillars.push(pillar);
    this.saveAllPillars(pillars);

    return pillar;
  }

  /**
   * Add a post to a pillar
   */
  addPostToPillar(pillarId: string, postDraftId: string): ContentPillar | null {
    const pillars = this.getAllPillars();
    const pillar = pillars.find(p => p.id === pillarId);

    if (!pillar) return null;

    if (!pillar.postIds.includes(postDraftId)) {
      pillar.postIds.push(postDraftId);
      this.saveAllPillars(pillars);
    }

    return pillar;
  }

  /**
   * Remove a post from a pillar
   */
  removePostFromPillar(pillarId: string, postDraftId: string): ContentPillar | null {
    const pillars = this.getAllPillars();
    const pillar = pillars.find(p => p.id === pillarId);

    if (!pillar) return null;

    pillar.postIds = pillar.postIds.filter(id => id !== postDraftId);
    this.saveAllPillars(pillars);

    return pillar;
  }

  /**
   * Get all pillars
   */
  getAllPillars(): ContentPillar[] {
    if (typeof window === 'undefined') return [];

    const stored = localStorage.getItem(this.storageKey);
    if (!stored) return this.createDefaultPillars();

    try {
      return JSON.parse(stored);
    } catch {
      return this.createDefaultPillars();
    }
  }

  /**
   * Get a specific pillar
   */
  getPillar(pillarId: string): ContentPillar | null {
    const pillars = this.getAllPillars();
    return pillars.find(p => p.id === pillarId) || null;
  }

  /**
   * Update a pillar
   */
  updatePillar(
    pillarId: string,
    updates: Partial<Omit<ContentPillar, 'id' | 'postIds'>>
  ): ContentPillar | null {
    const pillars = this.getAllPillars();
    const pillar = pillars.find(p => p.id === pillarId);

    if (!pillar) return null;

    Object.assign(pillar, updates);
    this.saveAllPillars(pillars);

    return pillar;
  }

  /**
   * Delete a pillar
   */
  deletePillar(pillarId: string): boolean {
    const pillars = this.getAllPillars();
    const filtered = pillars.filter(p => p.id !== pillarId);

    if (filtered.length === pillars.length) return false;

    this.saveAllPillars(filtered);
    return true;
  }

  /**
   * Get pillars for a post
   */
  getPostPillars(postDraftId: string): ContentPillar[] {
    const pillars = this.getAllPillars();
    return pillars.filter(p => p.postIds.includes(postDraftId));
  }

  /**
   * Get content distribution across pillars
   */
  getDistribution(): Record<string, number> {
    const pillars = this.getAllPillars();
    const distribution: Record<string, number> = {};

    pillars.forEach(pillar => {
      distribution[pillar.name] = pillar.postIds.length;
    });

    return distribution;
  }

  /**
   * Suggest a pillar for a post based on content
   */
  suggestPillar(draft: PostDraft): ContentPillar | null {
    const pillars = this.getAllPillars();
    const text = (draft.bodyRich + ' ' + draft.title).toLowerCase();

    // Simple keyword-based matching
    for (const pillar of pillars) {
      const keywords = pillar.description
        .toLowerCase()
        .split(/\s+/)
        .filter(keyword => keyword.length > 2 && !STOP_WORDS.has(keyword));
      const matches = keywords.filter(keyword => text.includes(keyword));

      if (matches.length >= 2) {
        return pillar;
      }
    }

    return null;
  }

  /**
   * Create default content pillars
   */
  private createDefaultPillars(): ContentPillar[] {
    const defaultPillars: ContentPillar[] = [
      {
        id: uuidv4(),
        name: 'Educational',
        description: 'How-to guides, tutorials, tips, and industry insights',
        category: 'educational',
        color: '#00F5D4',
        postIds: [],
        targetFrequency: 3,
      },
      {
        id: uuidv4(),
        name: 'Promotional',
        description: 'Product launches, sales, announcements, and offers',
        category: 'promotional',
        color: '#FF6F91',
        postIds: [],
        targetFrequency: 2,
      },
      {
        id: uuidv4(),
        name: 'Engagement',
        description: 'Questions, polls, discussions, and community interaction',
        category: 'engagement',
        color: '#5B5FFF',
        postIds: [],
        targetFrequency: 4,
      },
      {
        id: uuidv4(),
        name: 'Inspirational',
        description: 'Motivational quotes, success stories, and thought leadership',
        category: 'inspirational',
        color: '#FFD700',
        postIds: [],
        targetFrequency: 2,
      },
    ];

    this.saveAllPillars(defaultPillars);
    return defaultPillars;
  }

  /**
   * Save all pillars to storage
   */
  private saveAllPillars(pillars: ContentPillar[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(pillars));
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('Failed to save content pillars: Storage quota exceeded');
        throw new Error('Storage quota exceeded. Please free up space and try again.');
      }
      throw error;
    }
  }

  /**
   * Check if pillars meet target frequency
   * Thresholds: under (<80% of target), on-track (80-120% of target), over (>120% of target)
   */
  checkFrequencyTargets(weeklyPostCountByPillarId: Record<string, number>): {
    pillar: ContentPillar;
    target: number;
    actual: number;
    status: 'under' | 'on-track' | 'over';
  }[] {
    const pillars = this.getAllPillars();
    const results = [];

    for (const pillar of pillars) {
      if (!pillar.targetFrequency) continue;

      const actual = weeklyPostCountByPillarId[pillar.id] || 0;
      const target = pillar.targetFrequency;

      let status: 'under' | 'on-track' | 'over';
      // Thresholds: 20% tolerance on either side of target
      if (actual < target * 0.8) {
        status = 'under';
      } else if (actual > target * 1.2) {
        status = 'over';
      } else {
        status = 'on-track';
      }

      results.push({ pillar, target, actual, status });
    }

    return results;
  }
}
