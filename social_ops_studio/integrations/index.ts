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
    // LinkedIn
    const linkedin = new LinkedInConnector();
    const linkedinAccessToken = process.env.LINKEDIN_ACCESS_TOKEN;
    const linkedinRefreshToken = process.env.LINKEDIN_REFRESH_TOKEN;
    if (linkedinAccessToken) {
      (linkedin as any).setAccessToken?.(linkedinAccessToken, linkedinRefreshToken);
    }
    this.connectors.set('linkedin', linkedin);

    // Twitter
    const twitter = new TwitterConnector();
    const twitterAccessToken = process.env.TWITTER_ACCESS_TOKEN;
    const twitterRefreshToken = process.env.TWITTER_REFRESH_TOKEN;
    if (twitterAccessToken) {
      (twitter as any).setAccessToken?.(twitterAccessToken, twitterRefreshToken);
    }
    this.connectors.set('twitter', twitter);

    // TikTok
    const tiktok = new TikTokConnector();
    const tiktokAccessToken = process.env.TIKTOK_ACCESS_TOKEN;
    const tiktokRefreshToken = process.env.TIKTOK_REFRESH_TOKEN;
    if (tiktokAccessToken) {
      (tiktok as any).setAccessToken?.(tiktokAccessToken, tiktokRefreshToken);
    }
    this.connectors.set('tiktok', tiktok);

    // Instagram
    const instagram = new InstagramConnector();
    const instagramAccessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const instagramRefreshToken = process.env.INSTAGRAM_REFRESH_TOKEN;
    if (instagramAccessToken) {
      (instagram as any).setAccessToken?.(instagramAccessToken, instagramRefreshToken);
    }
    this.connectors.set('instagram', instagram);

    // YouTube
    const youtube = new YouTubeConnector();
    const youtubeAccessToken = process.env.YOUTUBE_ACCESS_TOKEN;
    const youtubeRefreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
    if (youtubeAccessToken) {
      (youtube as any).setAccessToken?.(youtubeAccessToken, youtubeRefreshToken);
    }
    this.connectors.set('youtube', youtube);

    // Facebook
    const facebook = new FacebookConnector();
    const facebookAccessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    const facebookRefreshToken = process.env.FACEBOOK_REFRESH_TOKEN;
    if (facebookAccessToken) {
      (facebook as any).setAccessToken?.(facebookAccessToken, facebookRefreshToken);
    }
    this.connectors.set('facebook', facebook);

    // Pinterest
    const pinterest = new PinterestConnector();
    const pinterestAccessToken = process.env.PINTEREST_ACCESS_TOKEN;
    const pinterestRefreshToken = process.env.PINTEREST_REFRESH_TOKEN;
    if (pinterestAccessToken) {
      (pinterest as any).setAccessToken?.(pinterestAccessToken, pinterestRefreshToken);
    }
    this.connectors.set('pinterest', pinterest);
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
    const envMap: Record<ConnectorPlatform, string | undefined> = {
      linkedin: process.env.LINKEDIN_ACCESS_TOKEN,
      twitter: process.env.TWITTER_ACCESS_TOKEN,
      tiktok: process.env.TIKTOK_ACCESS_TOKEN,
      instagram: process.env.INSTAGRAM_ACCESS_TOKEN,
      youtube: process.env.YOUTUBE_ACCESS_TOKEN,
      facebook: process.env.FACEBOOK_ACCESS_TOKEN,
      pinterest: process.env.PINTEREST_ACCESS_TOKEN,
    };
    for (const [platform] of this.connectors) {
      if (envMap[platform]) connected.push(platform);
    }
    return connected;
  }
}

/** Singleton connector registry instance. */
export const connectorRegistry = new ConnectorRegistry();

