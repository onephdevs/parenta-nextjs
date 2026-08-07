/**
 * GET /api/activity/[id] — activity detail with human-readable diffs (admin)
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import pool from '@/lib/db';
import { buildFieldDiffs } from '@/lib/services/activity-diff';
import {
  formatActivityDescription,
  formatActorName,
} from '@/lib/services/activity-taxonomy';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveEntityLabel(
  entityLabel: string | null,
  metadata: unknown
): Promise<string | null> {
  const meta =
    metadata && typeof metadata === 'object'
      ? (metadata as Record<string, unknown>)
      : null;
  const roomId =
    (meta && typeof meta.roomId === 'string' && UUID_RE.test(meta.roomId)
      ? meta.roomId
      : null) ||
    entityLabel?.match(
      /^Room\s+([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i
    )?.[1] ||
    null;

  if (!roomId) return entityLabel;

  const room = await pool.query(
    `SELECT r.room_number, b.name AS building_name
     FROM rooms r
     LEFT JOIN buildings b ON b.id = r.building_id
     WHERE r.id = $1
     LIMIT 1`,
    [roomId]
  );
  if (room.rows.length === 0) return entityLabel;
  const { room_number, building_name } = room.rows[0];
  return building_name
    ? `Room ${room_number} · ${building_name}`
    : `Room ${room_number}`;
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
      formatActorName({
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        actorRole: row.actor_role,
        hasActorUserId: Boolean(row.actor_user_id),
      }) || 'Unknown';

    const beforeData = row.before_data || null;
    const afterData = row.after_data || null;
    const diffs = buildFieldDiffs(beforeData, afterData);
    const link =
      (row.metadata && typeof row.metadata === 'object' && row.metadata.link) ||
      null;
    const entityLabel = await resolveEntityLabel(row.entity_label, row.metadata);

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
        entityLabel,
        beforeData,
        afterData,
        diffs,
        metadata: row.metadata || {},
        link,
        createdAt: row.created_at,
        description: formatActivityDescription({
          actionType: row.action_type,
          entityLabel,
          actorName,
          metadata: (row.metadata as Record<string, unknown>) || {},
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
