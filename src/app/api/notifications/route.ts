/**
 * GET /api/notifications — current user's in-app notifications (unread-first)
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import pool from '@/lib/db';
import {
  formatActivityDescription,
  formatActorName,
} from '@/lib/services/activity-taxonomy';

interface NotificationRow {
  body: string | null;
  actor_action_type: string | null;
  actor_entity_label: string | null;
  actor_role: string | null;
  actor_first_name: string | null;
  actor_last_name: string | null;
  actor_email: string | null;
  actor_metadata: Record<string, unknown> | null;
}

function buildBody(row: NotificationRow): string {
  if (!row.actor_action_type) return row.body || '';

  const actorName = formatActorName({
    firstName: row.actor_first_name,
    lastName: row.actor_last_name,
    email: row.actor_email,
    actorRole: row.actor_role,
  });

  // Without a resolvable actor the rebuilt text degrades to "Someone …",
  // which is less useful than whatever was stored at creation time.
  if (!actorName) return row.body || '';

  return formatActivityDescription({
    actionType: row.actor_action_type,
    entityLabel: row.actor_entity_label,
    actorName,
    metadata: row.actor_metadata || {},
  });
}

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireRole(['admin', 'staff', 'tenant']);
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

    // The stored message is a snapshot taken when the notification was created,
    // so it goes stale when the actor renames themselves. Join back to the
    // originating activity log to rebuild the text from current user data.
    const selectSql = `
      SELECT n.id, n.category, n.notification_type, n.title, n.message AS body,
             n.link, n.related_activity_log_id, n.is_read, n.created_at, n.priority,
             al.action_type AS actor_action_type,
             al.entity_label AS actor_entity_label,
             al.actor_role AS actor_role,
             al.metadata AS actor_metadata,
             u.first_name AS actor_first_name,
             u.last_name AS actor_last_name,
             u.email AS actor_email
      FROM notifications n
      LEFT JOIN activity_log al ON al.id = n.related_activity_log_id
      LEFT JOIN users u ON u.id = al.actor_user_id`;

    const listSql = unreadOnly
      ? `${selectSql}
         WHERE n.user_id = $1 AND n.is_read = false
         ORDER BY n.created_at DESC
         LIMIT $2 OFFSET $3`
      : `${selectSql}
         WHERE n.user_id = $1
         ORDER BY n.is_read ASC, n.created_at DESC
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
          body: buildBody(r),
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
