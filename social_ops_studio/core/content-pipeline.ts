/**
 * Content Pipeline Service - Business logic for content workflow management
 * Following coding rule: Core services return simple dataclasses or dicts
 */

import { PostDraftRepository, ScheduledPostRepository, AccountRepository } from '@/data/repository';
import { PostDraft, ContentStatus, Platform, ScheduledPost, PlatformVariant } from '@/data/models';
import { v4 as uuidv4 } from 'uuid';

export interface PipelineItem {
  id: string;
  title: string;
  stage: ContentStatus;
  platformTags: Platform[];
  campaignId: string | null;
  createdAt: Date;
  updatedAt: Date;
  scheduledFor?: Date;
}

export type PipelineBoard = Record<ContentStatus, PipelineItem[]>;

export interface CreateDraftInput {
  title: string;
  bodyRich: string;
  platforms: Platform[];
  tags: string[];
  campaignId?: string;
}

export class ContentPipelineService {
  constructor(
    private draftRepo: PostDraftRepository,
    private scheduledRepo: ScheduledPostRepository,
    private accountRepo: AccountRepository
  ) {}

  getBoard(): PipelineBoard {
    const drafts = this.draftRepo.getAll();
    const stages: ContentStatus[] = ['idea', 'drafting', 'ready', 'scheduled', 'published', 'evergreen'];
    
    const board: PipelineBoard = {
      idea: [],
      drafting: [],
      ready: [],
      scheduled: [],
      published: [],
      evergreen: [],
    };

    drafts.forEach(draft => {
      const platforms = Object.keys(draft.platformVariants).filter(
        p => draft.platformVariants[p as Platform]?.body
      ) as Platform[];

      board[draft.status].push({
        id: draft.id,
        title: draft.title,
        stage: draft.status,
        platformTags: platforms,
        campaignId: draft.campaignId,
        createdAt: new Date(draft.createdAt),
        updatedAt: new Date(draft.updatedAt),
      });
    });

    // Sort by updated date
    stages.forEach(stage => {
      board[stage].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    });

    return board;
  }

  moveItem(draftId: string, newStage: ContentStatus): PostDraft | null {
    const draft = this.draftRepo.getById(draftId);
    if (!draft) return null;

    const updatedDraft: PostDraft = {
      ...draft,
      status: newStage,
      updatedAt: new Date(),
    };

    this.draftRepo.save(updatedDraft);
    return updatedDraft;
  }

  createDraft(input: CreateDraftInput): PostDraft {
    const variants: Record<Platform, PlatformVariant> = {} as Record<Platform, PlatformVariant>;
    
    input.platforms.forEach(platform => {
      variants[platform] = {
        body: input.bodyRich,
        mediaIds: [],
        hashtags: [],
        scheduledFor: null,
      };
    });

    const draft: PostDraft = {
      id: uuidv4(),
      title: input.title,
      bodyRich: input.bodyRich,
      platformVariants: variants,
      tags: input.tags,
      status: 'idea',
      campaignId: input.campaignId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.draftRepo.save(draft);
    return draft;
  }

  updateDraft(id: string, updates: Partial<PostDraft>): PostDraft | null {
    const draft = this.draftRepo.getById(id);
    if (!draft) return null;

    const updatedDraft: PostDraft = {
      ...draft,
      ...updates,
      id: draft.id, // Prevent id change
      updatedAt: new Date(),
    };

    this.draftRepo.save(updatedDraft);
    return updatedDraft;
  }

  deleteDraft(id: string): boolean {
    const draft = this.draftRepo.getById(id);
    if (!draft) return false;

    this.draftRepo.delete(id);
    return true;
  }

  scheduleDraft(draftId: string, accountId: string, scheduledFor: Date): ScheduledPost | null {
    const draft = this.draftRepo.getById(draftId);
    const account = this.accountRepo.getById(accountId);
    
    if (!draft || !account) return null;

    const scheduledPost: ScheduledPost = {
      id: uuidv4(),
      accountId,
      postDraftId: draftId,
      scheduledFor,
      status: 'pending',
      errorMessage: null,
      publishedPostId: null,
    };

    this.scheduledRepo.save(scheduledPost);
    this.moveItem(draftId, 'scheduled');

    return scheduledPost;
  }

  getItemsByStatus(status: ContentStatus): PipelineItem[] {
    return this.getBoard()[status];
  }

  getItemsByCampaign(campaignId: string): PipelineItem[] {
    const drafts = this.draftRepo.getByCampaign(campaignId);
    return drafts.map(draft => ({
      id: draft.id,
      title: draft.title,
      stage: draft.status,
      platformTags: Object.keys(draft.platformVariants) as Platform[],
      campaignId: draft.campaignId,
      createdAt: new Date(draft.createdAt),
      updatedAt: new Date(draft.updatedAt),
    }));
  }

  markAsEvergreen(draftId: string): PostDraft | null {
    return this.moveItem(draftId, 'evergreen');
  }
}
