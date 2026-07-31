/**
 * GET /api/notifications — current user's in-app notifications (unread-first)
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireRole(['admin', 'tenant']);
    if (error || !session?.user?.id) return error;

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const offset = (page - 1) * limit;
    const userId = session.user.id;

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE is_read = false)::int AS unread
       FROM notifications
       WHERE user_id = $1`,
      [userId]
    );

    const listSql = unreadOnly
      ? `SELECT id, category, notification_type, title, message AS body,
                link, related_activity_log_id, is_read, created_at, priority
         FROM notifications
         WHERE user_id = $1 AND is_read = false
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`
      : `SELECT id, category, notification_type, title, message AS body,
                link, related_activity_log_id, is_read, created_at, priority
         FROM notifications
         WHERE user_id = $1
         ORDER BY is_read ASC, created_at DESC
         LIMIT $2 OFFSET $3`;

    const rows = (await pool.query(listSql, [userId, limit, offset])).rows;
    const total = unreadOnly
      ? countResult.rows[0]?.unread || 0
      : countResult.rows[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: {
        items: rows.map((r) => ({
          id: r.id,
          category: r.category,
          actionType: r.notification_type,
          title: r.title,
          body: r.body,
          link: r.link,
          relatedActivityLogId: r.related_activity_log_id,
          isRead: r.is_read,
          priority: r.priority,
          createdAt: r.created_at,
        })),
        unreadCount: countResult.rows[0]?.unread || 0,
        pagination: { page, limit, total },
      },
    });
  } catch (error) {
    console.error('GET /api/notifications error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
