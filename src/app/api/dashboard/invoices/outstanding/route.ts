import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getOutstandingInvoices } from '@/lib/services/dashboard-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const outstanding = await getOutstandingInvoices();

    return NextResponse.json({
      success: true,
      data: outstanding
    });
  } catch (error) {
    console.error('Error fetching outstanding invoices:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch outstanding invoices' 
      },
      { status: 500 }
    );
  }
}

