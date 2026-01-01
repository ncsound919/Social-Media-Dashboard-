/**
 * Facebook Pages Platform Adapter
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

export class FacebookAdapter extends SocialPlatformAdapter {
  readonly platform: Platform = 'facebook_pages';
  readonly displayName = 'Facebook Pages';
  readonly primaryColor = '#1877F2';
  readonly supports = ['text', 'image', 'video', 'link', 'scheduling', 'analytics_basic'];

  private clientId: string | undefined;
  private clientSecret: string | undefined;
  private oauthIntegration: PlatformOAuthIntegration | null;

  constructor() {
    super();
    this.clientId = platformConfig.facebook.clientId;
    this.clientSecret = platformConfig.facebook.clientSecret;
    this.oauthIntegration = createPlatformOAuth(this.platform);
  }

  async publishPost(content: PostContent): Promise<PublishResult> {
    try {
      logger.info('Publishing to Facebook', { textLength: content.text.length });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 600));

      return {
        success: true,
        remoteId: `fb_${uuidv4()}`,
        errorMessage: null,
        publishedAt: new Date(),
      };
    } catch (error) {
      logger.error('Facebook publish failed', { error });
      return {
        success: false,
        remoteId: null,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async fetchBasicMetrics(): Promise<FetchMetricsResult> {
    try {
      logger.info('Fetching Facebook metrics');
      
      return {
        success: true,
        metrics: createMockMetrics(),
        errorMessage: null,
      };
    } catch (error) {
      logger.error('Facebook metrics fetch failed', { error });
      return {
        success: false,
        metrics: null,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async uploadMedia(filePath: string, mimeType: string): Promise<MediaUploadResult> {
    try {
      // Facebook supports images and videos
      const supportedFormats = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/mov'];
      if (!supportedFormats.some(format => mimeType.startsWith(format.split('/')[0]))) {
        return {
          success: false,
          mediaId: null,
          errorMessage: `Unsupported media format: ${mimeType}`,
        };
      }

      logger.info('Uploading media to Facebook', { filePath, mimeType });
      
      await new Promise(resolve => setTimeout(resolve, 1200));

      return {
        success: true,
        mediaId: `fb_media_${uuidv4()}`,
        errorMessage: null,
      };
    } catch (error) {
      logger.error('Facebook media upload failed', { error });
      return {
        success: false,
        mediaId: null,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async validateConnection(): Promise<boolean> {
    if (!this.clientId || !this.clientSecret) {
      logger.warn('Facebook credentials not configured');
      return false;
    }
    
    // Check if OAuth integration is available and authenticated
    if (this.oauthIntegration && this.oauthIntegration.isAuthenticated()) {
      return true;
    }
    
    // No authenticated OAuth integration available; connection is not valid
    return false;
  }

  /**
   * Start OAuth authorization flow
   */
  async startOAuthFlow(): Promise<string | null> {
    if (!this.oauthIntegration) {
      logger.error('OAuth integration not available for Facebook');
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
      logger.error('OAuth integration not available for Facebook');
      return false;
    }
    
    try {
      await this.oauthIntegration.handleCallback(code, state);
      logger.info('OAuth flow completed successfully for Facebook');
      return true;
    } catch (error) {
      logger.error('Failed to complete OAuth flow', { error });
      return false;
    }
  }

  async deletePost(remoteId: string): Promise<boolean> {
    try {
      logger.info('Deleting Facebook post', { remoteId });
      await new Promise(resolve => setTimeout(resolve, 300));
      return true;
    } catch (error) {
      logger.error('Facebook delete failed', { error });
      return false;
    }
  }
}
