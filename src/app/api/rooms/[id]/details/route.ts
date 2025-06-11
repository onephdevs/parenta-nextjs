import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { 
  getRoomById, 
  getCurrentTenantAssignment, 
  getRoomAssignmentHistory, 
  getRoomFinancialSummary,
  getRoomOccupancyMetrics 
} from '@/lib/api/rooms';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const { id: roomId } = await params;

    // Get comprehensive room data
    const [
      room,
      currentTenant,
      assignmentHistory,
      financialSummary,
      occupancyMetrics
    ] = await Promise.all([
      getRoomById(roomId),
      getCurrentTenantAssignment(roomId),
      getRoomAssignmentHistory(roomId),
      getRoomFinancialSummary(roomId),
      getRoomOccupancyMetrics(roomId)
    ]);

    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Room not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        room,
        currentTenant,
        assignmentHistory,
        financialSummary,
        occupancyMetrics
      }
    });

  } catch (error: unknown) {
    console.error('Error fetching room details:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Failed to fetch room details' },
      { status: 500 }
    );
  }
} 