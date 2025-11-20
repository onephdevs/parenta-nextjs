import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendPaymentReminder } from '@/lib/services/notification-service';

/**
 * POST /api/notifications/send-reminder
 * Send a payment reminder for a specific invoice
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { invoice_id } = body;
    
    if (!invoice_id) {
      return NextResponse.json(
        { success: false, error: 'Invoice ID is required' },
        { status: 400 }
      );
    }
    
    const result = await sendPaymentReminder(invoice_id);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Error sending reminder:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send reminder',
      },
      { status: 500 }
    );
  }
}

