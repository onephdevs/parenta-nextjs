/**
 * PATCH /api/notifications/[id]/read — mark one notification as read (owner only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import pool from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(_request: NextRequest, { params }: RouteParams) {
  try {
    const { session, error } = await requireRole(['admin', 'tenant']);
    if (error || !session?.user?.id) return error;

    const { id } = await params;
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = true, read_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING id, is_read, read_at`,
      [id, session.user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: result.rows[0].id,
        isRead: result.rows[0].is_read,
        readAt: result.rows[0].read_at,
      },
    });
  } catch (error) {
    console.error('PATCH /api/notifications/[id]/read error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}
