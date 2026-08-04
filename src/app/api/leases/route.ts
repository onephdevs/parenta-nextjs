import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLeaseStats, getLeases, LeaseUiStatus } from '@/lib/api/leases';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const status = (searchParams.get('status') || 'all') as LeaseUiStatus | 'all';
    const buildingId = searchParams.get('buildingId') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const includeStats = searchParams.get('includeStats') !== 'false';

    const [list, stats] = await Promise.all([
      getLeases({ search, status, buildingId, page, limit }),
      includeStats ? getLeaseStats() : Promise.resolve(null),
    ]);

    return NextResponse.json({
      success: true,
      data: list.leases,
      pagination: list.pagination,
      stats,
    });
  } catch (error) {
    console.error('GET /api/leases error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch leases',
      },
      { status: 500 }
    );
  }
}
