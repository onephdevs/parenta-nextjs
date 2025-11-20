import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateInvoicesForTenant } from '@/lib/services/invoice-generator';
import { InvoiceGenerationRequest } from '@/types/financial';

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
    const { tenantId, roomId, leaseStartDate, leaseEndDate, monthlyRent, depositAmount } = body;

    if (!tenantId || !roomId || !leaseStartDate || !leaseEndDate || !monthlyRent) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const requestData: InvoiceGenerationRequest = {
      tenantId,
      roomId,
      leaseStartDate: new Date(leaseStartDate),
      leaseEndDate: new Date(leaseEndDate),
      monthlyRent: parseFloat(monthlyRent),
      depositAmount: depositAmount ? parseFloat(depositAmount) : undefined
    };

    const result = await generateInvoicesForTenant(requestData);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error generating invoices:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate invoices'
      },
      { status: 500 }
    );
  }
}

