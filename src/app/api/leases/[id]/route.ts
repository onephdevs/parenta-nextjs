import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getLeaseById,
  getLeaseDocuments,
  getLeaseOccupants,
  getLeasePayments,
} from '@/lib/api/leases';
import pool from '@/lib/db';
import { formatActivityDescription, formatActorName } from '@/lib/services/activity-taxonomy';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const lease = await getLeaseById(id);
    if (!lease) {
      return NextResponse.json({ success: false, error: 'Lease not found' }, { status: 404 });
    }

    const [occupants, payments, documents, activityResult] = await Promise.all([
      getLeaseOccupants(lease.tenantId, lease.roomId).catch((err) => {
        console.error('Lease occupants load failed:', err);
        return [];
      }),
      getLeasePayments(lease.tenantId, 10).catch((err) => {
        console.error('Lease payments load failed:', err);
        return [];
      }),
      getLeaseDocuments(lease.tenantId, lease.roomId).catch((err) => {
        console.error('Lease documents load failed:', err);
        return [];
      }),
      pool
        .query(
          `
        SELECT
          al.id,
          al.action_type,
          al.category,
          al.entity_type,
          al.entity_id,
          al.entity_label,
          al.description,
          al.created_at,
          al.metadata,
          u.first_name AS actor_first_name,
          u.last_name AS actor_last_name,
          u.email AS actor_email
        FROM activity_logs al
        LEFT JOIN users u ON u.id = al.actor_user_id
        WHERE (
          (al.entity_type = 'assignment' AND al.entity_id = $1)
          OR (al.entity_type = 'tenant' AND al.entity_id = $2)
          OR (al.entity_type = 'room' AND al.entity_id = $3)
        )
        ORDER BY al.created_at DESC
        LIMIT 15
        `,
          [lease.id, lease.tenantId, lease.roomId]
        )
        .catch((err) => {
          console.error('Lease activity load failed:', err);
          return { rows: [] as Record<string, unknown>[] };
        }),
    ]);

    const activity = (activityResult.rows || []).map((row) => {
      const actorName = formatActorName({
        firstName: row.actor_first_name as string | null,
        lastName: row.actor_last_name as string | null,
        email: row.actor_email as string | null,
      });
      const description =
        (row.description as string) ||
        formatActivityDescription({
          actionType: String(row.action_type || 'item.updated'),
          entityLabel: row.entity_label as string | null,
          actorName,
        });
      return {
        id: String(row.id),
        description,
        createdAt: String(row.created_at || ''),
        actorName,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        lease,
        occupants,
        payments,
        documents,
        activity,
      },
    });
  } catch (error) {
    console.error('GET /api/leases/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch lease',
      },
      { status: 500 }
    );
  }
}
