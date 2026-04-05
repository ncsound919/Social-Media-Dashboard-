import { NextRequest, NextResponse } from 'next/server';

const BROWSER_SERVICE_URL = process.env.BROWSER_SERVICE_URL ?? 'http://localhost:8040';

const ALLOWED_PLATFORMS = new Set(['x_twitter', 'linkedin', 'instagram', 'tiktok', 'youtube']);

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const { platform } = await params;

    if (!ALLOWED_PLATFORMS.has(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    const res = await fetch(
      `${BROWSER_SERVICE_URL}/api/browser/login/${encodeURIComponent(platform)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      },
    );

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[browser-proxy]', error);
    return NextResponse.json(
      { error: 'Browser service unavailable' },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
