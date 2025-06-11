import { NextRequest, NextResponse } from 'next/server';
import { getUtilityStats, getUtilityTrends, getProvidersStats, getUpcomingDueBills } from '../../../../lib/api/utilities';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const buildingId = searchParams.get('buildingId') || undefined;
    const months = searchParams.get('months') ? parseInt(searchParams.get('months')!) : 12;
    const upcomingDays = searchParams.get('upcomingDays') ? parseInt(searchParams.get('upcomingDays')!) : 7;

    // Fetch all stats in parallel
    const [stats, trends, providers, upcomingBills] = await Promise.all([
      getUtilityStats(buildingId),
      getUtilityTrends(buildingId, months),
      getProvidersStats(),
      getUpcomingDueBills(upcomingDays)
    ]);

    return NextResponse.json({
      overview: stats,
      trends,
      providers,
      upcomingBills
    });
  } catch (error) {
    console.error('Error in GET /api/utilities/stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch utility statistics' },
      { status: 500 }
    );
  }
} 