/**
 * Facebook Connector
 * Meta Graph API for Facebook Pages
 */

export interface FacebookPostResult {
  postId: string;
  url: string;
}

export interface FacebookPageInsights {
  impressions: number;
  reach: number;
  engagedUsers: number;
  newFans: number;
  postEngagements: number;
}

export interface AdCampaignConfig {
  name: string;
  objective: string;
  dailyBudget: number;
  startTime: string;
  endTime?: string;
}

export interface AdCampaignResult {
  campaignId: string;
  status: string;
}

const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';

export class FacebookConnector {
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly pageId: string;
  private accessToken: string | null = null;

  constructor(
    appId = process.env.META_APP_ID ?? '',
    appSecret = process.env.META_APP_SECRET ?? '',
    pageId = process.env.FACEBOOK_PAGE_ID ?? ''
  ) {
    this.appId = appId;
    this.appSecret = appSecret;
    this.pageId = pageId;
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  private get token(): string {
    if (!this.accessToken) throw new Error('Facebook: no access token set');
    return this.accessToken;
  }

  /** Build the Meta OAuth 2.0 authorization URL for Facebook Pages. */
  buildAuthorizationUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: redirectUri,
      scope: 'pages_manage_posts,pages_read_engagement,pages_read_user_content,ads_management',
      response_type: 'code',
      state,
    });
    return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
  }

  /** Exchange authorization code for an access token. */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.appId,
      client_secret: this.appSecret,
      redirect_uri: redirectUri,
      code,
    });
    const res = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`);
    if (!res.ok) throw new Error(`Facebook token exchange failed: ${await res.text()}`);
    const data = await res.json();
    this.accessToken = data.access_token;
    return data.access_token as string;
  }

  /** Create a post on the Facebook Page. */
  async createPagePost(message: string, imageUrl?: string): Promise<FacebookPostResult> {
    const params = new URLSearchParams({ access_token: this.token, message });
    if (imageUrl) params.set('link', imageUrl);

    const res = await fetch(`${GRAPH_API_BASE}/${this.pageId}/feed?${params.toString()}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`Facebook createPagePost failed: ${await res.text()}`);
    const data = await res.json();
    return {
      postId: data.id,
      url: `https://www.facebook.com/${data.id}`,
    };
  }

  /** Schedule a post to be published at a future time. */
  async schedulePost(message: string, scheduledTime: Date, imageUrl?: string): Promise<FacebookPostResult> {
    const unixTime = Math.floor(scheduledTime.getTime() / 1000);
    const params = new URLSearchParams({
      access_token: this.token,
      message,
      published: 'false',
      scheduled_publish_time: String(unixTime),
    });
    if (imageUrl) params.set('link', imageUrl);

    const res = await fetch(`${GRAPH_API_BASE}/${this.pageId}/feed?${params.toString()}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`Facebook schedulePost failed: ${await res.text()}`);
    const data = await res.json();
    return { postId: data.id, url: `https://www.facebook.com/${data.id}` };
  }

  /** Get page-level insights for the last 28 days. */
  async getPageInsights(): Promise<FacebookPageInsights> {
    const metrics = [
      'page_impressions',
      'page_reach',
      'page_engaged_users',
      'page_fan_adds',
      'page_post_engagements',
    ].join(',');
    const res = await fetch(
      `${GRAPH_API_BASE}/${this.pageId}/insights?metric=${metrics}&period=days_28&access_token=${this.token}`
    );
    if (!res.ok) throw new Error(`Facebook getPageInsights failed: ${await res.text()}`);
    const data = await res.json();
    const values: Record<string, number> = {};
    for (const item of data.data ?? []) {
      const last = item.values?.[item.values.length - 1];
      values[item.name] = last?.value ?? 0;
    }
    return {
      impressions: values.page_impressions ?? 0,
      reach: values.page_reach ?? 0,
      engagedUsers: values.page_engaged_users ?? 0,
      newFans: values.page_fan_adds ?? 0,
      postEngagements: values.page_post_engagements ?? 0,
    };
  }

  /** Create an ad campaign via the Marketing API. */
  async createAdCampaign(config: AdCampaignConfig): Promise<AdCampaignResult> {
    const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID;
    if (!adAccountId) throw new Error('Facebook: FACEBOOK_AD_ACCOUNT_ID env var not set');

    const body = {
      name: config.name,
      objective: config.objective,
      status: 'PAUSED',
      daily_budget: Math.round(config.dailyBudget * 100), // in cents
      start_time: config.startTime,
      ...(config.endTime ? { stop_time: config.endTime } : {}),
      access_token: this.token,
    };

    const res = await fetch(`${GRAPH_API_BASE}/act_${adAccountId}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Facebook createAdCampaign failed: ${await res.text()}`);
    const data = await res.json();
    return { campaignId: data.id, status: 'PAUSED' };
  }
}
