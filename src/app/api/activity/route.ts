/**
 * GET /api/activity — paginated, filterable activity feed (admin)
 * GET query: category, actionType, actorUserId, entityType, entityId, from, to, q, page, limit
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import pool from '@/lib/db';
import {
  formatActivityDescription,
  formatActorName,
  isActivityCategory,
} from '@/lib/services/activity-taxonomy';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function extractLink(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const link = (metadata as Record<string, unknown>).link;
  return typeof link === 'string' && link.length > 0 ? link : null;
}

function extractRoomId(row: {
  entity_label: string | null;
  metadata: unknown;
}): string | null {
  const meta = row.metadata && typeof row.metadata === 'object'
    ? (row.metadata as Record<string, unknown>)
    : null;
  if (meta && typeof meta.roomId === 'string' && UUID_RE.test(meta.roomId)) {
    return meta.roomId;
  }
  const label = row.entity_label?.trim() || '';
  const match = label.match(
    /^Room\s+([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i
  );
  return match?.[1] || null;
}

function formatRoomLabel(roomNumber: string, buildingName?: string | null): string {
  return buildingName ? `Room ${roomNumber} · ${buildingName}` : `Room ${roomNumber}`;
}

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const actionType = searchParams.get('actionType');
    const actorUserId = searchParams.get('actorUserId');
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const q = searchParams.get('q');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10) || 25));
    const offset = (page - 1) * limit;

    const where: string[] = ['1=1'];
    const params: unknown[] = [];
    let i = 1;

    if (category && isActivityCategory(category)) {
      where.push(`al.category = $${i++}`);
      params.push(category);
    }
    if (actionType) {
      where.push(`al.action_type = $${i++}`);
      params.push(actionType);
    }
    if (actorUserId) {
      where.push(`al.actor_user_id = $${i++}`);
      params.push(actorUserId);
    }
    if (entityType) {
      where.push(`al.entity_type = $${i++}`);
      params.push(entityType);
    }
    if (entityId) {
      where.push(`al.entity_id = $${i++}`);
      params.push(entityId);
    }
    if (from) {
      where.push(`al.created_at >= $${i++}`);
      params.push(from);
    }
    if (to) {
      where.push(`al.created_at <= $${i++}`);
      params.push(to);
    }
    if (q) {
      where.push(`(al.entity_label ILIKE $${i} OR al.action_type ILIKE $${i})`);
      params.push(`%${q}%`);
      i += 1;
    }

    const whereSql = where.join(' AND ');

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM activity_log al WHERE ${whereSql}`,
      params
    );
    const total = countResult.rows[0]?.total || 0;

    const listParams = [...params, limit, offset];
    const listResult = await pool.query(
      `SELECT
         al.id,
         al.actor_user_id,
         al.actor_role,
         al.action_type,
         al.category,
         al.entity_type,
         al.entity_id,
         al.entity_label,
         al.metadata,
         al.created_at,
         u.first_name,
         u.last_name,
         u.email
       FROM activity_log al
       LEFT JOIN users u ON u.id = al.actor_user_id
       WHERE ${whereSql}
       ORDER BY al.created_at DESC
       LIMIT $${i++} OFFSET $${i++}`,
      listParams
    );

    const roomIds = [
      ...new Set(
        listResult.rows
          .map((row) => extractRoomId(row))
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const roomLabelById = new Map<string, string>();
    if (roomIds.length > 0) {
      const rooms = await pool.query(
        `SELECT r.id, r.room_number, b.name AS building_name
         FROM rooms r
         LEFT JOIN buildings b ON b.id = r.building_id
         WHERE r.id = ANY($1::uuid[])`,
        [roomIds]
      );
      for (const room of rooms.rows) {
        roomLabelById.set(
          String(room.id),
          formatRoomLabel(String(room.room_number), room.building_name)
        );
      }
    }

    const items = listResult.rows.map((row) => {
      const actorName =
        formatActorName({
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          actorRole: row.actor_role,
          hasActorUserId: Boolean(row.actor_user_id),
        }) || 'Unknown';

      const roomId = extractRoomId(row);
      const entityLabel =
        (roomId && roomLabelById.get(roomId)) || row.entity_label;

      return {
        id: row.id,
        actorUserId: row.actor_user_id,
        actorRole: row.actor_role,
        actorName,
        actionType: row.action_type,
        category: row.category,
        entityType: row.entity_type,
        entityId: row.entity_id,
        entityLabel,
        metadata: row.metadata || {},
        link: extractLink(row.metadata),
        createdAt: row.created_at,
        description: formatActivityDescription({
          actionType: row.action_type,
          entityLabel,
          actorName,
        }),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error('GET /api/activity error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}
