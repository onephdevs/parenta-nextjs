import { NextResponse } from 'next/server';
import {
  createRoomsBulk,
  deleteRoomsBulk,
  RoomConflictError,
  BulkRoomValidationError,
} from '@/lib/api/rooms';
import { requireAdmin } from '@/lib/api-auth';
import { logActivitySafe } from '@/lib/services/activity-logger';
import { dedupeRoomNumbers, MAX_BULK_ROOMS } from '@/lib/rooms/parse-room-numbers';
import type { CreateRoomsBulkData } from '@/types/database';

export async function POST(request: Request) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const body = (await request.json()) as CreateRoomsBulkData;
    const roomNumbers = dedupeRoomNumbers(body.roomNumbers || []);

    if (!body.buildingId || !body.roomType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          details: 'Building ID and room type are required',
        },
        { status: 400 }
      );
    }

    if (roomNumbers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          details: 'At least one room number is required',
        },
        { status: 400 }
      );
    }

    if (roomNumbers.length > MAX_BULK_ROOMS) {
      return NextResponse.json(
        {
          success: false,
          error: `You can create at most ${MAX_BULK_ROOMS} rooms at once`,
        },
        { status: 400 }
      );
    }

    const rooms = await createRoomsBulk({
      ...body,
      roomNumbers,
    });

    logActivitySafe({
      actorUserId: session?.user?.id || null,
      actorRole: 'admin',
      actionType: 'room.bulk_created',
      category: 'buildings',
      entityType: 'building',
      entityId: body.buildingId,
      entityLabel: `${rooms.length} rooms`,
      afterData: {
        count: rooms.length,
        roomNumbers: rooms.map((r) => r.roomNumber),
      },
      link: `/admin/properties?buildingId=${encodeURIComponent(body.buildingId)}`,
      metadata: {
        count: rooms.length,
        roomNumbers: rooms.map((r) => r.roomNumber),
      },
    });

    return NextResponse.json({
      success: true,
      data: rooms,
      count: rooms.length,
      message: `Created ${rooms.length} rooms successfully`,
    });
  } catch (error) {
    console.error('Bulk create rooms error:', error);

    if (error instanceof RoomConflictError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          conflicts: error.conflicts,
        },
        { status: 409 }
      );
    }

    if (error instanceof BulkRoomValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create rooms',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const body = (await request.json()) as { roomIds?: string[] };
    const roomIds = [
      ...new Set((body.roomIds || []).map((id) => String(id || '').trim()).filter(Boolean)),
    ];

    if (roomIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          details: 'At least one room ID is required',
        },
        { status: 400 }
      );
    }

    if (roomIds.length > MAX_BULK_ROOMS) {
      return NextResponse.json(
        {
          success: false,
          error: `You can delete at most ${MAX_BULK_ROOMS} rooms at once`,
        },
        { status: 400 }
      );
    }

    const { deletedCount, deletedIds } = await deleteRoomsBulk(roomIds);

    logActivitySafe({
      actorUserId: session?.user?.id || null,
      actorRole: 'admin',
      actionType: 'room.bulk_deleted',
      category: 'buildings',
      entityType: 'room',
      entityId: null,
      entityLabel: `${deletedCount} rooms`,
      afterData: null,
      beforeData: { roomIds: deletedIds, count: deletedCount },
      link: '/admin/rooms',
      metadata: { count: deletedCount, roomIds: deletedIds },
    });

    return NextResponse.json({
      success: true,
      count: deletedCount,
      data: { deletedIds },
      message: `Deleted ${deletedCount} room${deletedCount === 1 ? '' : 's'} successfully`,
    });
  } catch (error) {
    console.error('Bulk delete rooms error:', error);

    if (error instanceof BulkRoomValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete rooms',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
