/**
 * Twitter/X Platform Adapter
 * Following coding rule: Subclass base adapter, implement same methods
 */

import { 
  SocialPlatformAdapter, 
  PublishResult, 
  FetchMetricsResult, 
  MediaUploadResult, 
  PostContent,
  createMockMetrics 
} from './base-adapter';
import { Platform } from '@/data/models';
import { platformConfig } from '@/core/config';
import { logger } from '@/utils/logging';

export class TwitterAdapter extends SocialPlatformAdapter {
  readonly platform: Platform = 'twitter_x';
  readonly displayName = 'Twitter / X';
  readonly primaryColor = '#1DA1F2';
  readonly supports = ['text', 'image', 'video', 'threads', 'scheduling', 'analytics_basic'];

  private clientId: string | undefined;
  private clientSecret: string | undefined;

  constructor() {
    super();
    this.clientId = platformConfig.twitter.clientId;
    this.clientSecret = platformConfig.twitter.clientSecret;
  }

  async publishPost(content: PostContent): Promise<PublishResult> {
    try {
      // In production, this would call the Twitter API
      // For now, simulate successful publish
      logger.info('Publishing to Twitter', { textLength: content.text.length });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      return {
        success: true,
        remoteId: `tw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        errorMessage: null,
        publishedAt: new Date(),
      };
    } catch (error) {
      logger.error('Twitter publish failed', { error });
      return {
        success: false,
        remoteId: null,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async fetchBasicMetrics(): Promise<FetchMetricsResult> {
    try {
      // In production, this would call the Twitter API
      logger.info('Fetching Twitter metrics');
      
      // Return mock metrics for demo
      return {
        success: true,
        metrics: createMockMetrics(),
        errorMessage: null,
      };
    } catch (error) {
      logger.error('Twitter metrics fetch failed', { error });
      return {
        success: false,
        metrics: null,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async uploadMedia(filePath: string, mimeType: string): Promise<MediaUploadResult> {
    try {
      logger.info('Uploading media to Twitter', { filePath, mimeType });
      
      // Simulate upload
      await new Promise(resolve => setTimeout(resolve, 1000));

      return {
        success: true,
        mediaId: `tw_media_${Date.now()}`,
        errorMessage: null,
      };
    } catch (error) {
      logger.error('Twitter media upload failed', { error });
      return {
        success: false,
        mediaId: null,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async validateConnection(): Promise<boolean> {
    // Check if credentials are configured
    if (!this.clientId || !this.clientSecret) {
      logger.warn('Twitter credentials not configured');
      return false;
    }
    return true;
  }

  async deletePost(remoteId: string): Promise<boolean> {
    try {
      logger.info('Deleting Twitter post', { remoteId });
      await new Promise(resolve => setTimeout(resolve, 300));
      return true;
    } catch (error) {
      logger.error('Twitter delete failed', { error });
      return false;
    }
  }
}
