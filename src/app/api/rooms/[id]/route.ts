import { NextResponse } from 'next/server';
import { getRoomById, updateRoom, deleteRoom } from '../../../../lib/api/rooms';
import { requireAdmin } from '@/lib/api-auth';
import { logActivitySafe } from '@/lib/services/activity-logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

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
    const { session, error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const roomData = await request.json();
    const before = await getRoomById(id);
    
    const room = await updateRoom(id, roomData);

    logActivitySafe({
      actorUserId: session?.user?.id || null,
      actorRole: 'admin',
      actionType: 'room.updated',
      category: 'buildings',
      entityType: 'room',
      entityId: id,
      entityLabel: room.roomNumber || room.room_number || before?.roomNumber || before?.room_number || id,
      beforeData: before as unknown as Record<string, unknown>,
      afterData: room as unknown as Record<string, unknown>,
      link: `/admin/rooms/${id}`,
      metadata: { link: `/admin/rooms/${id}` },
    });
    
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
    const { session, error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const before = await getRoomById(id);
    
    await deleteRoom(id);

    logActivitySafe({
      actorUserId: session?.user?.id || null,
      actorRole: 'admin',
      actionType: 'room.deleted',
      category: 'buildings',
      entityType: 'room',
      entityId: id,
      entityLabel: before?.roomNumber || before?.room_number || id,
      beforeData: before as unknown as Record<string, unknown>,
      afterData: null,
      link: '/admin/rooms',
      metadata: { link: '/admin/rooms' },
    });
    
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