/**
 * YouTube Connector
 * Google OAuth 2.0 using YouTube Data API v3
 */

export interface YouTubeUploadResult {
  videoId: string;
  url: string;
}

export interface YouTubeVideoAnalytics {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  subscriberGained: number;
  estimatedMinutesWatched: number;
  averageViewDuration: number;
}

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_UPLOAD_BASE = 'https://www.googleapis.com/upload/youtube/v3';

export class YouTubeConnector {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(
    clientId = process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? ''
  ) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  setAccessToken(token: string, refreshToken?: string): void {
    this.accessToken = token;
    if (refreshToken) this.refreshToken = refreshToken;
  }

  private get token(): string {
    if (!this.accessToken) throw new Error('YouTube: no access token set');
    return this.accessToken;
  }

  private authHeaders(contentType = 'application/json'): HeadersInit {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': contentType,
    };
  }

  /** Build the Google OAuth 2.0 authorization URL. */
  buildAuthorizationUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /** Exchange authorization code for access + refresh tokens. */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<{ accessToken: string; refreshToken: string }> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) throw new Error(`YouTube token exchange failed: ${await res.text()}`);
    const data = await res.json();
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token ?? null;
    return { accessToken: data.access_token, refreshToken: data.refresh_token ?? '' };
  }

  /** Upload a video to YouTube. Returns the video ID. */
  async uploadVideo(filePath: string, title: string, description: string, tags: string[]): Promise<YouTubeUploadResult> {
    const fs = await import('fs');
    const fileBuffer = fs.readFileSync(filePath);
    const totalBytes = fileBuffer.length;

    const metadata = {
      snippet: { title, description, tags, categoryId: '22' },
      status: { privacyStatus: 'private' },
    };

    // Use resumable upload for large files
    const initRes = await fetch(
      `${YOUTUBE_UPLOAD_BASE}/videos?uploadType=resumable&part=snippet,status`,
      {
        method: 'POST',
        headers: {
          ...this.authHeaders(),
          'X-Upload-Content-Type': 'video/mp4',
          'X-Upload-Content-Length': String(totalBytes),
        },
        body: JSON.stringify(metadata),
      }
    );
    if (!initRes.ok) throw new Error(`YouTube upload init failed: ${await initRes.text()}`);
    const uploadUrl = initRes.headers.get('Location');
    if (!uploadUrl) throw new Error('YouTube: missing upload location header');

    // Upload the video bytes
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(totalBytes),
      },
      body: fileBuffer,
    });
    if (!uploadRes.ok) throw new Error(`YouTube video upload failed: ${await uploadRes.text()}`);
    const data = await uploadRes.json();
    return { videoId: data.id, url: `https://www.youtube.com/watch?v=${data.id}` };
  }

  /** Get analytics for a video using the YouTube Analytics API. */
  async getVideoAnalytics(videoId: string): Promise<YouTubeVideoAnalytics> {
    const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    const metrics = 'views,likes,comments,subscribersGained,estimatedMinutesWatched,averageViewDuration';
    const url = `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel%3D%3DMINE&startDate=${startDate}&endDate=${endDate}&metrics=${metrics}&filters=video%3D%3D${videoId}`;
    const res = await fetch(url, { headers: this.authHeaders() });
    if (!res.ok) throw new Error(`YouTube getVideoAnalytics failed: ${await res.text()}`);
    const data = await res.json();
    const row = data.rows?.[0] ?? [];
    return {
      viewCount: row[0] ?? 0,
      likeCount: row[1] ?? 0,
      commentCount: row[2] ?? 0,
      subscriberGained: row[3] ?? 0,
      estimatedMinutesWatched: row[4] ?? 0,
      averageViewDuration: row[5] ?? 0,
    };
  }

  /** Update the thumbnail of a video. */
  async updateThumbnail(videoId: string, thumbnailPath: string): Promise<void> {
    const fs = await import('fs');
    const fileBuffer = fs.readFileSync(thumbnailPath);
    const mimeType = thumbnailPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    const res = await fetch(
      `${YOUTUBE_UPLOAD_BASE}/thumbnails/set?videoId=${videoId}&uploadType=media`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': mimeType },
        body: fileBuffer,
      }
    );
    if (!res.ok) throw new Error(`YouTube updateThumbnail failed: ${await res.text()}`);
  }

  /** Schedule a video to go public at a specified time. */
  async scheduleVideo(videoId: string, publishAt: Date): Promise<void> {
    const body = {
      id: videoId,
      status: {
        privacyStatus: 'private',
        publishAt: publishAt.toISOString(),
      },
    };
    const res = await fetch(`${YOUTUBE_API_BASE}/videos?part=status`, {
      method: 'PUT',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`YouTube scheduleVideo failed: ${await res.text()}`);
  }
}
