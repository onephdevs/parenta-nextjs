import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import {
  deleteAdminHomeSticky,
  isStickyColor,
  updateAdminHomeSticky,
} from '@/lib/api/admin-home-stickies';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const userId = String(session!.user.id || '');
    const { id } = await params;
    if (!userId || !id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const patch: {
      id: string;
      userId: string;
      title?: string;
      body?: string;
      color?: string;
    } = { id, userId };

    if (typeof body.title === 'string') patch.title = body.title;
    if (typeof body.body === 'string') patch.body = body.body;
    if (typeof body.color === 'string') {
      if (!isStickyColor(body.color)) {
        return NextResponse.json({ success: false, error: 'Invalid color' }, { status: 400 });
      }
      patch.color = body.color;
    }

    const updated = await updateAdminHomeSticky(patch);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Sticky not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('PATCH /api/admin/home/stickies/[id] error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to update sticky' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const userId = String(session!.user.id || '');
    const { id } = await params;
    if (!userId || !id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    }

    const deleted = await deleteAdminHomeSticky(id, userId);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Sticky not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (err) {
    console.error('DELETE /api/admin/home/stickies/[id] error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to delete sticky' },
      { status: 500 }
    );
  }
}
