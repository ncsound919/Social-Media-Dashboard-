/**
 * Instagram / Meta Connector
 * Meta Graph API for Instagram Business accounts
 */

export interface MediaContainerResult {
  containerId: string;
}

export interface PublishResult {
  mediaId: string;
  permalink: string;
}

export interface InstagramInsights {
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  saved: number;
  engagementRate: number;
}

const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';

export class InstagramConnector {
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly businessAccountId: string;
  private accessToken: string | null = null;

  constructor(
    appId = process.env.META_APP_ID ?? '',
    appSecret = process.env.META_APP_SECRET ?? '',
    businessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ?? ''
  ) {
    this.appId = appId;
    this.appSecret = appSecret;
    this.businessAccountId = businessAccountId;
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  private get token(): string {
    if (!this.accessToken) throw new Error('Instagram: no access token set');
    return this.accessToken;
  }

  /** Build the Meta OAuth 2.0 authorization URL. */
  buildAuthorizationUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: redirectUri,
      scope: 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement',
      response_type: 'code',
      state,
    });
    return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
  }

  /** Exchange authorization code for access token. */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.appId,
      client_secret: this.appSecret,
      redirect_uri: redirectUri,
      code,
    });
    const res = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`);
    if (!res.ok) throw new Error(`Instagram token exchange failed: ${await res.text()}`);
    const data = await res.json();
    this.accessToken = data.access_token;
    return data.access_token as string;
  }

  /** Create a media container for an image or Reel. */
  async createMediaContainer(imageUrl: string, caption: string, isReel = false): Promise<MediaContainerResult> {
    const params = new URLSearchParams({
      access_token: this.token,
      caption,
      ...(isReel
        ? { media_type: 'REELS', video_url: imageUrl }
        : { image_url: imageUrl }),
    });
    const res = await fetch(
      `${GRAPH_API_BASE}/${this.businessAccountId}/media?${params.toString()}`,
      { method: 'POST' }
    );
    if (!res.ok) throw new Error(`Instagram createMediaContainer failed: ${await res.text()}`);
    const data = await res.json();
    return { containerId: data.id };
  }

  /** Publish a media container to Instagram. */
  async publishMedia(containerId: string): Promise<PublishResult> {
    const params = new URLSearchParams({
      access_token: this.token,
      creation_id: containerId,
    });
    const res = await fetch(
      `${GRAPH_API_BASE}/${this.businessAccountId}/media_publish?${params.toString()}`,
      { method: 'POST' }
    );
    if (!res.ok) throw new Error(`Instagram publishMedia failed: ${await res.text()}`);
    const data = await res.json();

    // Retrieve permalink
    const detailRes = await fetch(
      `${GRAPH_API_BASE}/${data.id}?fields=permalink&access_token=${this.token}`
    );
    const detail = detailRes.ok ? await detailRes.json() : {};
    return { mediaId: data.id, permalink: detail.permalink ?? '' };
  }

  /** Get insights for a published media object. */
  async getInsights(mediaId: string): Promise<InstagramInsights> {
    const metrics = 'impressions,reach,likes,comments,saved,total_interactions';
    const res = await fetch(
      `${GRAPH_API_BASE}/${mediaId}/insights?metric=${metrics}&access_token=${this.token}`
    );
    if (!res.ok) throw new Error(`Instagram getInsights failed: ${await res.text()}`);
    const data = await res.json();
    const values: Record<string, number> = {};
    for (const item of data.data ?? []) {
      values[item.name] = item.values?.[0]?.value ?? 0;
    }
    const reach = values.reach || 1;
    return {
      impressions: values.impressions ?? 0,
      reach: values.reach ?? 0,
      likes: values.likes ?? 0,
      comments: values.comments ?? 0,
      saved: values.saved ?? 0,
      engagementRate: ((values.likes ?? 0) + (values.comments ?? 0)) / reach,
    };
  }

  /** Create and publish a carousel post from multiple images. */
  async scheduleCarousel(images: string[], caption: string): Promise<PublishResult> {
    // Step 1: Create child containers for each image
    const childIds: string[] = [];
    for (const imageUrl of images) {
      const params = new URLSearchParams({
        access_token: this.token,
        image_url: imageUrl,
        is_carousel_item: 'true',
      });
      const res = await fetch(
        `${GRAPH_API_BASE}/${this.businessAccountId}/media?${params.toString()}`,
        { method: 'POST' }
      );
      if (!res.ok) throw new Error(`Instagram carousel child creation failed: ${await res.text()}`);
      const data = await res.json();
      childIds.push(data.id);
    }

    // Step 2: Create carousel container
    const params = new URLSearchParams({
      access_token: this.token,
      media_type: 'CAROUSEL',
      caption,
      children: childIds.join(','),
    });
    const carouselRes = await fetch(
      `${GRAPH_API_BASE}/${this.businessAccountId}/media?${params.toString()}`,
      { method: 'POST' }
    );
    if (!carouselRes.ok) throw new Error(`Instagram carousel container failed: ${await carouselRes.text()}`);
    const carouselData = await carouselRes.json();

    return this.publishMedia(carouselData.id);
  }
}
