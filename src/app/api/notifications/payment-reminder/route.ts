import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { logActivity } from '@/lib/services/activity-logger';
import { formatCurrency } from '@/lib/utils/formatCurrency';

/**
 * POST /api/notifications/payment-reminder
 * Notify the tenant's portal account that a payment reminder was sent.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== 'admin' && session.user.role !== 'staff')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const tenantId = String(body.tenantId || '').trim();
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const tenantResult = await pool.query(
      `SELECT t.id, t.first_name, t.last_name, t.user_id, t.email,
              r.room_number, b.name AS building_name
       FROM tenants t
       LEFT JOIN tenant_room_assignments tra
         ON tra.tenant_id = t.id AND tra.assignment_status = 'active'
       LEFT JOIN rooms r ON r.id = tra.room_id
       LEFT JOIN buildings b ON b.id = r.building_id
       WHERE t.id = $1
       LIMIT 1`,
      [tenantId]
    );

    if (tenantResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const tenant = tenantResult.rows[0];
    if (!tenant.user_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'This tenant has no portal account to notify',
        },
        { status: 400 }
      );
    }

    const amountDue =
      body.amountDue != null && Number.isFinite(Number(body.amountDue))
        ? Number(body.amountDue)
        : null;
    const dueDate = body.dueDate ? String(body.dueDate) : null;
    const roomLabel = body.roomNumber
      ? `Unit ${body.roomNumber}`
      : tenant.room_number
        ? `Unit ${tenant.room_number}`
        : null;
    const buildingName =
      String(body.buildingName || tenant.building_name || '').trim() || null;
    const tenantName = `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim();

    const amountLabel =
      amountDue != null && amountDue > 0 ? formatCurrency(amountDue) : null;
    const dueLabel = dueDate
      ? new Date(dueDate).toLocaleDateString('en-PH', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : null;

    const result = await logActivity({
      actorUserId: session.user.id || null,
      actorRole: 'admin',
      actionType: 'payment.reminder_sent',
      category: 'payments',
      entityType: 'tenant',
      entityId: tenantId,
      entityLabel: tenantName || tenant.email || 'Tenant',
      afterData: {
        amountDue,
        dueDate,
        roomNumber: roomLabel,
        buildingName,
      },
      metadata: {
        link: '/tenant/payments',
        amountDue,
        dueDate,
        amountLabel,
        dueLabel,
        roomLabel,
        buildingName,
        message: [
          'Please settle your outstanding balance.',
          amountLabel ? `Amount due: ${amountLabel}.` : null,
          dueLabel ? `Due date: ${dueLabel}.` : null,
          roomLabel || buildingName
            ? `Unit: ${[roomLabel, buildingName].filter(Boolean).join(' · ')}.`
            : null,
        ]
          .filter(Boolean)
          .join(' '),
      },
      link: '/tenant/payments',
      notifyUserIds: [String(tenant.user_id)],
      notifyActor: false,
    });

    if (!result.notificationIds.length) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Reminder logged but the tenant notification was not delivered. Check their notification preferences.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Payment reminder sent to ${tenantName || 'tenant'}`,
      data: {
        notificationIds: result.notificationIds,
        activityLogId: result.activityLogId,
      },
    });
  } catch (error) {
    console.error('Error sending payment reminder:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send reminder',
      },
      { status: 500 }
    );
  }
}
