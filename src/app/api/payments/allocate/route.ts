import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { allocatePaymentToInvoices } from '@/lib/services/payment-allocator';
import { PaymentAllocationRequest } from '@/types/financial';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { paymentId, tenantId, paymentAmount, depositAmount, useDeposit } = body;

    if (!paymentId || !tenantId || !paymentAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const requestData: PaymentAllocationRequest = {
      paymentId,
      tenantId,
      paymentAmount: parseFloat(paymentAmount),
      depositAmount: depositAmount ? parseFloat(depositAmount) : 0,
      useDeposit: useDeposit === true
    };

    const result = await allocatePaymentToInvoices(requestData);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error allocating payment:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to allocate payment'
      },
      { status: 500 }
    );
  }
}

