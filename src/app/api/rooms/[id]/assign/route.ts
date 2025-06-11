import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { assignTenantToRoom, unassignTenantFromRoom } from '@/lib/api/rooms';

// Assign tenant to room
export async function POST(
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
    const body = await request.json();
    
    const { tenantId, startDate, monthlyRate, depositPaid, notes } = body;
    
    // Validation
    if (!tenantId || !startDate || !monthlyRate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: tenantId, startDate, monthlyRate' },
        { status: 400 }
      );
    }

    const assignment = await assignTenantToRoom(roomId, tenantId, {
      startDate: new Date(startDate),
      monthlyRate: parseFloat(monthlyRate),
      depositPaid: depositPaid ? parseFloat(depositPaid) : undefined,
      notes
    });

    return NextResponse.json({
      success: true,
      data: assignment
    });

  } catch (error: unknown) {
    console.error('Error assigning tenant to room:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Failed to assign tenant to room' },
      { status: 500 }
    );
  }
}

// Unassign tenant from room
export async function DELETE(
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
    const body = await request.json();
    
    const { tenantId, endDate, notes } = body;
    
    // Validation
    if (!tenantId || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: tenantId, endDate' },
        { status: 400 }
      );
    }

    const assignment = await unassignTenantFromRoom(
      roomId,
      tenantId,
      new Date(endDate),
      notes
    );

    return NextResponse.json({
      success: true,
      data: assignment
    });

  } catch (error: unknown) {
    console.error('Error unassigning tenant from room:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Failed to unassign tenant from room' },
      { status: 500 }
    );
  }
} 