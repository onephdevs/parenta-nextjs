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

    const items = listResult.rows.map((row) => {
      const actorName =
        formatActorName({
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          actorRole: row.actor_role,
        }) || 'Unknown';
      return {
        id: row.id,
        actorUserId: row.actor_user_id,
        actorRole: row.actor_role,
        actorName,
        actionType: row.action_type,
        category: row.category,
        entityType: row.entity_type,
        entityId: row.entity_id,
        entityLabel: row.entity_label,
        metadata: row.metadata || {},
        createdAt: row.created_at,
        description: formatActivityDescription({
          actionType: row.action_type,
          entityLabel: row.entity_label,
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
