/**
 * Base adapter interface for social platform integrations
 * Following coding rule: One adapter per platform, typed interface
 */

import { Platform, AccountMetrics } from '@/data/models';

export interface PublishResult {
  success: boolean;
  remoteId: string | null;
  errorMessage: string | null;
  publishedAt?: Date;
}

export interface FetchMetricsResult {
  success: boolean;
  metrics: AccountMetrics | null;
  errorMessage: string | null;
}

export interface MediaUploadResult {
  success: boolean;
  mediaId: string | null;
  errorMessage: string | null;
}

export interface PostContent {
  text: string;
  mediaIds: string[];
  hashtags: string[];
}

export abstract class SocialPlatformAdapter {
  abstract readonly platform: Platform;
  abstract readonly displayName: string;
  abstract readonly primaryColor: string;
  abstract readonly supports: string[];

  abstract publishPost(content: PostContent): Promise<PublishResult>;
  abstract fetchBasicMetrics(): Promise<FetchMetricsResult>;
  abstract uploadMedia(filePath: string, mimeType: string): Promise<MediaUploadResult>;
  abstract validateConnection(): Promise<boolean>;
  
  // Optional methods
  async deletePost(remoteId: string): Promise<boolean> {
    return false;
  }

  async getPostAnalytics(remoteId: string): Promise<Record<string, number> | null> {
    return null;
  }

  // OAuth integration methods (optional - implement if platform supports OAuth)
  async startOAuthFlow(): Promise<string | null> {
    return null;
  }

  async completeOAuthFlow(code: string, state: string): Promise<boolean> {
    return false;
  }
}

// Mock implementation for demo purposes
export function createMockMetrics(): AccountMetrics {
  return {
    followers: Math.floor(Math.random() * 50000) + 1000,
    following: Math.floor(Math.random() * 1000) + 100,
    posts: Math.floor(Math.random() * 500) + 50,
    impressions: Math.floor(Math.random() * 100000) + 10000,
    engagements: Math.floor(Math.random() * 5000) + 500,
    engagementRate: Math.random() * 10 + 1,
    reach: Math.floor(Math.random() * 80000) + 5000,
    likes: Math.floor(Math.random() * 3000) + 300,
    comments: Math.floor(Math.random() * 500) + 50,
    shares: Math.floor(Math.random() * 200) + 20,
    saves: Math.floor(Math.random() * 100) + 10,
  };
}
