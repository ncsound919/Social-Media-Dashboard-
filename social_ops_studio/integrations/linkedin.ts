/**
 * LinkedIn Connector
 * OAuth 2.0 PKCE flow using LinkedIn API v2
 */

export interface LinkedInPostResult {
  id: string;
  url: string;
}

export interface LinkedInFollowerCount {
  followerCount: number;
}

export interface LinkedInPostAnalytics {
  impressionCount: number;
  clickCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  engagementRate: number;
}

export interface LinkedInAudienceInsights {
  ageRanges: Record<string, number>;
  industries: Record<string, number>;
  functions: Record<string, number>;
  geoCountries: Record<string, number>;
}

const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

export class LinkedInConnector {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private accessToken: string | null = null;

  constructor(
    clientId = process.env.LINKEDIN_CLIENT_ID ?? '',
    clientSecret = process.env.LINKEDIN_CLIENT_SECRET ?? ''
  ) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /** Set the access token obtained via OAuth 2.0 PKCE flow. */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  private authHeaders(): HeadersInit {
    if (!this.accessToken) throw new Error('LinkedIn: no access token set');
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    };
  }

  /** Build the OAuth 2.0 PKCE authorization URL. */
  buildAuthorizationUrl(redirectUri: string, state: string, codeChallenge: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      state,
      scope: 'openid profile email w_member_social r_organization_social rw_organization_admin r_analytics',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  /** Exchange authorization code for access token. */
  async exchangeCodeForToken(code: string, redirectUri: string, codeVerifier: string): Promise<string> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code_verifier: codeVerifier,
    });
    const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) throw new Error(`LinkedIn token exchange failed: ${await res.text()}`);
    const data = await res.json();
    this.accessToken = data.access_token;
    return data.access_token as string;
  }

  /** Post a UGC post (text + optional image) to LinkedIn. */
  async postContent(text: string, imageUrl?: string): Promise<LinkedInPostResult> {
    const headers = this.authHeaders();

    // Resolve the current member's URN
    const meRes = await fetch(`${LINKEDIN_API_BASE}/userinfo`, { headers });
    if (!meRes.ok) throw new Error(`LinkedIn userinfo failed: ${await meRes.text()}`);
    const me = await meRes.json();
    const authorUrn = `urn:li:person:${me.sub}`;

    const shareMediaCategory = imageUrl ? 'IMAGE' : 'NONE';
    const media = imageUrl
      ? [{ status: 'READY', originalUrl: imageUrl, media: imageUrl }]
      : undefined;

    const body: Record<string, unknown> = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory,
          ...(media ? { media } : {}),
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    const res = await fetch(`${LINKEDIN_API_BASE}/ugcPosts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`LinkedIn postContent failed: ${await res.text()}`);
    const data = await res.json();
    return { id: data.id, url: `https://www.linkedin.com/feed/update/${data.id}` };
  }

  /** Get the follower count for an organization. */
  async getOrganizationFollowers(organizationId: string): Promise<LinkedInFollowerCount> {
    const headers = this.authHeaders();
    const url = `${LINKEDIN_API_BASE}/networkSizes/urn:li:organization:${organizationId}?edgeType=CompanyFollowedByMember`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`LinkedIn getOrganizationFollowers failed: ${await res.text()}`);
    const data = await res.json();
    return { followerCount: data.firstDegreeSize ?? 0 };
  }

  /** Get analytics for a specific post. */
  async getPostAnalytics(postId: string): Promise<LinkedInPostAnalytics> {
    const headers = this.authHeaders();
    const encoded = encodeURIComponent(`urn:li:ugcPost:${postId}`);
    const url = `${LINKEDIN_API_BASE}/socialActions/${encoded}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`LinkedIn getPostAnalytics failed: ${await res.text()}`);
    const data = await res.json();
    const likes = data.likesSummary?.totalLikes ?? 0;
    const comments = data.commentsSummary?.totalFirstLevelComments ?? 0;
    return {
      // Impression, click, and share counts require the LinkedIn Marketing Analytics API
      // (available only for organisation pages, not personal profiles)
      impressionCount: 0,
      clickCount: 0,
      likeCount: likes,
      commentCount: comments,
      shareCount: 0,
      // engagementRate requires impressions; set to 0 when unavailable
      engagementRate: 0,
    };
  }

  /** Get audience insights for the authenticated member. */
  async getAudienceInsights(): Promise<LinkedInAudienceInsights> {
    // Audience demographics are available via Reporting API for company pages
    return {
      ageRanges: {},
      industries: {},
      functions: {},
      geoCountries: {},
    };
  }
}
