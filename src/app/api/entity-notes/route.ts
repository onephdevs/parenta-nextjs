/**
 * GET  /api/entity-notes?entityType=&entityId=
 * POST /api/entity-notes  { entityType, entityId, body }
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import {
  createEntityNote,
  isEntityNoteType,
  listEntityNotes,
} from '@/lib/api/entity-notes';

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireRole(['admin', 'caretaker']);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType') || '';
    const entityId = searchParams.get('entityId') || '';
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    if (!isEntityNoteType(entityType) || !entityId) {
      return NextResponse.json(
        {
          success: false,
          error: 'entityType and entityId are required',
        },
        { status: 400 }
      );
    }

    const data = await listEntityNotes(entityType, entityId, limit);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/entity-notes error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load notes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireRole(['admin', 'caretaker']);
    if (error) return error;

    const body = await request.json();
    const entityType = String(body.entityType || '');
    const entityId = String(body.entityId || '');
    const noteBody = String(body.body || '');

    if (!isEntityNoteType(entityType) || !entityId) {
      return NextResponse.json(
        {
          success: false,
          error: 'entityType and entityId are required',
        },
        { status: 400 }
      );
    }

    if (!noteBody.trim()) {
      return NextResponse.json(
        { success: false, error: 'Note body is required' },
        { status: 400 }
      );
    }

    const user = session!.user;
    const createdByUserId = String(user.id || '').trim() || null;
    const createdByName =
      `${String(user.firstName || '').trim()} ${String(user.lastName || '').trim()}`.trim() ||
      String(user.email || '').trim() ||
      null;

    if (!createdByUserId) {
      console.error('POST /api/entity-notes: session missing user.id', {
        email: user.email,
        role: user.role,
      });
      return NextResponse.json(
        { success: false, error: 'Unable to identify the signed-in user' },
        { status: 401 }
      );
    }

    const data = await createEntityNote({
      entityType,
      entityId,
      body: noteBody,
      createdByUserId,
      createdByName,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error('POST /api/entity-notes error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create note',
      },
      { status: 500 }
    );
  }
}
