import { NextResponse } from 'next/server';
import { savePlace } from '@/services/places/repository';
import type { PlaceInput } from '@/services/places/types';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { places?: PlaceInput[] };
    if (!Array.isArray(body.places) || body.places.length === 0) return NextResponse.json({ error: 'Select at least one place.' }, { status: 400 });
    const results = []; for (const place of body.places) results.push(await savePlace(place));
    return NextResponse.json({ status: results.every((item) => item.status === 'duplicate') ? 'duplicate' : 'saved', results });
  } catch (error) { console.error('savePlace failed', error); return NextResponse.json({ error: error instanceof Error && error.message.includes('Invalid Instagram') ? error.message : 'Could not save this place.' }, { status: 500 }); }
}
