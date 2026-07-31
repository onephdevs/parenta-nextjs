/**
 * GET /api/activity/[id] — activity detail with human-readable diffs (admin)
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import pool from '@/lib/db';
import { buildFieldDiffs } from '@/lib/services/activity-diff';
import { formatActivityDescription } from '@/lib/services/activity-taxonomy';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const result = await pool.query(
      `SELECT
         al.*,
         u.first_name,
         u.last_name,
         u.email
       FROM activity_log al
       LEFT JOIN users u ON u.id = al.actor_user_id
       WHERE al.id = $1
       LIMIT 1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Activity not found' }, { status: 404 });
    }

    const row = result.rows[0];
    const actorName =
      row.first_name || row.last_name
        ? `${row.first_name || ''} ${row.last_name || ''}`.trim()
        : row.email || (row.actor_role === 'system' ? 'System' : 'Unknown');

    const beforeData = row.before_data || null;
    const afterData = row.after_data || null;
    const diffs = buildFieldDiffs(beforeData, afterData);
    const link =
      (row.metadata && typeof row.metadata === 'object' && row.metadata.link) ||
      null;

    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        actorUserId: row.actor_user_id,
        actorRole: row.actor_role,
        actorName,
        actionType: row.action_type,
        category: row.category,
        entityType: row.entity_type,
        entityId: row.entity_id,
        entityLabel: row.entity_label,
        beforeData,
        afterData,
        diffs,
        metadata: row.metadata || {},
        link,
        createdAt: row.created_at,
        description: formatActivityDescription({
          actionType: row.action_type,
          entityLabel: row.entity_label,
          actorName,
        }),
      },
    });
  } catch (error) {
    console.error('GET /api/activity/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity detail' },
      { status: 500 }
    );
  }
}
