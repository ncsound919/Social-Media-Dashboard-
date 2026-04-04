/**
 * TikTok Connector
 * OAuth 2.0 using TikTok Content Posting API v2
 */

export interface TikTokVideoResult {
  publishId: string;
}

export interface TikTokVideoAnalytics {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
}

export interface MobileSyncPayload {
  platform: 'tiktok';
  action: 'upload_video';
  caption: string;
  hashtags: string[];
  filePath: string;
  timestamp: string;
}

const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';

export class TikTokConnector {
  private readonly clientKey: string;
  private readonly clientSecret: string;
  private accessToken: string | null = null;

  constructor(
    clientKey = process.env.TIKTOK_CLIENT_KEY ?? '',
    clientSecret = process.env.TIKTOK_CLIENT_SECRET ?? ''
  ) {
    this.clientKey = clientKey;
    this.clientSecret = clientSecret;
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  private authHeaders(): HeadersInit {
    if (!this.accessToken) throw new Error('TikTok: no access token set');
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    };
  }

  /** Build the OAuth 2.0 authorization URL. */
  buildAuthorizationUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_key: this.clientKey,
      response_type: 'code',
      scope: 'user.info.basic,video.publish,video.upload',
      redirect_uri: redirectUri,
      state,
    });
    return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
  }

  /** Exchange authorization code for access token. */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
    const body = new URLSearchParams({
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });
    const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) throw new Error(`TikTok token exchange failed: ${await res.text()}`);
    const data = await res.json();
    this.accessToken = data.access_token;
    return data.access_token as string;
  }

  /**
   * Upload a video file and publish it to TikTok.
   * Uses the file upload (PULL_FROM_URL not used here; direct upload via multipart).
   */
  async uploadVideo(filePath: string, caption: string, hashtags: string[]): Promise<TikTokVideoResult> {
    const fs = await import('fs');
    const fileBuffer = fs.readFileSync(filePath);
    const totalBytes = fileBuffer.length;

    const hashtagStr = hashtags.map(h => (h.startsWith('#') ? h : `#${h}`)).join(' ');
    const fullCaption = `${caption} ${hashtagStr}`.trim();

    // Step 1: Initialize upload
    const initRes = await fetch(`${TIKTOK_API_BASE}/post/publish/video/init/`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({
        post_info: { title: fullCaption, privacy_level: 'PUBLIC_TO_EVERYONE', disable_duet: false, disable_comment: false, disable_stitch: false },
        source_info: { source: 'FILE_UPLOAD', video_size: totalBytes, chunk_size: totalBytes, total_chunk_count: 1 },
      }),
    });
    if (!initRes.ok) throw new Error(`TikTok upload init failed: ${await initRes.text()}`);
    const initData = await initRes.json();
    const { publish_id, upload_url } = initData.data;

    // Step 2: Upload video chunk
    const uploadRes = await fetch(upload_url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Range': `bytes 0-${totalBytes - 1}/${totalBytes}`,
        'Content-Length': String(totalBytes),
      },
      body: fileBuffer,
    });
    if (!uploadRes.ok) throw new Error(`TikTok video upload failed: ${await uploadRes.text()}`);

    return { publishId: publish_id };
  }

  /** Retrieve analytics for a published video. */
  async getVideoAnalytics(videoId: string): Promise<TikTokVideoAnalytics> {
    const url = `${TIKTOK_API_BASE}/video/query/?fields=id,view_count,like_count,comment_count,share_count`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({ filters: { video_ids: [videoId] } }),
    });
    if (!res.ok) throw new Error(`TikTok getVideoAnalytics failed: ${await res.text()}`);
    const data = await res.json();
    const video = data.data?.videos?.[0] ?? {};
    return {
      viewCount: video.view_count ?? 0,
      likeCount: video.like_count ?? 0,
      commentCount: video.comment_count ?? 0,
      shareCount: video.share_count ?? 0,
    };
  }

  /**
   * Return a mobile sync push payload for MobileSyncService.
   * The payload can be forwarded to the mobile app for recording/upload.
   */
  getMobileSyncPayload(draft: { filePath: string; caption: string; hashtags: string[] }): MobileSyncPayload {
    return {
      platform: 'tiktok',
      action: 'upload_video',
      caption: draft.caption,
      hashtags: draft.hashtags,
      filePath: draft.filePath,
      timestamp: new Date().toISOString(),
    };
  }
}
