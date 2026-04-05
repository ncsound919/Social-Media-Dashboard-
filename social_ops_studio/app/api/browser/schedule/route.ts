import { NextRequest, NextResponse } from 'next/server';

const BROWSER_SERVICE_URL = process.env.BROWSER_SERVICE_URL ?? 'http://localhost:8040';

export async function GET() {
  try {
    const res = await fetch(`${BROWSER_SERVICE_URL}/api/browser/schedule`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch scheduled posts', detail: message },
      { status: 502 },
    );
  }
}

interface ScheduleBody {
  content: string;
  platforms: string[];
  scheduled_time: string;
  media_path?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ScheduleBody = await request.json();

    if (!body.content || !Array.isArray(body.platforms) || !body.scheduled_time) {
      return NextResponse.json(
        { error: 'Missing required fields: content, platforms[], scheduled_time' },
        { status: 400 },
      );
    }

    const res = await fetch(`${BROWSER_SERVICE_URL}/api/browser/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to schedule post', detail: message },
      { status: 502 },
    );
  }
}
