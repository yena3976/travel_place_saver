import { NextResponse } from 'next/server';
import { getRegions } from '@/services/places/repository';

export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    return NextResponse.json(await getRegions(), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('getRegions failed', error);
    return NextResponse.json(
      { error: '저장한 장소를 불러오지 못했어요.' },
      { status: 500 },
    );
  }
}
