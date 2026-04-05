import { NextRequest, NextResponse } from 'next/server';

const BROWSER_SERVICE_URL = process.env.BROWSER_SERVICE_URL ?? 'http://localhost:8040';

const ALLOWED_PLATFORMS = new Set(['x_twitter', 'linkedin', 'instagram', 'tiktok', 'youtube']);

export async function GET() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(`${BROWSER_SERVICE_URL}/api/browser/sessions`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
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

export async function DELETE(request: NextRequest) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const body = await request.json();
    const platform = body.platform;

    if (typeof platform !== 'string' || !ALLOWED_PLATFORMS.has(platform)) {
      return NextResponse.json(
        { error: 'Invalid or missing platform' },
        { status: 400 },
      );
    }

    const res = await fetch(
      `${BROWSER_SERVICE_URL}/api/browser/session/${encodeURIComponent(platform)}`,
      {
        method: 'DELETE',
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
