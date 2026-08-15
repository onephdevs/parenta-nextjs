/**
 * GET/POST /api/tenant/payments/[id]/updates — tenant conversation on a payment claim
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/api/require-tenant-access';
import pool from '@/lib/db';
import {
  createPaymentUpdate,
  listPaymentUpdates,
} from '@/lib/api/payment-updates';
import { logActivitySafe } from '@/lib/services/activity-logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function loadOwnedPayment(paymentId: string, tenantId: string) {
  const result = await pool.query(
    `SELECT id, amount, payment_status
     FROM payments
     WHERE id = $1 AND tenant_id = $2
     LIMIT 1`,
    [paymentId, tenantId]
  );
  return result.rows[0] || null;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const access = await requireTenantAccess();
    if (access.error) return access.error;

    const { id } = await params;
    const payment = await loadOwnedPayment(id, access.tenant.id);
    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    const updates = await listPaymentUpdates(id);
    return NextResponse.json({ success: true, data: updates });
  } catch (error) {
    console.error('GET /api/tenant/payments/[id]/updates error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load conversation' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const access = await requireTenantAccess({ allowMutation: true });
    if (access.error) return access.error;

    const { id } = await params;
    const payment = await loadOwnedPayment(id, access.tenant.id);
    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    const form = await request.formData();
    const body = String(form.get('body') || '').trim();
    const photoValue = form.get('photo');
    const photo =
      photoValue instanceof File && photoValue.size > 0 ? photoValue : null;

    if (!body && !photo) {
      return NextResponse.json(
        { success: false, error: 'Add a message or photo' },
        { status: 400 }
      );
    }

    const authorName =
      `${access.tenant.first_name || ''} ${access.tenant.last_name || ''}`.trim() ||
      access.tenant.email ||
      'Tenant';

    const update = await createPaymentUpdate({
      paymentId: id,
      authorRole: 'tenant',
      authorUserId: access.userId,
      authorName,
      body: body || 'Photo',
      updateType: 'reply',
      photo,
    });

    logActivitySafe({
      actorUserId: access.userId,
      actorRole: 'tenant',
      actionType: 'payment.tenant_reply',
      category: 'payments',
      entityType: 'payment',
      entityId: id,
      entityLabel: `Tenant reply on ₱${Number(payment.amount).toLocaleString()} claim`,
      afterData: { body: update.body, hasPhoto: Boolean(update.photoUrl) },
      link: `/admin/tasks?board=payments`,
      metadata: {
        link: `/admin/tasks?board=payments`,
        summary: update.body,
      },
    });

    const updates = await listPaymentUpdates(id);
    return NextResponse.json({
      success: true,
      data: { update, updates },
      message: 'Message sent',
    });
  } catch (error) {
    console.error('POST /api/tenant/payments/[id]/updates error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to post message',
      },
      { status: 500 }
    );
  }
}
