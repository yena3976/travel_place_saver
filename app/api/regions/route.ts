import { NextResponse } from 'next/server';
import { getRegions } from '@/services/places/repository';

export const dynamic = 'force-dynamic';
export async function GET() {
  try { return NextResponse.json(await getRegions(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { console.error('getRegions failed', error); return NextResponse.json({ error: 'Could not load saved places.' }, { status: 500 }); }
}
