import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getTenantDepositTransactions,
  getTenantDepositBalance,
  getTenantDepositSummary,
  getDepositTransactionHistory
} from '@/lib/api/deposit-ledger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { tenantId } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'balance';

    let data;

    switch (type) {
      case 'balance':
        data = await getTenantDepositBalance(tenantId);
        break;
      case 'summary':
        data = await getTenantDepositSummary(tenantId);
        break;
      case 'history':
        data = await getDepositTransactionHistory(tenantId);
        break;
      case 'all':
        data = await getTenantDepositTransactions(tenantId);
        break;
      default:
        data = await getTenantDepositBalance(tenantId);
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error getting tenant deposit data:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to get tenant deposit data'
      },
      { status: 500 }
    );
  }
}

