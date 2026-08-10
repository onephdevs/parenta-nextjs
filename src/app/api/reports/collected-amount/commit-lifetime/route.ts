import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { commitLifetimePeriod } from '@/lib/services/collection-lifetime';

/**
 * POST /api/reports/collected-amount/commit-lifetime
 * Persist: Previous Total + Current Period = Overall Collection
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const startDate = String(body.startDate || '');
    const endDate = String(body.endDate || '');
    const buildingId = body.buildingId ? String(body.buildingId) : null;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const result = await commitLifetimePeriod({
      startDate,
      endDate,
      buildingId,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: result.alreadyCommitted
        ? 'Period was already committed to lifetime total'
        : 'Lifetime collection updated',
    });
  } catch (error) {
    console.error('Error committing lifetime collection:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to commit lifetime collection',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
