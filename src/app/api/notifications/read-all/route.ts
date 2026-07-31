/**
 * PATCH /api/notifications/read-all — mark all of the current user's notifications read
 */
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import pool from '@/lib/db';

export async function PATCH() {
  try {
    const { session, error } = await requireRole(['admin', 'tenant']);
    if (error || !session?.user?.id) return error;

    const result = await pool.query(
      `UPDATE notifications
       SET is_read = true, read_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND is_read = false
       RETURNING id`,
      [session.user.id]
    );

    return NextResponse.json({
      success: true,
      data: { updatedCount: result.rowCount || 0 },
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('PATCH /api/notifications/read-all error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
}
