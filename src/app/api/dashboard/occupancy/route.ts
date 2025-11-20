import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getOccupancyRate } from '@/lib/services/dashboard-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const occupancy = await getOccupancyRate();

    return NextResponse.json({
      success: true,
      data: occupancy
    });
  } catch (error) {
    console.error('Error fetching occupancy data:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch occupancy data' 
      },
      { status: 500 }
    );
  }
}

