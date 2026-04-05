import { NextRequest, NextResponse } from 'next/server';

const BROWSER_SERVICE_URL = process.env.BROWSER_SERVICE_URL ?? 'http://localhost:8040';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const { postId } = await params;

    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(postId)) {
      return NextResponse.json({ error: 'Invalid postId format' }, { status: 400 });
    }

    const res = await fetch(
      `${BROWSER_SERVICE_URL}/api/browser/schedule/${encodeURIComponent(postId)}`,
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
