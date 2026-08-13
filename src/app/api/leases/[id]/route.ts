import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getLeaseById,
  getLeaseDocuments,
  getLeaseOccupants,
  getLeasePayments,
  updateLease,
} from '@/lib/api/leases';
import pool from '@/lib/db';
import { formatActivityDescription, formatActorName } from '@/lib/services/activity-taxonomy';
import { logActivitySafe } from '@/lib/services/activity-logger';

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
          al.metadata,
          al.created_at,
          u.first_name AS actor_first_name,
          u.last_name AS actor_last_name,
          u.email AS actor_email
        FROM activity_log al
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
      const metadata = (row.metadata as Record<string, unknown>) || {};
      const reason = metadata.reason ? String(metadata.reason) : null;
      const baseDescription =
        formatActivityDescription({
          actionType: String(row.action_type || 'item.updated'),
          entityLabel: row.entity_label as string | null,
          actorName,
          metadata,
        }) || 'Updated the lease.';
      const description = reason
        ? `Edited the lease. Reason: "${reason}"`
        : baseDescription;
      return {
        id: String(row.id),
        description,
        action: description,
        reason,
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

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const reason = String(body.reason || '').trim();
    if (!reason) {
      return NextResponse.json(
        { success: false, error: 'Reason is required to save lease changes' },
        { status: 400 }
      );
    }

    const { before, after } = await updateLease(id, {
      roomId: body.roomId ? String(body.roomId) : undefined,
      startDate:
        body.startDate === undefined
          ? undefined
          : body.startDate
            ? String(body.startDate).slice(0, 10)
            : null,
      endDate:
        body.endDate === undefined
          ? undefined
          : body.endDate
            ? String(body.endDate).slice(0, 10)
            : null,
      monthlyRate:
        body.monthlyRate !== undefined && body.monthlyRate !== null
          ? Number(body.monthlyRate)
          : undefined,
      depositPaid:
        body.depositPaid !== undefined
          ? body.depositPaid === null
            ? null
            : Number(body.depositPaid)
          : undefined,
      advancePaid:
        body.advancePaid !== undefined
          ? body.advancePaid === null
            ? null
            : Number(body.advancePaid)
          : undefined,
      utilityDepositPaid:
        body.utilityDepositPaid !== undefined
          ? body.utilityDepositPaid === null
            ? null
            : Number(body.utilityDepositPaid)
          : undefined,
      notes: body.notes !== undefined ? body.notes : undefined,
      templateName: body.templateName ? String(body.templateName) : null,
      leasePackageTemplateId: body.leasePackageTemplateId
        ? String(body.leasePackageTemplateId)
        : body.leasePackageTemplateId === null
          ? null
          : undefined,
      reason,
    });

    const tenantLabel = `${after.tenantFirstName} ${after.tenantLastName}`.trim();
    logActivitySafe({
      actorUserId: session.user.id || null,
      actorRole: 'admin',
      actionType: 'lease.updated',
      category: 'leases',
      entityType: 'assignment',
      entityId: after.id,
      entityLabel: `Lease · ${tenantLabel || after.id}`,
      beforeData: {
        roomId: before.roomId,
        roomNumber: before.roomNumber,
        buildingName: before.buildingName,
        startDate: before.startDate,
        endDate: before.endDate,
        monthlyRate: before.monthlyRate,
        depositPaid: before.depositPaid,
        advancePaid: before.advancePaid,
      },
      afterData: {
        roomId: after.roomId,
        roomNumber: after.roomNumber,
        buildingName: after.buildingName,
        startDate: after.startDate,
        endDate: after.endDate,
        monthlyRate: after.monthlyRate,
        depositPaid: after.depositPaid,
        advancePaid: after.advancePaid,
      },
      link: `/admin/tenants/${after.tenantId}?tab=lease`,
      metadata: {
        reason,
        templateName: body.templateName || null,
        tenantId: after.tenantId,
        link: `/admin/tenants/${after.tenantId}?tab=lease`,
      },
    });

    return NextResponse.json({
      success: true,
      data: { lease: after },
      message: 'Lease updated successfully',
    });
  } catch (error) {
    console.error('PATCH /api/leases/[id] error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update lease';
    const status =
      message === 'Lease not found'
        ? 404
        : message.includes('already has an active lease') || message.includes('required')
          ? 400
          : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
