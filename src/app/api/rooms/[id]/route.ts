import { NextResponse } from 'next/server';
import { getRoomById, updateRoom, deleteRoom } from '../../../../lib/api/rooms';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const room = await getRoomById(id);
    
    if (!room) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Room not found'
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Get room error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch room',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const roomData = await request.json();
    
    const room = await updateRoom(id, roomData);
    
    return NextResponse.json({
      success: true,
      data: room,
      message: 'Room updated successfully'
    });
  } catch (error) {
    console.error('Update room error:', error);
    
    const status = error instanceof Error && error.message === 'Room not found' ? 404 : 500;
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update room',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    await deleteRoom(id);
    
    return NextResponse.json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    console.error('Delete room error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete room',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 