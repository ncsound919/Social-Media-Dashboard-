import { NextRequest, NextResponse } from 'next/server';

const BROWSER_SERVICE_URL = process.env.BROWSER_SERVICE_URL ?? 'http://localhost:8040';

const ALLOWED_PLATFORMS = new Set(['x_twitter', 'linkedin', 'instagram', 'tiktok', 'youtube']);

export async function GET() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(`${BROWSER_SERVICE_URL}/api/browser/schedule`, {
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

interface ScheduleBody {
  content: string;
  platforms: string[];
  scheduled_time: string;
  media_path?: string;
}

export async function POST(request: NextRequest) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const body: ScheduleBody = await request.json();

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

    const dt = new Date(body.scheduled_time);
    if (isNaN(dt.getTime()) || dt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'scheduled_time must be a valid future date' },
        { status: 400 },
      );
    }

    const res = await fetch(`${BROWSER_SERVICE_URL}/api/browser/schedule`, {
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
