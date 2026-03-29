/**
 * Pinterest Connector
 * OAuth 2.0 using Pinterest API v5
 */

export interface PinResult {
  pinId: string;
  url: string;
}

export interface PinAnalytics {
  impressions: number;
  saves: number;
  clicks: number;
  outboundClicks: number;
  pinClickRate: number;
}

export interface BoardResult {
  boardId: string;
  name: string;
  url: string;
}

const PINTEREST_API_BASE = 'https://api.pinterest.com/v5';

export class PinterestConnector {
  private readonly appId: string;
  private readonly appSecret: string;
  private accessToken: string | null = null;

  constructor(
    appId = process.env.PINTEREST_APP_ID ?? '',
    appSecret = process.env.PINTEREST_APP_SECRET ?? ''
  ) {
    this.appId = appId;
    this.appSecret = appSecret;
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  private get token(): string {
    if (!this.accessToken) throw new Error('Pinterest: no access token set');
    return this.accessToken;
  }

  private authHeaders(): HeadersInit {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  /** Build the Pinterest OAuth 2.0 authorization URL. */
  buildAuthorizationUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'boards:read,boards:write,pins:read,pins:write',
      state,
    });
    return `https://www.pinterest.com/oauth/?${params.toString()}`;
  }

  /** Exchange authorization code for an access token. */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
    const credentials = Buffer.from(`${this.appId}:${this.appSecret}`).toString('base64');
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });
    const res = await fetch('https://api.pinterest.com/v5/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    if (!res.ok) throw new Error(`Pinterest token exchange failed: ${await res.text()}`);
    const data = await res.json();
    this.accessToken = data.access_token;
    return data.access_token as string;
  }

  /** Create a pin on a board. */
  async createPin(
    title: string,
    description: string,
    imageUrl: string,
    boardId: string
  ): Promise<PinResult> {
    const body = {
      board_id: boardId,
      title,
      description,
      media_source: {
        source_type: 'image_url',
        url: imageUrl,
      },
    };
    const res = await fetch(`${PINTEREST_API_BASE}/pins`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Pinterest createPin failed: ${await res.text()}`);
    const data = await res.json();
    return { pinId: data.id, url: `https://www.pinterest.com/pin/${data.id}/` };
  }

  /** Get analytics for a pin over the last 30 days. */
  async getAnalytics(pinId: string): Promise<PinAnalytics> {
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    const metrics = 'IMPRESSION,SAVE,PIN_CLICK,OUTBOUND_CLICK';
    const url = `${PINTEREST_API_BASE}/pins/${pinId}/analytics?start_date=${startDate}&end_date=${endDate}&metric_types=${metrics}`;
    const res = await fetch(url, { headers: this.authHeaders() });
    if (!res.ok) throw new Error(`Pinterest getAnalytics failed: ${await res.text()}`);
    const data = await res.json();
    const daily = data.all?.daily_metrics ?? [];
    const totals: Record<string, number> = {};
    for (const day of daily) {
      for (const [key, value] of Object.entries(day.metrics ?? {})) {
        totals[key] = (totals[key] ?? 0) + (value as number);
      }
    }
    const impressions = totals.IMPRESSION ?? 0;
    const clicks = totals.PIN_CLICK ?? 0;
    return {
      impressions,
      saves: totals.SAVE ?? 0,
      clicks,
      outboundClicks: totals.OUTBOUND_CLICK ?? 0,
      pinClickRate: impressions > 0 ? clicks / impressions : 0,
    };
  }

  /** Create a new board. */
  async createBoard(name: string, description: string): Promise<BoardResult> {
    const body = { name, description, privacy: 'PUBLIC' };
    const res = await fetch(`${PINTEREST_API_BASE}/boards`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Pinterest createBoard failed: ${await res.text()}`);
    const data = await res.json();
    return { boardId: data.id, name: data.name, url: `https://www.pinterest.com/${data.owner?.username}/${data.name}/` };
  }
}
