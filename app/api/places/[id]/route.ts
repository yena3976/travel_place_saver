import { NextResponse } from 'next/server';
import { deleteSavedPlace } from '@/services/places/repository';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await deleteSavedPlace(id);
    return NextResponse.json({ status: 'deleted' });
  } catch (error) {
    console.error('deleteSavedPlace failed', error);
    return NextResponse.json(
      { error: '장소를 삭제하지 못했어요.' },
      { status: 500 },
    );
  }
}
