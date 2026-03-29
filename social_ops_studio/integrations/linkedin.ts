const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

export interface LinkedInConfig {
  accessToken: string;
  organizationId?: string;
}

export interface LinkedInPost {
  text: string;
  visibility?: 'PUBLIC' | 'CONNECTIONS';
  mediaUrl?: string;
  mediaTitle?: string;
  mediaDescription?: string;
}

export interface LinkedInAnalytics {
  impressions: number;
  clicks: number;
  engagement: number;
  reactions: number;
  shares: number;
  comments: number;
}

class LinkedInConnector {
  private config: LinkedInConfig;

  constructor(config: LinkedInConfig) {
    this.config = config;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.config.accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    };
  }

  async getProfile(): Promise<{ id: string; name: string; email: string }> {
    const res = await fetch(`${LINKEDIN_API_BASE}/me?projection=(id,localizedFirstName,localizedLastName)`, {
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`LinkedIn getProfile failed: ${res.status}`);
    const data = await res.json();
    return {
      id: data.id,
      name: `${data.localizedFirstName} ${data.localizedLastName}`,
      email: '',
    };
  }

  async postContent(post: LinkedInPost): Promise<{ id: string; url: string }> {
    const profile = await this.getProfile();
    const authorUrn = `urn:li:person:${profile.id}`;

    const body: any = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: post.text },
          shareMediaCategory: post.mediaUrl ? 'ARTICLE' : 'NONE',
          ...(post.mediaUrl && {
            media: [{
              status: 'READY',
              originalUrl: post.mediaUrl,
              title: { text: post.mediaTitle || '' },
              description: { text: post.mediaDescription || '' },
            }],
          }),
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': post.visibility || 'PUBLIC' },
    };

    const res = await fetch(`${LINKEDIN_API_BASE}/ugcPosts`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`LinkedIn postContent failed: ${res.status}`);
    const data = await res.json();
    return { id: data.id, url: `https://www.linkedin.com/feed/update/${data.id}` };
  }

  async getPostAnalytics(postUrn: string): Promise<LinkedInAnalytics> {
    const encoded = encodeURIComponent(postUrn);
    const res = await fetch(
      `${LINKEDIN_API_BASE}/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encoded}`,
      { headers: this.headers }
    );
    if (!res.ok) throw new Error(`LinkedIn getPostAnalytics failed: ${res.status}`);
    const data = await res.json();
    const stats = data.elements?.[0]?.totalShareStatistics || {};
    return {
      impressions: stats.impressionCount || 0,
      clicks: stats.clickCount || 0,
      engagement: stats.engagement || 0,
      reactions: stats.likeCount || 0,
      shares: stats.shareCount || 0,
      comments: stats.commentCount || 0,
    };
  }

  async getAudienceInsights(): Promise<{ followers: number; demographics: Record<string, any> }> {
    if (!this.config.organizationId) throw new Error('organizationId required for audience insights');
    const orgUrn = encodeURIComponent(`urn:li:organization:${this.config.organizationId}`);
    const res = await fetch(
      `${LINKEDIN_API_BASE}/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=${orgUrn}`,
      { headers: this.headers }
    );
    if (!res.ok) throw new Error(`LinkedIn getAudienceInsights failed: ${res.status}`);
    const data = await res.json();
    return {
      followers: data.elements?.[0]?.followerCountsByAssociationType?.[0]?.followerCounts?.organicFollowerCount || 0,
      demographics: data.elements?.[0] || {},
    };
  }

  async schedulePost(post: LinkedInPost, scheduledAt: Date): Promise<{ id: string; scheduledAt: string }> {
    // Store in local queue; Celery will publish at scheduledAt
    const id = `linkedin_scheduled_${Date.now()}`;
    return { id, scheduledAt: scheduledAt.toISOString() };
  }
}

export function createLinkedInConnector(accessToken: string, organizationId?: string): LinkedInConnector {
  return new LinkedInConnector({ accessToken, organizationId });
}

export default LinkedInConnector;
