/**
 * Platform-specific validation engine
 * Backend Reliability: Validate content against platform rules before upload
 */

import { Platform, PostDraft, PlatformVariant, ValidationError } from '../data/models';

export interface PlatformRules {
  maxTextLength: number;
  maxHashtags: number;
  maxMediaCount: number;
  supportedMediaTypes: string[];
  aspectRatios: string[];
  maxVideoLength?: number; // seconds
  maxVideoSize?: number; // MB
  requiresThumbnail?: boolean;
}

const platformRules: Record<Platform, PlatformRules> = {
  twitter_x: {
    maxTextLength: 280,
    maxHashtags: 30,
    maxMediaCount: 4,
    supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
    aspectRatios: ['16:9', '1:1', '4:5'],
    maxVideoLength: 140,
    maxVideoSize: 512,
  },
  instagram_business: {
    maxTextLength: 2200,
    maxHashtags: 30,
    maxMediaCount: 10,
    supportedMediaTypes: ['image/jpeg', 'image/png', 'video/mp4'],
    aspectRatios: ['1:1', '4:5', '9:16'],
    maxVideoLength: 60,
    maxVideoSize: 100,
    requiresThumbnail: true,
  },
  tiktok: {
    maxTextLength: 2200,
    maxHashtags: 20,
    maxMediaCount: 1,
    supportedMediaTypes: ['video/mp4'],
    aspectRatios: ['9:16'],
    maxVideoLength: 600,
    maxVideoSize: 500,
    requiresThumbnail: true,
  },
  youtube: {
    maxTextLength: 5000,
    maxHashtags: 15,
    maxMediaCount: 1,
    supportedMediaTypes: ['video/mp4', 'video/avi', 'video/mov'],
    aspectRatios: ['16:9', '9:16'],
    maxVideoLength: 900, // 15 min for shorts
    maxVideoSize: 2000,
    requiresThumbnail: true,
  },
  facebook_pages: {
    maxTextLength: 63206,
    maxHashtags: 50,
    maxMediaCount: 10,
    supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
    aspectRatios: ['16:9', '1:1', '4:5'],
    maxVideoLength: 240,
    maxVideoSize: 1000,
  },
  linkedin_pages: {
    maxTextLength: 3000,
    maxHashtags: 30,
    maxMediaCount: 9,
    supportedMediaTypes: ['image/jpeg', 'image/png', 'video/mp4'],
    aspectRatios: ['16:9', '1:1', '4:5'],
    maxVideoLength: 600,
    maxVideoSize: 200,
  },
  pinterest: {
    maxTextLength: 500,
    maxHashtags: 20,
    maxMediaCount: 1,
    supportedMediaTypes: ['image/jpeg', 'image/png', 'video/mp4'],
    aspectRatios: ['2:3', '1:1'],
    maxVideoLength: 60,
    maxVideoSize: 200,
  },
  threads: {
    maxTextLength: 500,
    maxHashtags: 20,
    maxMediaCount: 10,
    supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
    aspectRatios: ['1:1', '4:5', '9:16'],
    maxVideoLength: 90,
    maxVideoSize: 500,
  },
  bluesky: {
    maxTextLength: 300,
    maxHashtags: 20,
    maxMediaCount: 4,
    supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
    aspectRatios: ['16:9', '1:1', '4:5'],
    maxVideoLength: 60,
    maxVideoSize: 100,
  },
};

export class PlatformValidator {
  /**
   * Validate content against platform-specific rules
   */
  validateContent(
    platform: Platform,
    variant: PlatformVariant,
    mediaFiles?: File[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const rules = platformRules[platform];

    // Text length validation
    if (variant.body.length > rules.maxTextLength) {
      errors.push({
        field: 'body',
        message: `Text exceeds maximum length of ${rules.maxTextLength} characters`,
        platform,
      });
    }

    // Hashtag validation
    if (variant.hashtags.length > rules.maxHashtags) {
      errors.push({
        field: 'hashtags',
        message: `Too many hashtags. Maximum allowed: ${rules.maxHashtags}`,
        platform,
      });
    }

    // Media count validation
    if (variant.mediaIds.length > rules.maxMediaCount) {
      errors.push({
        field: 'mediaIds',
        message: `Too many media files. Maximum allowed: ${rules.maxMediaCount}`,
        platform,
      });
    }

    // Thumbnail validation for video platforms
    if (rules.requiresThumbnail && !variant.customThumbnailId && variant.mediaIds.length > 0) {
      errors.push({
        field: 'customThumbnailId',
        message: 'Custom thumbnail is required for video content on this platform',
        platform,
      });
    }

    return errors;
  }

  /**
   * Check if manual publishing is recommended for this platform
   * Some features (trending audio, stickers) are only available via mobile
   */
  shouldUseMobilePublish(platform: Platform): boolean {
    return ['tiktok', 'instagram_business', 'threads'].includes(platform);
  }

  /**
   * Get validation rules for a platform
   */
  getRules(platform: Platform): PlatformRules {
    return platformRules[platform];
  }
}
