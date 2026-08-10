import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { generateOverduePaymentReminders } from '@/lib/services/overdue-payment-reminders';
import { updateOverdueInvoices } from '@/lib/services/invoice-generator';

/**
 * POST /api/notifications/payment-overdue
 * Sweep: mark overdue + create admin reminder notifications.
 */
export async function POST() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const overdueCount = await updateOverdueInvoices();
    const reminders = await generateOverduePaymentReminders();

    return NextResponse.json({
      success: true,
      overdueStatusUpdated: overdueCount,
      remindersCreated: reminders.created,
      invoiceIds: reminders.invoiceIds,
    });
  } catch (error) {
    console.error('Payment overdue sweep error:', error);
    return NextResponse.json(
      { error: 'Failed to generate overdue reminders' },
      { status: 500 }
    );
  }
}
