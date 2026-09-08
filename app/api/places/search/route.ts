import { NextResponse } from 'next/server';
import { PlacesProviderError } from '@/services/places/googleClient';
import { searchPlaces } from '@/services/places/searchPlaces';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q') ?? '';
  if (query.trim().length < 3)
    return NextResponse.json({ results: [], cacheHit: false });
  try {
    return NextResponse.json(await searchPlaces(query), {
      headers: { 'Cache-Control': 'private, max-age=60' },
    });
  } catch (error) {
    console.error('searchPlaces failed', error);
    const status =
      error instanceof PlacesProviderError && error.kind === 'quota'
        ? 429
        : 502;
    return NextResponse.json(
      { error: '장소 검색에 실패했어요. 잠시 후 다시 시도해 주세요.' },
      { status },
    );
  }
}
