import { NextRequest, NextResponse } from 'next/server';
import { assignAssetToRoom, unassignAsset, getAssetAssignmentHistory } from '@/lib/api/assets';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { roomId, tenantId, notes } = body;
    
    if (!roomId) {
      return NextResponse.json(
        { success: false, error: 'Room ID is required' },
        { status: 400 }
      );
    }

    const success = await assignAssetToRoom(id, roomId, tenantId, notes);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to assign asset' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Asset assigned successfully'
    });
  } catch (error) {
    console.error('Error assigning asset:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to assign asset',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await unassignAsset(id);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to unassign asset' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Asset unassigned successfully'
    });
  } catch (error) {
    console.error('Error unassigning asset:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to unassign asset',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const history = await getAssetAssignmentHistory(id);
    
    return NextResponse.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching assignment history:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch assignment history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 