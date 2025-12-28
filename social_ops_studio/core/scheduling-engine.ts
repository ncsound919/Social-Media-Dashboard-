/**
 * Scheduling Engine - Business logic for post scheduling
 * Following coding rule: Exception handling with logging
 */

import { ScheduledPostRepository, PostDraftRepository, AccountRepository } from '@/data/repository';
import { ScheduledPost, PostDraft, Account, Platform } from '@/data/models';
import { addDays, addHours, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { logger } from '@/utils/logging';

export interface TimeSlot {
  date: Date;
  hour: number;
  available: boolean;
  postId?: string;
}

export interface CalendarDay {
  date: Date;
  posts: ScheduledPostWithDetails[];
}

export interface ScheduledPostWithDetails extends ScheduledPost {
  draft: PostDraft | null;
  account: Account | null;
}

export interface ConflictWarning {
  type: 'same_content' | 'too_close' | 'outside_optimal_hours';
  message: string;
  suggestedSlot?: Date;
}

export class SchedulingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchedulingError';
  }
}

export class SchedulingEngine {
  private optimalHours: Record<Platform, number[]> = {
    twitter_x: [9, 10, 12, 13, 17, 18],
    facebook_pages: [9, 12, 15, 18, 21],
    instagram_business: [11, 12, 17, 18, 19],
    linkedin_pages: [7, 8, 9, 12, 17],
    tiktok: [7, 9, 12, 15, 19, 22],
    youtube: [12, 15, 17, 18, 19],
    pinterest: [8, 13, 20, 21],
    threads: [10, 12, 17, 19],
    bluesky: [9, 12, 17, 20],
  };

  constructor(
    private scheduledRepo: ScheduledPostRepository,
    private draftRepo: PostDraftRepository,
    private accountRepo: AccountRepository
  ) {}

  schedulePost(
    draftId: string, 
    accountId: string, 
    scheduledFor: Date
  ): ScheduledPost {
    try {
      const draft = this.draftRepo.getById(draftId);
      const account = this.accountRepo.getById(accountId);

      if (!draft) {
        throw new SchedulingError(`Draft not found: ${draftId}`);
      }
      if (!account) {
        throw new SchedulingError(`Account not found: ${accountId}`);
      }

      // Check for conflicts
      const conflicts = this.checkConflicts(draftId, accountId, scheduledFor);
      if (conflicts.length > 0) {
        logger.warn('Scheduling conflicts detected', { draftId, conflicts });
      }

      const scheduledPost: ScheduledPost = {
        id: crypto.randomUUID(),
        accountId,
        postDraftId: draftId,
        scheduledFor,
        status: 'pending',
        errorMessage: null,
        publishedPostId: null,
      };

      this.scheduledRepo.save(scheduledPost);
      logger.info('Post scheduled successfully', { postId: scheduledPost.id, scheduledFor });

      return scheduledPost;
    } catch (error) {
      logger.error('Failed to schedule post', { draftId, accountId, error });
      throw error instanceof SchedulingError 
        ? error 
        : new SchedulingError(String(error));
    }
  }

  cancelScheduledPost(postId: string): void {
    try {
      const post = this.scheduledRepo.getById(postId);
      if (!post) {
        throw new SchedulingError(`Scheduled post not found: ${postId}`);
      }

      this.scheduledRepo.delete(postId);
      logger.info('Scheduled post cancelled', { postId });
    } catch (error) {
      logger.error('Failed to cancel scheduled post', { postId, error });
      throw error instanceof SchedulingError 
        ? error 
        : new SchedulingError(String(error));
    }
  }

  reschedulePost(postId: string, newDate: Date): ScheduledPost {
    try {
      const post = this.scheduledRepo.getById(postId);
      if (!post) {
        throw new SchedulingError(`Scheduled post not found: ${postId}`);
      }

      const updatedPost: ScheduledPost = {
        ...post,
        scheduledFor: newDate,
      };

      this.scheduledRepo.save(updatedPost);
      logger.info('Post rescheduled', { postId, newDate });

      return updatedPost;
    } catch (error) {
      logger.error('Failed to reschedule post', { postId, error });
      throw error instanceof SchedulingError 
        ? error 
        : new SchedulingError(String(error));
    }
  }

  checkConflicts(draftId: string, accountId: string, scheduledFor: Date): ConflictWarning[] {
    const warnings: ConflictWarning[] = [];
    const account = this.accountRepo.getById(accountId);
    
    if (!account) return warnings;

    // Check for same content posted recently
    const existingPosts = this.scheduledRepo.getByAccount(accountId);
    const sameContentPost = existingPosts.find(p => 
      p.postDraftId === draftId && 
      Math.abs(new Date(p.scheduledFor).getTime() - scheduledFor.getTime()) < 7 * 24 * 60 * 60 * 1000
    );

    if (sameContentPost) {
      warnings.push({
        type: 'same_content',
        message: 'Same content was recently scheduled for this account',
        suggestedSlot: addDays(scheduledFor, 7),
      });
    }

    // Check for posts too close together
    const nearbyPost = existingPosts.find(p => 
      Math.abs(new Date(p.scheduledFor).getTime() - scheduledFor.getTime()) < 2 * 60 * 60 * 1000
    );

    if (nearbyPost) {
      warnings.push({
        type: 'too_close',
        message: 'Another post is scheduled within 2 hours',
        suggestedSlot: addHours(new Date(nearbyPost.scheduledFor), 3),
      });
    }

    // Check for optimal posting hours
    const hour = scheduledFor.getHours();
    const optimalHours = this.optimalHours[account.platform] || [];
    if (!optimalHours.includes(hour)) {
      const nearestOptimal = optimalHours.reduce((a, b) => 
        Math.abs(b - hour) < Math.abs(a - hour) ? b : a
      );
      const suggestedDate = new Date(scheduledFor);
      suggestedDate.setHours(nearestOptimal, 0, 0, 0);
      
      warnings.push({
        type: 'outside_optimal_hours',
        message: `${hour}:00 is not an optimal posting time for ${account.platform}`,
        suggestedSlot: suggestedDate,
      });
    }

    return warnings;
  }

  getCalendar(month: number, year: number): CalendarDay[] {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    const days: CalendarDay[] = [];

    const allScheduled = this.scheduledRepo.getAll();

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayStart = startOfDay(d);
      const dayEnd = endOfDay(d);

      const postsOnDay = allScheduled
        .filter(p => {
          const postDate = new Date(p.scheduledFor);
          return isWithinInterval(postDate, { start: dayStart, end: dayEnd });
        })
        .map(p => ({
          ...p,
          draft: this.draftRepo.getById(p.postDraftId),
          account: this.accountRepo.getById(p.accountId),
        }));

      days.push({
        date: new Date(d),
        posts: postsOnDay,
      });
    }

    return days;
  }

  getAvailableSlots(accountId: string, date: Date): TimeSlot[] {
    const account = this.accountRepo.getById(accountId);
    if (!account) return [];

    const slots: TimeSlot[] = [];
    const existingPosts = this.scheduledRepo.getByAccount(accountId);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const postsOnDay = existingPosts.filter(p => 
      isWithinInterval(new Date(p.scheduledFor), { start: dayStart, end: dayEnd })
    );

    const bookedHours = new Set(postsOnDay.map(p => new Date(p.scheduledFor).getHours()));
    const optimal = this.optimalHours[account.platform] || [];

    for (let hour = 6; hour <= 23; hour++) {
      slots.push({
        date: new Date(date.setHours(hour, 0, 0, 0)),
        hour,
        available: !bookedHours.has(hour),
        postId: postsOnDay.find(p => new Date(p.scheduledFor).getHours() === hour)?.id,
      });
    }

    // Sort: optimal hours first, then by hour
    slots.sort((a, b) => {
      const aOptimal = optimal.includes(a.hour) ? 0 : 1;
      const bOptimal = optimal.includes(b.hour) ? 0 : 1;
      return aOptimal - bOptimal || a.hour - b.hour;
    });

    return slots;
  }

  getUpcomingPosts(limit: number = 5): ScheduledPostWithDetails[] {
    const upcoming = this.scheduledRepo.getUpcoming(limit);
    return upcoming.map(p => ({
      ...p,
      draft: this.draftRepo.getById(p.postDraftId),
      account: this.accountRepo.getById(p.accountId),
    }));
  }
}
