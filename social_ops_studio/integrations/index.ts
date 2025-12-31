/**
 * Integrations exports
 */
export * from './base-adapter';
export * from './twitter-adapter';
export * from './facebook-adapter';
export * from './instagram-adapter';
export * from './tiktok-adapter';

import { SocialPlatformAdapter } from './base-adapter';
import { TwitterAdapter } from './twitter-adapter';
import { FacebookAdapter } from './facebook-adapter';
import { InstagramAdapter } from './instagram-adapter';
import { TikTokAdapter } from './tiktok-adapter';
import { Platform } from '@/data/models';

// Registry of all platform adapters
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
