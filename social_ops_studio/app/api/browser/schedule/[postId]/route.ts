import { NextRequest, NextResponse } from 'next/server';

const BROWSER_SERVICE_URL = process.env.BROWSER_SERVICE_URL ?? 'http://localhost:8040';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  try {
    const { postId } = await params;

    const res = await fetch(
      `${BROWSER_SERVICE_URL}/api/browser/schedule/${encodeURIComponent(postId)}`,
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
      { error: 'Failed to cancel scheduled post', detail: message },
      { status: 502 },
    );
  }
}
