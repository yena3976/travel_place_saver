import { NextResponse } from 'next/server';
import { analyzeReel } from '@/services/reels/analyzeReel';

// Reel analysis runs in a regular Node.js serverless function. It downloads
// media into memory and does not depend on an Edge runtime, local files, or ffmpeg.
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: unknown };
    if (typeof body.url !== 'string')
      return NextResponse.json(
        { error: '올바른 인스타그램 게시물 또는 릴스 URL이 필요해요.' },
        { status: 400 },
      );
    return NextResponse.json(await analyzeReel(body.url));
  } catch (error) {
    const invalid =
      error instanceof Error && error.message.includes('Invalid Instagram');
    return NextResponse.json(
      {
        error: invalid
          ? '올바른 인스타그램 게시물 또는 릴스 URL을 입력해 주세요.'
          : '이 인스타그램 게시물을 분석하지 못했어요.',
      },
      { status: invalid ? 400 : 500 },
    );
  }
}
