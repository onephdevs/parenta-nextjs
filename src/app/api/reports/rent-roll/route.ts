import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getRentRollReport } from '@/lib/api/reports';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get('buildingId') ? parseInt(searchParams.get('buildingId')!) : undefined;

    const report = await getRentRollReport(buildingId);
    
    return NextResponse.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating rent roll report:', error);
    return NextResponse.json(
      { error: 'Failed to generate rent roll report' },
      { status: 500 }
    );
  }
}

