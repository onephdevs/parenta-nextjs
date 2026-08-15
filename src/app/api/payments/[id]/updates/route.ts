/**
 * GET/POST /api/payments/[id]/updates — office conversation on a payment claim
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPaymentById } from '@/lib/api/payments';
import {
  createPaymentUpdate,
  getPaymentTenantNotifyUserId,
  listPaymentUpdates,
  notifyTenantPaymentChange,
} from '@/lib/api/payment-updates';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'staff', 'caretaker'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const payment = await getPaymentById(id);
    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    const updates = await listPaymentUpdates(id);
    return NextResponse.json({ success: true, data: updates });
  } catch (error) {
    console.error('GET /api/payments/[id]/updates error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load conversation' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'staff', 'caretaker'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const payment = await getPaymentById(id);
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
      `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim() ||
      session.user.email ||
      'Office';
    const authorRole = session.user.role === 'staff' ? 'staff' : 'admin';

    const update = await createPaymentUpdate({
      paymentId: id,
      authorRole,
      authorUserId: session.user.id,
      authorName,
      body: body || 'Photo',
      updateType: 'reply',
      photo,
    });

    const notify = await getPaymentTenantNotifyUserId(id);
    notifyTenantPaymentChange({
      actorUserId: session.user.id || null,
      actorRole: authorRole,
      actionType: 'payment.message',
      paymentId: id,
      title: `Office reply on ₱${notify.amount.toLocaleString()} payment`,
      tenantUserId: notify.userId,
      afterData: { body: update.body, hasPhoto: Boolean(update.photoUrl) },
      summary: update.body,
    });

    const updates = await listPaymentUpdates(id);
    return NextResponse.json({
      success: true,
      data: { update, updates },
      message: 'Message sent',
    });
  } catch (error) {
    console.error('POST /api/payments/[id]/updates error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to post message',
      },
      { status: 500 }
    );
  }
}
