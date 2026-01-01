/**
 * TikTok Platform Adapter
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
import { createPlatformOAuth, PlatformOAuthIntegration } from '@/core/platform-oauth-integration';
import { logger } from '@/utils/logging';
import { v4 as uuidv4 } from 'uuid';

export class TikTokAdapter extends SocialPlatformAdapter {
  readonly platform: Platform = 'tiktok';
  readonly displayName = 'TikTok';
  readonly primaryColor = '#010101';
  readonly supports = ['short_video', 'captions', 'scheduling_limited', 'analytics_basic'];

  private clientId: string | undefined;
  private clientSecret: string | undefined;
  private oauthIntegration: PlatformOAuthIntegration | null;

  constructor() {
    super();
    this.clientId = platformConfig.tiktok.clientId;
    this.clientSecret = platformConfig.tiktok.clientSecret;
    this.oauthIntegration = createPlatformOAuth(this.platform);
  }

  async publishPost(content: PostContent): Promise<PublishResult> {
    try {
      // TikTok requires video content
      if (content.mediaIds.length === 0) {
        return {
          success: false,
          remoteId: null,
          errorMessage: 'TikTok posts require video content',
        };
      }

      logger.info('Publishing to TikTok', { caption: content.text.substring(0, 50) });
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      return {
        success: true,
        remoteId: `tt_${uuidv4()}`,
        errorMessage: null,
        publishedAt: new Date(),
      };
    } catch (error) {
      logger.error('TikTok publish failed', { error });
      return {
        success: false,
        remoteId: null,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async fetchBasicMetrics(): Promise<FetchMetricsResult> {
    try {
      logger.info('Fetching TikTok metrics');
      
      return {
        success: true,
        metrics: createMockMetrics(),
        errorMessage: null,
      };
    } catch (error) {
      logger.error('TikTok metrics fetch failed', { error });
      return {
        success: false,
        metrics: null,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async uploadMedia(filePath: string, mimeType: string): Promise<MediaUploadResult> {
    try {
      // TikTok only supports video
      if (!mimeType.startsWith('video/')) {
        return {
          success: false,
          mediaId: null,
          errorMessage: 'TikTok only accepts video content',
        };
      }

      logger.info('Uploading media to TikTok', { filePath, mimeType });
      
      await new Promise(resolve => setTimeout(resolve, 2000));

      return {
        success: true,
        mediaId: `tt_media_${uuidv4()}`,
        errorMessage: null,
      };
    } catch (error) {
      logger.error('TikTok media upload failed', { error });
      return {
        success: false,
        mediaId: null,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async validateConnection(): Promise<boolean> {
    if (!this.clientId || !this.clientSecret) {
      logger.warn('TikTok credentials not configured');
      return false;
    }
    
    if (!this.oauthIntegration) {
      logger.warn('TikTok OAuth integration not available');
      return false;
    }

    return this.oauthIntegration.isAuthenticated();
  }

  /**
   * Start OAuth authorization flow
   */
  async startOAuthFlow(): Promise<string | null> {
    if (!this.oauthIntegration) {
      logger.error('OAuth integration not available for TikTok');
      return null;
    }
    
    try {
      return await this.oauthIntegration.authorize();
    } catch (error) {
      logger.error('Failed to start OAuth flow', { error });
      return null;
    }
  }

  /**
   * Complete OAuth authorization with callback code
   */
  async completeOAuthFlow(code: string, state: string): Promise<boolean> {
    if (!this.oauthIntegration) {
      logger.error('OAuth integration not available for TikTok');
      return false;
    }
    
    try {
      await this.oauthIntegration.handleCallback(code, state);
      logger.info('OAuth flow completed successfully for TikTok');
      return true;
    } catch (error) {
      logger.error('Failed to complete OAuth flow', { error });
      return false;
    }
  }

  /**
   * Start OAuth authorization flow
   */
  async startOAuthFlow(): Promise<string | null> {
    if (!this.oauthIntegration) {
      logger.error('OAuth integration not available for TikTok');
      return null;
    }
    
    try {
      return await this.oauthIntegration.authorize();
    } catch (error) {
      logger.error('Failed to start OAuth flow', { error });
      return null;
    }
  }

  /**
   * Complete OAuth authorization with callback code
   */
  async completeOAuthFlow(code: string, state: string): Promise<boolean> {
    if (!this.oauthIntegration) {
      logger.error('OAuth integration not available for TikTok');
      return false;
    }
    
    try {
      await this.oauthIntegration.handleCallback(code, state);
      logger.info('OAuth flow completed successfully for TikTok');
      return true;
    } catch (error) {
      logger.error('Failed to complete OAuth flow', { error });
      return false;
    }
  }
}
