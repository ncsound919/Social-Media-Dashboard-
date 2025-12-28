/**
 * Analytics Engine - Core business logic for metrics and analytics
 * Following coding rule: Core services return simple dataclasses or dicts; UI is responsible for rendering
 */

import { 
  MetricSnapshotRepository, 
  AccountRepository,
  PostDraftRepository,
  ScheduledPostRepository
} from '@/data/repository';
import { AccountMetrics, Platform } from '@/data/models';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export interface KPIData {
  label: string;
  value: number;
  delta: number;
  deltaPercent: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface PlatformBreakdown {
  platform: Platform;
  label: string;
  impressions: number;
  engagementRate: number;
  followers: number;
}

export interface OverviewKPIs {
  totalReach: KPIData;
  followerDelta: KPIData;
  postsScheduled: KPIData;
  engagementRate: KPIData;
  totalImpressions: KPIData;
  totalEngagements: KPIData;
  activePlatforms: KPIData;
  avgPostingFrequency: KPIData;
}

export class AnalyticsEngine {
  constructor(
    private metricRepo: MetricSnapshotRepository,
    private accountRepo: AccountRepository,
    private draftRepo: PostDraftRepository,
    private scheduledRepo: ScheduledPostRepository
  ) {}

  getOverviewKPIs(): OverviewKPIs {
    const accounts = this.accountRepo.getAll();
    const activePlatforms = new Set(accounts.map(a => a.platform)).size;
    const scheduledPosts = this.scheduledRepo.getPending();
    
    // Aggregate metrics from all accounts
    let totalReach = 0;
    let totalImpressions = 0;
    let totalEngagements = 0;
    let totalFollowers = 0;
    let prevTotalFollowers = 0;

    accounts.forEach(account => {
      const latestSnapshot = this.metricRepo.getLatestByAccount(account.id);
      if (latestSnapshot) {
        totalReach += latestSnapshot.metrics.reach;
        totalImpressions += latestSnapshot.metrics.impressions;
        totalEngagements += latestSnapshot.metrics.engagements;
        totalFollowers += latestSnapshot.metrics.followers;
      }

      // Get snapshot from 7 days ago for delta
      const weekAgo = subDays(new Date(), 7);
      const oldSnapshots = this.metricRepo.getInDateRange(account.id, subDays(weekAgo, 1), weekAgo);
      if (oldSnapshots.length > 0) {
        prevTotalFollowers += oldSnapshots[0].metrics.followers;
      }
    });

    const followerDelta = totalFollowers - prevTotalFollowers;
    const engagementRate = totalImpressions > 0 
      ? (totalEngagements / totalImpressions) * 100 
      : 0;

    // Count posts in last 30 days (mock calculation)
    const drafts = this.draftRepo.getAll();
    const publishedCount = drafts.filter(d => d.status === 'published').length;
    const avgPostingFrequency = publishedCount > 0 ? publishedCount / 30 : 0;

    return {
      totalReach: this.createKPI('Total Reach', totalReach, totalReach * 0.9),
      followerDelta: this.createKPI('Follower Delta (7d)', followerDelta, 0),
      postsScheduled: this.createKPI('Posts Scheduled', scheduledPosts.length, scheduledPosts.length),
      engagementRate: this.createKPI('Engagement Rate', engagementRate, engagementRate * 0.95),
      totalImpressions: this.createKPI('Total Impressions', totalImpressions, totalImpressions * 0.9),
      totalEngagements: this.createKPI('Total Engagements', totalEngagements, totalEngagements * 0.85),
      activePlatforms: this.createKPI('Active Platforms', activePlatforms, activePlatforms),
      avgPostingFrequency: this.createKPI('Avg Posts/Day', avgPostingFrequency, avgPostingFrequency),
    };
  }

  private createKPI(label: string, current: number, previous: number): KPIData {
    const delta = current - previous;
    const deltaPercent = previous > 0 ? (delta / previous) * 100 : 0;
    return {
      label,
      value: current,
      delta,
      deltaPercent,
      trend: delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral',
    };
  }

  getEngagementTimeSeries(days: number = 30): {
    likes: TimeSeriesPoint[];
    comments: TimeSeriesPoint[];
    shares: TimeSeriesPoint[];
    saves: TimeSeriesPoint[];
  } {
    const accounts = this.accountRepo.getAll();
    const result: Record<string, Record<string, number>> = {};
    
    // Initialize days
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i).toISOString().split('T')[0];
      result[date] = { likes: 0, comments: 0, shares: 0, saves: 0 };
    }

    // Aggregate metrics by day
    accounts.forEach(account => {
      const snapshots = this.metricRepo.getInDateRange(
        account.id,
        startOfDay(subDays(new Date(), days)),
        endOfDay(new Date())
      );
      snapshots.forEach(snapshot => {
        const date = new Date(snapshot.capturedAt).toISOString().split('T')[0];
        if (result[date]) {
          result[date].likes += snapshot.metrics.likes;
          result[date].comments += snapshot.metrics.comments;
          result[date].shares += snapshot.metrics.shares;
          result[date].saves += snapshot.metrics.saves;
        }
      });
    });

    return {
      likes: Object.entries(result).map(([date, v]) => ({ date, value: v.likes })),
      comments: Object.entries(result).map(([date, v]) => ({ date, value: v.comments })),
      shares: Object.entries(result).map(([date, v]) => ({ date, value: v.shares })),
      saves: Object.entries(result).map(([date, v]) => ({ date, value: v.saves })),
    };
  }

  getPlatformBreakdown(): PlatformBreakdown[] {
    const accounts = this.accountRepo.getAll();
    const platformLabels: Record<Platform, string> = {
      twitter_x: 'Twitter / X',
      facebook_pages: 'Facebook',
      instagram_business: 'Instagram',
      linkedin_pages: 'LinkedIn',
      tiktok: 'TikTok',
      youtube: 'YouTube',
      pinterest: 'Pinterest',
      threads: 'Threads',
      bluesky: 'Bluesky',
    };

    const breakdown: Record<Platform, PlatformBreakdown> = {} as Record<Platform, PlatformBreakdown>;

    accounts.forEach(account => {
      if (!breakdown[account.platform]) {
        breakdown[account.platform] = {
          platform: account.platform,
          label: platformLabels[account.platform],
          impressions: 0,
          engagementRate: 0,
          followers: 0,
        };
      }

      const snapshot = this.metricRepo.getLatestByAccount(account.id);
      if (snapshot) {
        breakdown[account.platform].impressions += snapshot.metrics.impressions;
        breakdown[account.platform].followers += snapshot.metrics.followers;
        breakdown[account.platform].engagementRate = snapshot.metrics.engagementRate;
      }
    });

    return Object.values(breakdown);
  }

  getAccountMetrics(accountId: string): AccountMetrics | null {
    const snapshot = this.metricRepo.getLatestByAccount(accountId);
    return snapshot ? snapshot.metrics : null;
  }
}
