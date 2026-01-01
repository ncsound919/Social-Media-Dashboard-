/**
 * Instagram Platform Adapter
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

export class InstagramAdapter extends SocialPlatformAdapter {
  readonly platform: Platform = 'instagram_business';
  readonly displayName = 'Instagram';
  readonly primaryColor = '#E1306C';
  readonly supports = ['image', 'carousel', 'reels', 'stories_meta', 'scheduling', 'analytics_basic'];

  private clientId: string | undefined;
  private clientSecret: string | undefined;
  private oauthIntegration: PlatformOAuthIntegration | null;

  constructor() {
    super();
    this.clientId = platformConfig.instagram.clientId;
    this.clientSecret = platformConfig.instagram.clientSecret;
    this.oauthIntegration = createPlatformOAuth(this.platform);
  }

  async publishPost(content: PostContent): Promise<PublishResult> {
    try {
      // Instagram requires at least one media item
      if (content.mediaIds.length === 0) {
        return {
          success: false,
          remoteId: null,
          errorMessage: 'Instagram posts require at least one media item',
        };
      }

      logger.info('Publishing to Instagram', { mediaCount: content.mediaIds.length });
      
      await new Promise(resolve => setTimeout(resolve, 800));

      return {
        success: true,
        remoteId: `ig_${uuidv4()}`,
        errorMessage: null,
        publishedAt: new Date(),
      };
    } catch (error) {
      logger.error('Instagram publish failed', { error });
      return {
        success: false,
        remoteId: null,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async fetchBasicMetrics(): Promise<FetchMetricsResult> {
    try {
      logger.info('Fetching Instagram metrics');
      
      return {
        success: true,
        metrics: createMockMetrics(),
        errorMessage: null,
      };
    } catch (error) {
      logger.error('Instagram metrics fetch failed', { error });
      return {
        success: false,
        metrics: null,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async uploadMedia(filePath: string, mimeType: string): Promise<MediaUploadResult> {
    try {
      // Instagram supports only specific formats
      const supportedFormats = ['image/jpeg', 'image/png', 'video/mp4'];
      if (!supportedFormats.includes(mimeType)) {
        return {
          success: false,
          mediaId: null,
          errorMessage: `Unsupported media format: ${mimeType}`,
        };
      }

      logger.info('Uploading media to Instagram', { filePath, mimeType });
      
      await new Promise(resolve => setTimeout(resolve, 1500));

      return {
        success: true,
        mediaId: `ig_media_${uuidv4()}`,
        errorMessage: null,
      };
    } catch (error) {
      logger.error('Instagram media upload failed', { error });
      return {
        success: false,
        mediaId: null,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async validateConnection(): Promise<boolean> {
    if (!this.clientId || !this.clientSecret) {
      logger.warn('Instagram credentials not configured');
      return false;
    }
    
    // Check if OAuth integration is available and authenticated
    if (!this.oauthIntegration) {
      logger.warn('OAuth integration not initialized for Instagram');
      return false;
    }

    const isAuthenticated = this.oauthIntegration.isAuthenticated();
    if (!isAuthenticated) {
      logger.warn('Instagram OAuth integration is not authenticated');
    }
    return isAuthenticated;
  }

  /**
   * Start OAuth authorization flow
   */
  async startOAuthFlow(): Promise<string | null> {
    if (!this.oauthIntegration) {
      logger.error('OAuth integration not available for Instagram');
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
      logger.error('OAuth integration not available for Instagram');
      return false;
    }
    
    try {
      await this.oauthIntegration.handleCallback(code, state);
      logger.info('OAuth flow completed successfully for Instagram');
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
      logger.error('OAuth integration not available for Instagram');
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
      logger.error('OAuth integration not available for Instagram');
      return false;
    }
    
    try {
      await this.oauthIntegration.handleCallback(code, state);
      logger.info('OAuth flow completed successfully for Instagram');
      return true;
    } catch (error) {
      logger.error('Failed to complete OAuth flow', { error });
      return false;
    }
  }
}
