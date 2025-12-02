import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateTenantListReport } from '@/lib/services/reports-service';

/**
 * GET /api/reports/tenant-list
 * Generate tenant list report
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const buildingId = searchParams.get('buildingId') || undefined;
    
    const filters: { status?: string; buildingId?: string } = {};
    if (status) filters.status = status;
    if (buildingId) filters.buildingId = buildingId;
    
    const reportData = await generateTenantListReport(filters);
    
    return NextResponse.json({
      success: true,
      data: reportData,
    });
    
  } catch (error) {
    console.error('Error generating tenant list report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate tenant list report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
