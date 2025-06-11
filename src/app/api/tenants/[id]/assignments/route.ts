import { NextResponse } from 'next/server';
import { assignTenantToRoom, endTenantAssignment } from '../../../../../lib/api/tenants';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: tenantId } = await params;
    const assignmentData = await request.json();
    
    // Basic validation
    if (!assignmentData.roomId || !assignmentData.startDate || !assignmentData.monthlyRate) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          details: 'Room ID, start date, and monthly rate are required'
        },
        { status: 400 }
      );
    }

    // Validate monthly rate
    if (assignmentData.monthlyRate <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid monthly rate',
          details: 'Monthly rate must be greater than 0'
        },
        { status: 400 }
      );
    }

    // Convert date string to Date object
    const startDate = new Date(assignmentData.startDate);
    if (isNaN(startDate.getTime())) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid start date',
          details: 'Please provide a valid start date'
        },
        { status: 400 }
      );
    }
    
    const assignment = await assignTenantToRoom(tenantId, assignmentData.roomId, {
      startDate,
      monthlyRate: parseFloat(assignmentData.monthlyRate),
      depositPaid: assignmentData.depositPaid ? parseFloat(assignmentData.depositPaid) : undefined,
      notes: assignmentData.notes
    });
    
    return NextResponse.json({
      success: true,
      data: assignment,
      message: 'Tenant assigned to room successfully'
    });
  } catch (error) {
    console.error('Assign tenant error:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('Room not found')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Room not found'
          },
          { status: 404 }
        );
      }
      if (error.message.includes('not available')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Room not available',
            details: 'The selected room is not available for assignment'
          },
          { status: 409 }
        );
      }
      if (error.message.includes('active room assignment')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Tenant already assigned',
            details: 'Tenant already has an active room assignment'
          },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to assign tenant to room',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const assignmentData = await request.json();
    
    // Basic validation
    if (!assignmentData.assignmentId || !assignmentData.endDate) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          details: 'Assignment ID and end date are required'
        },
        { status: 400 }
      );
    }

    // Convert date string to Date object
    const endDate = new Date(assignmentData.endDate);
    if (isNaN(endDate.getTime())) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid end date',
          details: 'Please provide a valid end date'
        },
        { status: 400 }
      );
    }
    
    await endTenantAssignment(
      assignmentData.assignmentId,
      endDate,
      assignmentData.notes
    );
    
    return NextResponse.json({
      success: true,
      message: 'Tenant assignment ended successfully'
    });
  } catch (error) {
    console.error('End assignment error:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Assignment not found'
          },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to end tenant assignment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 