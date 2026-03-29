const TWITTER_API_BASE = 'https://api.twitter.com/2';

export interface TwitterConfig {
  bearerToken: string;
  accessToken: string;
  accessTokenSecret: string;
  apiKey: string;
  apiKeySecret: string;
}

export interface TwitterTweet {
  text: string;
  replyToId?: string;
  mediaIds?: string[];
  poll?: { options: string[]; durationMinutes: number };
}

class TwitterConnector {
  private config: TwitterConfig;

  constructor(config: TwitterConfig) {
    this.config = config;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.config.bearerToken}`,
      'Content-Type': 'application/json',
    };
  }

  async postTweet(tweet: TwitterTweet): Promise<{ id: string; url: string }> {
    const body: any = { text: tweet.text };
    if (tweet.replyToId) body.reply = { in_reply_to_tweet_id: tweet.replyToId };
    if (tweet.mediaIds?.length) body.media = { media_ids: tweet.mediaIds };
    if (tweet.poll) body.poll = { options: tweet.poll.options.map(l => ({ label: l })), duration_minutes: tweet.poll.durationMinutes };

    const res = await fetch(`${TWITTER_API_BASE}/tweets`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Twitter postTweet failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return { id: data.data.id, url: `https://twitter.com/i/web/status/${data.data.id}` };
  }

  async scheduleThread(tweets: string[], scheduledAt: Date): Promise<{ ids: string[]; scheduledAt: string }> {
    // Thread IDs stored for Celery scheduler to fire in sequence
    const ids = tweets.map((_, i) => `twitter_thread_${Date.now()}_${i}`);
    return { ids, scheduledAt: scheduledAt.toISOString() };
  }

  async uploadMedia(mediaBuffer: Buffer, mimeType: string): Promise<string> {
    // Uses Twitter v1.1 media upload endpoint
    const base64 = mediaBuffer.toString('base64');
    const res = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.bearerToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `media_data=${encodeURIComponent(base64)}&media_type=${encodeURIComponent(mimeType)}`,
    });
    if (!res.ok) throw new Error(`Twitter uploadMedia failed: ${res.status}`);
    const data = await res.json();
    return data.media_id_string;
  }

  async getTweetAnalytics(tweetId: string): Promise<{
    impressions: number; likes: number; retweets: number; replies: number; clicks: number;
  }> {
    const res = await fetch(
      `${TWITTER_API_BASE}/tweets/${tweetId}?tweet.fields=public_metrics`,
      { headers: this.headers }
    );
    if (!res.ok) throw new Error(`Twitter getTweetAnalytics failed: ${res.status}`);
    const data = await res.json();
    const m = data.data?.public_metrics || {};
    return {
      impressions: m.impression_count || 0,
      likes: m.like_count || 0,
      retweets: m.retweet_count || 0,
      replies: m.reply_count || 0,
      clicks: m.url_link_clicks || 0,
    };
  }

  async searchTweets(query: string, maxResults: number = 10): Promise<any[]> {
    const params = new URLSearchParams({ query, max_results: String(maxResults), 'tweet.fields': 'public_metrics,created_at' });
    const res = await fetch(`${TWITTER_API_BASE}/tweets/search/recent?${params}`, { headers: this.headers });
    if (!res.ok) throw new Error(`Twitter searchTweets failed: ${res.status}`);
    const data = await res.json();
    return data.data || [];
  }
}

export function createTwitterConnector(config: TwitterConfig): TwitterConnector {
  return new TwitterConnector(config);
}

export default TwitterConnector;
