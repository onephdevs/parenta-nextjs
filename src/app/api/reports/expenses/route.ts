import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getExpenseReport } from '@/lib/api/reports';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    const filters = {
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      buildingId: searchParams.get('buildingId') ? parseInt(searchParams.get('buildingId')!) : undefined,
      category: searchParams.get('category') || undefined,
    };

    const report = await getExpenseReport(filters);
    
    return NextResponse.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating expense report:', error);
    return NextResponse.json(
      { error: 'Failed to generate expense report' },
      { status: 500 }
    );
  }
}

