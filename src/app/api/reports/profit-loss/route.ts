import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getProfitLossStatement } from '@/lib/api/reports';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Default to current year if not specified
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    const defaultTo = now.toISOString().split('T')[0];
    
    const filters = {
      dateFrom: searchParams.get('dateFrom') || defaultFrom,
      dateTo: searchParams.get('dateTo') || defaultTo,
      buildingId: searchParams.get('buildingId') ? parseInt(searchParams.get('buildingId')!) : undefined,
    };

    const report = await getProfitLossStatement(filters);
    
    return NextResponse.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating profit & loss statement:', error);
    return NextResponse.json(
      { error: 'Failed to generate profit & loss statement' },
      { status: 500 }
    );
  }
}

