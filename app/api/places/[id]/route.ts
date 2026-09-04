import { NextResponse } from 'next/server';
import { deleteSavedPlace } from '@/services/places/repository';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; await deleteSavedPlace(id); return NextResponse.json({ status: 'deleted' }); }
  catch (error) { console.error('deleteSavedPlace failed', error); return NextResponse.json({ error: 'Could not delete this place.' }, { status: 500 }); }
}
