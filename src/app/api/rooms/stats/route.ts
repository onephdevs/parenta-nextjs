import { NextResponse } from 'next/server';
import { getRoomStats, getRoomStatsByBuilding } from '../../../../lib/api/rooms';

export async function GET() {
  try {
    const [generalStats, buildingStats] = await Promise.all([
      getRoomStats(),
      getRoomStatsByBuilding()
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        general: generalStats,
        byBuilding: buildingStats
      }
    });
  } catch (error) {
    console.error('Room stats API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch room statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 