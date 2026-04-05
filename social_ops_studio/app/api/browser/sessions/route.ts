import { NextRequest, NextResponse } from 'next/server';

const BROWSER_SERVICE_URL = process.env.BROWSER_SERVICE_URL ?? 'http://localhost:8040';

export async function GET() {
  try {
    const res = await fetch(`${BROWSER_SERVICE_URL}/api/browser/sessions`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Browser service unreachable', detail: message },
      { status: 502 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const platform = body.platform as string;

    if (!platform) {
      return NextResponse.json(
        { error: 'Missing required field: platform' },
        { status: 400 },
      );
    }

    const res = await fetch(
      `${BROWSER_SERVICE_URL}/api/browser/session/${encodeURIComponent(platform)}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      },
    );

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to disconnect platform', detail: message },
      { status: 502 },
    );
  }
}
