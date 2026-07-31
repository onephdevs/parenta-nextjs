import { NextResponse } from 'next/server';
import { getReservationById, updateReservation, cancelReservation } from '@/lib/api/reservations';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivitySafe } from '@/lib/services/activity-logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const reservation = await getReservationById(id);
    
    if (!reservation) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Reservation not found'
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: reservation,
    });
  } catch (error) {
    console.error('Get reservation error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch reservation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    const { id } = await params;
    const updates = await request.json();
    const before = await getReservationById(id);
    
    const reservation = await updateReservation(id, updates);

    logActivitySafe({
      actorUserId: session.user.id || null,
      actorRole: 'admin',
      actionType: 'reservation.updated',
      category: 'leases',
      entityType: 'reservation',
      entityId: id,
      entityLabel: id,
      beforeData: before as unknown as Record<string, unknown>,
      afterData: reservation as unknown as Record<string, unknown>,
      link: '/admin/tenants/reservations',
      metadata: { link: '/admin/tenants/reservations' },
    });
    
    return NextResponse.json({
      success: true,
      data: reservation,
      message: 'Reservation updated successfully'
    });
  } catch (error) {
    console.error('Update reservation error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update reservation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const refundDeposit = searchParams.get('refundDeposit') !== 'false'; // Default to true
    const before = await getReservationById(id);
    
    const reservation = await cancelReservation(id, refundDeposit);

    logActivitySafe({
      actorUserId: session.user.id || null,
      actorRole: 'admin',
      actionType: 'reservation.cancelled',
      category: 'leases',
      entityType: 'reservation',
      entityId: id,
      entityLabel: id,
      beforeData: before as unknown as Record<string, unknown>,
      afterData: reservation as unknown as Record<string, unknown>,
      link: '/admin/tenants/reservations',
      metadata: { link: '/admin/tenants/reservations', refundDeposit },
    });
    
    return NextResponse.json({
      success: true,
      data: reservation,
      message: 'Reservation cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel reservation error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to cancel reservation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

