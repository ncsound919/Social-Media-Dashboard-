/**
 * Integrations exports
 */
export * from './base-adapter';
export * from './twitter-adapter';
export * from './facebook-adapter';
export * from './instagram-adapter';
export * from './tiktok-adapter';

// New platform connectors (export under explicit names to avoid collisions)
export { LinkedInConnector } from './linkedin';
export type {
  LinkedInPostResult,
  LinkedInFollowerCount,
  LinkedInPostAnalytics,
  LinkedInAudienceInsights,
} from './linkedin';

export { TwitterConnector } from './twitter';
export type {
  TweetResult,
  TweetAnalytics,
  MediaUploadResult as TwitterMediaUploadResult,
} from './twitter';

export { TikTokConnector } from './tiktok';
export type {
  TikTokVideoResult,
  TikTokVideoAnalytics,
  MobileSyncPayload,
} from './tiktok';

export { InstagramConnector } from './instagram';
export type {
  MediaContainerResult,
  PublishResult as InstagramPublishResult,
  InstagramInsights,
} from './instagram';

export { YouTubeConnector } from './youtube';
export type { YouTubeUploadResult, YouTubeVideoAnalytics } from './youtube';

export { FacebookConnector } from './facebook';
export type {
  FacebookPostResult,
  FacebookPageInsights,
  AdCampaignConfig,
  AdCampaignResult,
} from './facebook';

export { PinterestConnector } from './pinterest';
export type { PinResult, PinAnalytics, BoardResult } from './pinterest';

import { SocialPlatformAdapter } from './base-adapter';
import { TwitterAdapter } from './twitter-adapter';
import { FacebookAdapter } from './facebook-adapter';
import { InstagramAdapter } from './instagram-adapter';
import { TikTokAdapter } from './tiktok-adapter';
import { Platform } from '@/data/models';

import { LinkedInConnector } from './linkedin';
import { TwitterConnector } from './twitter';
import { TikTokConnector } from './tiktok';
import { InstagramConnector } from './instagram';
import { YouTubeConnector } from './youtube';
import { FacebookConnector } from './facebook';
import { PinterestConnector } from './pinterest';

// Registry of all platform adapters (legacy adapter pattern)
const adapters: Map<Platform, SocialPlatformAdapter> = new Map();

export function getAdapter(platform: Platform): SocialPlatformAdapter | null {
  if (!adapters.has(platform)) {
    switch (platform) {
      case 'twitter_x':
        adapters.set(platform, new TwitterAdapter());
        break;
      case 'facebook_pages':
        adapters.set(platform, new FacebookAdapter());
        break;
      case 'instagram_business':
        adapters.set(platform, new InstagramAdapter());
        break;
      case 'tiktok':
        adapters.set(platform, new TikTokAdapter());
        break;
      // Add more adapters as needed
      default:
        return null;
    }
  }
  return adapters.get(platform) || null;
}

export function getAllAdapters(): SocialPlatformAdapter[] {
  return Array.from(adapters.values());
}

// ─── Connector Registry ───────────────────────────────────────────────────────

export type PlatformConnector =
  | LinkedInConnector
  | TwitterConnector
  | TikTokConnector
  | InstagramConnector
  | YouTubeConnector
  | FacebookConnector
  | PinterestConnector;

export type ConnectorPlatform =
  | 'linkedin'
  | 'twitter'
  | 'tiktok'
  | 'instagram'
  | 'youtube'
  | 'facebook'
  | 'pinterest';

/**
 * ConnectorRegistry initializes the appropriate connector for each platform
 * using tokens stored in state / environment variables.
 */
export class ConnectorRegistry {
  private readonly connectors: Map<ConnectorPlatform, PlatformConnector> = new Map();

  /**
   * Register a pre-configured connector instance.
   */
  register(platform: ConnectorPlatform, connector: PlatformConnector): void {
    this.connectors.set(platform, connector);
  }

  /**
   * Initialize all connectors from environment variables.
   * Each connector is created even if credentials are missing so callers can
   * inspect which platforms are available.
   */
  initFromEnv(): void {
    this.connectors.set('linkedin', new LinkedInConnector());
    this.connectors.set('twitter', new TwitterConnector());
    this.connectors.set('tiktok', new TikTokConnector());
    this.connectors.set('instagram', new InstagramConnector());
    this.connectors.set('youtube', new YouTubeConnector());
    this.connectors.set('facebook', new FacebookConnector());
    this.connectors.set('pinterest', new PinterestConnector());
  }

  /** Get a connector by platform name. */
  get(platform: ConnectorPlatform): PlatformConnector | null {
    return this.connectors.get(platform) ?? null;
  }

  /** Get all registered connectors. */
  getAll(): Map<ConnectorPlatform, PlatformConnector> {
    return this.connectors;
  }

  /** Return a list of platforms that have access tokens configured. */
  getConnectedPlatforms(): ConnectorPlatform[] {
    const connected: ConnectorPlatform[] = [];
    for (const [platform] of this.connectors) {
      const envMap: Record<ConnectorPlatform, string | undefined> = {
        linkedin: process.env.LINKEDIN_CLIENT_ID,
        twitter: process.env.TWITTER_CLIENT_ID,
        tiktok: process.env.TIKTOK_CLIENT_KEY,
        instagram: process.env.META_APP_ID,
        youtube: process.env.GOOGLE_CLIENT_ID,
        facebook: process.env.META_APP_ID,
        pinterest: process.env.PINTEREST_APP_ID,
      };
      if (envMap[platform]) connected.push(platform);
    }
    return connected;
  }
}

/** Singleton connector registry instance. */
export const connectorRegistry = new ConnectorRegistry();

