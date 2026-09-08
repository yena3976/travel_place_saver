import { NextResponse } from 'next/server';
import { getPlaceDetails } from '@/services/places/getPlaceDetails';

export const dynamic = 'force-dynamic';
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ googlePlaceId: string }> },
) {
  try {
    const { googlePlaceId } = await params;
    return NextResponse.json(
      await getPlaceDetails(decodeURIComponent(googlePlaceId)),
      { headers: { 'Cache-Control': 'private, max-age=300' } },
    );
  } catch (error) {
    console.error('getPlaceDetails failed', error);
    return NextResponse.json(
      { error: '장소 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' },
      { status: 502 },
    );
  }
}
