import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  getTenantPaymentInstructions,
  parseTenantPaymentInstructions,
  saveTenantPaymentInstructions,
} from '@/lib/tenant-payment-instructions';

/**
 * GET /api/admin/payment-instructions
 * Admin: read tenant-facing transfer / GCash details
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const instructions = await getTenantPaymentInstructions();
    return NextResponse.json({ success: true, data: instructions });
  } catch (error) {
    console.error('Error fetching payment instructions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load payment instructions' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/payment-instructions
 * Admin: save phone number and transfer details for tenant portal
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const instructions = parseTenantPaymentInstructions(body);

    if (!instructions.phone) {
      return NextResponse.json(
        { success: false, error: 'Payment phone number is required' },
        { status: 400 }
      );
    }

    const saved = await saveTenantPaymentInstructions(instructions);
    return NextResponse.json({
      success: true,
      data: saved,
      message: 'Payment instructions saved',
    });
  } catch (error) {
    console.error('Error saving payment instructions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save payment instructions' },
      { status: 500 }
    );
  }
}
