import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { 
  getMeterReadingStats, 
  getConsumptionTrends, 
  getMetersNeedingReadings,
  getUsageComparison 
} from '@/lib/api/meterReadings';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    const buildingId = searchParams.get('buildingId') || undefined;
    const roomId = searchParams.get('roomId') || undefined;
    const months = searchParams.get('months') ? parseInt(searchParams.get('months')!) : 12;
    const daysFromLastReading = searchParams.get('daysFromLastReading') ? parseInt(searchParams.get('daysFromLastReading')!) : 30;

    // Fetch all stats in parallel
    const [stats, trends, metersNeedingReadings] = await Promise.all([
      getMeterReadingStats(buildingId, roomId),
      getConsumptionTrends(buildingId, roomId, months),
      getMetersNeedingReadings(daysFromLastReading)
    ]);

    return NextResponse.json({
      success: true,
      data: {
        overview: stats,
        trends,
        metersNeedingReadings
      }
    });
  } catch (error) {
    console.error('Error fetching meter reading statistics:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch meter reading statistics' 
      },
      { status: 500 }
    );
  }
} 