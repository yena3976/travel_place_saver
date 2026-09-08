import { NextResponse } from 'next/server';
import { analyzeReel } from '@/services/reels/analyzeReel';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: unknown };
    if (typeof body.url !== 'string')
      return NextResponse.json(
        { error: 'A valid Instagram Reel URL is required.' },
        { status: 400 },
      );
    return NextResponse.json(await analyzeReel(body.url));
  } catch (error) {
    const invalid =
      error instanceof Error && error.message.includes('Invalid Instagram');
    return NextResponse.json(
      { error: invalid ? error.message : 'Could not analyze this Reel.' },
      { status: invalid ? 400 : 500 },
    );
  }
}
