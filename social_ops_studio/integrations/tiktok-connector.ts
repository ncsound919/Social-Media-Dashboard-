const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';

export interface TikTokConfig {
  accessToken: string;
  clientKey: string;
  clientSecret: string;
  openId: string;
}

export interface TikTokVideoPost {
  videoUrl: string;
  title: string;
  description?: string;
  privacyLevel?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'FOLLOWER_OF_CREATOR' | 'SELF_ONLY';
  disableDuet?: boolean;
  disableComment?: boolean;
  disableStitch?: boolean;
  brandContentToggle?: boolean;
}

class TikTokConnector {
  private config: TikTokConfig;

  constructor(config: TikTokConfig) {
    this.config = config;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.config.accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    };
  }

  async getUserInfo(): Promise<{ openId: string; displayName: string; avatarUrl: string; followerCount: number }> {
    const res = await fetch(`${TIKTOK_API_BASE}/user/info/?fields=open_id,display_name,avatar_url,follower_count`, {
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`TikTok getUserInfo failed: ${res.status}`);
    const data = await res.json();
    const u = data.data?.user || {};
    return { openId: u.open_id, displayName: u.display_name, avatarUrl: u.avatar_url, followerCount: u.follower_count };
  }

  async uploadVideo(post: TikTokVideoPost): Promise<{ publishId: string }> {
    const body = {
      post_info: {
        title: post.title,
        description: post.description || '',
        privacy_level: post.privacyLevel || 'PUBLIC_TO_EVERYONE',
        disable_duet: post.disableDuet || false,
        disable_comment: post.disableComment || false,
        disable_stitch: post.disableStitch || false,
        brand_content_toggle: post.brandContentToggle || false,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: post.videoUrl,
      },
    };
    const res = await fetch(`${TIKTOK_API_BASE}/post/publish/video/init/`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`TikTok uploadVideo failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return { publishId: data.data?.publish_id };
  }

  async getVideoAnalytics(videoId: string): Promise<{
    views: number; likes: number; comments: number; shares: number;
  }> {
    const res = await fetch(
      `${TIKTOK_API_BASE}/video/query/?fields=id,like_count,comment_count,share_count,view_count`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ filters: { video_ids: [videoId] } }),
      }
    );
    if (!res.ok) throw new Error(`TikTok getVideoAnalytics failed: ${res.status}`);
    const data = await res.json();
    const v = data.data?.videos?.[0] || {};
    return {
      views: v.view_count || 0,
      likes: v.like_count || 0,
      comments: v.comment_count || 0,
      shares: v.share_count || 0,
    };
  }

  async scheduleVideo(post: TikTokVideoPost, scheduledAt: Date): Promise<{ id: string; scheduledAt: string }> {
    const id = `tiktok_scheduled_${Date.now()}`;
    return { id, scheduledAt: scheduledAt.toISOString() };
  }

  getMobileSyncPayload(post: TikTokVideoPost): Record<string, any> {
    return {
      platform: 'tiktok',
      action: 'upload_video',
      payload: post,
      deeplink: 'tiktok://upload',
      notification: {
        title: 'TikTok post ready',
        body: `Video "${post.title}" is queued for posting`,
      },
    };
  }
}

export function createTikTokConnector(config: TikTokConfig): TikTokConnector {
  return new TikTokConnector(config);
}

export default TikTokConnector;
