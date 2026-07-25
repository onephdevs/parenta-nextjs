import { NextResponse } from 'next/server';
import { getAllRooms, createRoom } from '../../../lib/api/rooms';
import { requireAdmin } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    
    // Extract query parameters for filtering
    const filters = {
      buildingId: searchParams.get('buildingId') || undefined,
      roomType: searchParams.get('roomType') || undefined,
      roomStatus: searchParams.get('roomStatus') || undefined,
      search: searchParams.get('search') || undefined,
    };

    // Remove undefined values
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== undefined)
    );

    const roomsResult = await getAllRooms(Object.keys(cleanFilters).length > 0 ? cleanFilters : undefined);
    
    return NextResponse.json({
      success: true,
      data: roomsResult.rooms,
      pagination: roomsResult.pagination,
      count: roomsResult.rooms.length
    });
  } catch (error) {
    console.error('Rooms API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch rooms',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const roomData = await request.json();
    
    // Basic validation
    if (!roomData.buildingId || !roomData.roomNumber || !roomData.roomType) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          details: 'Building ID, room number, and room type are required'
        },
        { status: 400 }
      );
    }
    
    const room = await createRoom(roomData);
    
    return NextResponse.json({
      success: true,
      data: room,
      message: 'Room created successfully'
    });
  } catch (error) {
    console.error('Create room error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create room',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 