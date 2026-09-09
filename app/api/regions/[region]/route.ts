import { NextResponse } from 'next/server';
import { getRegionPlaces } from '@/services/places/repository';

export const dynamic = 'force-dynamic';
export async function GET(
  request: Request,
  { params }: { params: Promise<{ region: string }> },
) {
  try {
    const { region } = await params;
    const country = new URL(request.url).searchParams.get('country');
    return NextResponse.json(
      {
        region: decodeURIComponent(region),
        country,
        places: await getRegionPlaces(decodeURIComponent(region), country),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('getRegionPlaces failed', error);
    return NextResponse.json(
      { error: '이 여행지를 불러오지 못했어요.' },
      { status: 500 },
    );
  }
}
