import { NextResponse } from 'next/server';
import { savePlace } from '@/services/places/repository';
import type { PlaceInput } from '@/services/places/types';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { places?: PlaceInput[] };
    if (!Array.isArray(body.places) || body.places.length === 0)
      return NextResponse.json(
        { error: '저장할 장소를 하나 이상 선택해 주세요.' },
        { status: 400 },
      );
    const results = [];
    for (const place of body.places) results.push(await savePlace(place));
    return NextResponse.json({
      status: results.every((item) => item.status === 'duplicate')
        ? 'duplicate'
        : 'saved',
      results,
    });
  } catch (error) {
    console.error('savePlace failed', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.includes('Invalid Instagram')
            ? '올바른 인스타그램 게시물 또는 릴스 URL을 입력해 주세요.'
            : '장소를 저장하지 못했어요.',
      },
      { status: 500 },
    );
  }
}
