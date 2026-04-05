import { NextRequest, NextResponse } from 'next/server';

const BROWSER_SERVICE_URL = process.env.BROWSER_SERVICE_URL ?? 'http://localhost:8040';

interface MultiPostBody {
  content: string;
  platforms: string[];
  media_path?: string;
  preview?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: MultiPostBody = await request.json();

    if (!body.content || !Array.isArray(body.platforms) || body.platforms.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: content, platforms[]' },
        { status: 400 },
      );
    }

    const res = await fetch(`${BROWSER_SERVICE_URL}/api/browser/post/multi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to publish post', detail: message },
      { status: 502 },
    );
  }
}
