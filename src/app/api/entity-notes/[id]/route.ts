/**
 * DELETE /api/entity-notes/[id]
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import {
  deleteEntityNote,
  getEntityNoteById,
} from '@/lib/api/entity-notes';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { error } = await requireRole(['admin', 'caretaker']);
    if (error) return error;

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Note id is required' },
        { status: 400 }
      );
    }

    const existing = await getEntityNoteById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Note not found' },
        { status: 404 }
      );
    }

    const deleted = await deleteEntityNote(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Note not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (err) {
    console.error('DELETE /api/entity-notes/[id] error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete note',
      },
      { status: 500 }
    );
  }
}
