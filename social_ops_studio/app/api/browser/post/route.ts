import { NextRequest, NextResponse } from 'next/server';

const BROWSER_SERVICE_URL = process.env.BROWSER_SERVICE_URL ?? 'http://localhost:8040';

const ALLOWED_PLATFORMS = new Set(['x_twitter', 'linkedin', 'instagram', 'tiktok', 'youtube']);

interface MultiPostBody {
  content: string;
  platforms: string[];
  media_path?: string;
  preview?: boolean;
}

export async function POST(request: NextRequest) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const body: MultiPostBody = await request.json();

    if (typeof body.content !== 'string' || body.content.trim().length === 0 || body.content.length > 10000) {
      return NextResponse.json(
        { error: 'Invalid content: must be a non-empty string up to 10000 characters' },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.platforms) || body.platforms.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: platforms[]' },
        { status: 400 },
      );
    }

    if (!body.platforms.every((p: unknown) => typeof p === 'string' && ALLOWED_PLATFORMS.has(p))) {
      return NextResponse.json(
        { error: 'Invalid platform in platforms[]' },
        { status: 400 },
      );
    }

    const res = await fetch(`${BROWSER_SERVICE_URL}/api/browser/post/multi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

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
