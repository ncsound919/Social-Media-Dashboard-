import { NextRequest, NextResponse } from 'next/server';

const BROWSER_SERVICE_URL = process.env.BROWSER_SERVICE_URL ?? 'http://localhost:8040';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  try {
    const { platform } = await params;

    const res = await fetch(
      `${BROWSER_SERVICE_URL}/api/browser/login/${encodeURIComponent(platform)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
    );

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to initiate login', detail: message },
      { status: 502 },
    );
  }
}
