import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getTenantCredits,
  getTenantCreditBalance,
  getTenantCreditSummary,
  getTenantCreditHistory
} from '@/lib/api/tenant-credits';

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
        data = await getTenantCreditBalance(tenantId);
        break;
      case 'summary':
        data = await getTenantCreditSummary(tenantId);
        break;
      case 'history':
        data = await getTenantCreditHistory(tenantId);
        break;
      case 'all':
        data = await getTenantCredits(tenantId);
        break;
      default:
        data = await getTenantCreditBalance(tenantId);
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error getting tenant credit data:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to get tenant credit data'
      },
      { status: 500 }
    );
  }
}

