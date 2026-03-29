/**
 * Twitter / X Connector
 * OAuth 2.0 with PKCE using Twitter API v2
 */

export interface TweetResult {
  id: string;
  text: string;
  url: string;
}

export interface MediaUploadResult {
  mediaId: string;
}

export interface TweetAnalytics {
  impressionCount: number;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  quoteCount: number;
  engagementRate: number;
}

const TWITTER_API_BASE = 'https://api.twitter.com/2';
const TWITTER_UPLOAD_BASE = 'https://upload.twitter.com/1.1';

export class TwitterConnector {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private accessToken: string | null = null;

  constructor(
    clientId = process.env.TWITTER_CLIENT_ID ?? '',
    clientSecret = process.env.TWITTER_CLIENT_SECRET ?? ''
  ) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  private authHeaders(): HeadersInit {
    if (!this.accessToken) throw new Error('Twitter: no access token set');
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /** Build the OAuth 2.0 PKCE authorization URL. */
  buildAuthorizationUrl(redirectUri: string, state: string, codeChallenge: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: 'tweet.read tweet.write users.read offline.access media.upload',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
  }

  /** Exchange authorization code for access token. */
  async exchangeCodeForToken(code: string, redirectUri: string, codeVerifier: string): Promise<string> {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });
    const res = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: body.toString(),
    });
    if (!res.ok) throw new Error(`Twitter token exchange failed: ${await res.text()}`);
    const data = await res.json();
    this.accessToken = data.access_token;
    return data.access_token as string;
  }

  /** Post a tweet, optionally attaching pre-uploaded media. */
  async postTweet(text: string, mediaIds?: string[]): Promise<TweetResult> {
    const body: Record<string, unknown> = { text };
    if (mediaIds && mediaIds.length > 0) {
      body.media = { media_ids: mediaIds };
    }
    const res = await fetch(`${TWITTER_API_BASE}/tweets`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Twitter postTweet failed: ${await res.text()}`);
    const { data } = await res.json();
    return { id: data.id, text: data.text, url: `https://twitter.com/i/web/status/${data.id}` };
  }

  /** Upload a media file and return its media_id. */
  async uploadMedia(filePath: string): Promise<MediaUploadResult> {
    const fs = await import('fs');
    const path = await import('path');
    const fileBuffer = fs.readFileSync(filePath);
    const mimeType = filePath.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg';
    const totalBytes = fileBuffer.length;

    // Step 1: INIT
    const initRes = await fetch(`${TWITTER_UPLOAD_BASE}/media/upload.json`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ command: 'INIT', total_bytes: String(totalBytes), media_type: mimeType }).toString(),
    });
    if (!initRes.ok) throw new Error(`Twitter media INIT failed: ${await initRes.text()}`);
    const { media_id_string } = await initRes.json();

    // Step 2: APPEND (single chunk for simplicity)
    const form = new FormData();
    form.append('command', 'APPEND');
    form.append('media_id', media_id_string);
    form.append('segment_index', '0');
    form.append('media', new Blob([fileBuffer], { type: mimeType }), path.basename(filePath));
    const appendRes = await fetch(`${TWITTER_UPLOAD_BASE}/media/upload.json`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.accessToken}` },
      body: form,
    });
    if (!appendRes.ok) throw new Error(`Twitter media APPEND failed: ${await appendRes.text()}`);

    // Step 3: FINALIZE
    const finalRes = await fetch(`${TWITTER_UPLOAD_BASE}/media/upload.json`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ command: 'FINALIZE', media_id: media_id_string }).toString(),
    });
    if (!finalRes.ok) throw new Error(`Twitter media FINALIZE failed: ${await finalRes.text()}`);

    return { mediaId: media_id_string };
  }

  /** Get analytics for a tweet. */
  async getTweetAnalytics(tweetId: string): Promise<TweetAnalytics> {
    const url = `${TWITTER_API_BASE}/tweets/${tweetId}?tweet.fields=public_metrics`;
    const res = await fetch(url, { headers: this.authHeaders() });
    if (!res.ok) throw new Error(`Twitter getTweetAnalytics failed: ${await res.text()}`);
    const { data } = await res.json();
    const m = data.public_metrics ?? {};
    const impressionCount = m.impression_count ?? 0;
    const likeCount = m.like_count ?? 0;
    const retweetCount = m.retweet_count ?? 0;
    const replyCount = m.reply_count ?? 0;
    const quoteCount = m.quote_count ?? 0;
    const engagementRate =
      impressionCount > 0
        ? (likeCount + retweetCount + replyCount + quoteCount) / impressionCount
        : 0;
    return {
      impressionCount,
      likeCount,
      retweetCount,
      replyCount,
      quoteCount,
      engagementRate,
    };
  }

  /** Post a thread of tweets sequentially, each replying to the previous. */
  async scheduleThread(tweets: string[]): Promise<TweetResult[]> {
    const results: TweetResult[] = [];
    let replyToId: string | undefined;
    for (const text of tweets) {
      const body: Record<string, unknown> = { text };
      if (replyToId) body.reply = { in_reply_to_tweet_id: replyToId };
      const res = await fetch(`${TWITTER_API_BASE}/tweets`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Twitter scheduleThread failed at tweet: ${await res.text()}`);
      const { data } = await res.json();
      const result: TweetResult = { id: data.id, text: data.text, url: `https://twitter.com/i/web/status/${data.id}` };
      results.push(result);
      replyToId = data.id;
    }
    return results;
  }
}
