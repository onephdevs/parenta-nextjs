import { NextResponse } from 'next/server';
import { getAllReservations, createReservation } from '@/lib/api/reservations';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters for filtering
    const filters = {
      status: searchParams.get('status') || undefined,
      tenantId: searchParams.get('tenantId') || undefined,
      roomId: searchParams.get('roomId') || undefined,
      expiredOnly: searchParams.get('expiredOnly') === 'true' || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    };

    // Remove undefined values
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== undefined)
    );

    const result = await getAllReservations(Object.keys(cleanFilters).length > 0 ? cleanFilters : undefined);
    
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Reservations API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch reservations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    const reservationData = await request.json();
    
    // Basic validation (reservationDeposit may be 0)
    const depositValid = typeof reservationData.reservationDeposit === 'number' && reservationData.reservationDeposit >= 0;
    if (!reservationData.tenantId || !reservationData.roomId || !reservationData.expiryDate || reservationData.monthlyRate == null || reservationData.monthlyRate === '' || !depositValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          details: 'Tenant ID, room ID, expiry date, monthly rate, and reservation deposit (0 or greater) are required.'
        },
        { status: 400 }
      );
    }
    
    const reservation = await createReservation(
      reservationData,
      session.user.id
    );
    
    return NextResponse.json({
      success: true,
      data: reservation,
      message: 'Reservation created successfully'
    });
  } catch (error) {
    console.error('Create reservation error:', error);
    
    // Determine status code based on error type
    let statusCode = 500;
    let errorMessage = 'Failed to create reservation';
    let errorDetails = 'Unknown error';
    
    if (error instanceof Error) {
      errorDetails = error.message;
      
      // Set appropriate status codes for specific errors
      if (error.message.includes('not found') || error.message.includes('Room not found')) {
        statusCode = 404;
      } else if (error.message.includes('already') || error.message.includes('expired') || error.message.includes('Invalid')) {
        statusCode = 400; // Bad request for validation errors
      } else if (error.message.includes('Unauthorized')) {
        statusCode = 401;
      }
      
      errorMessage = errorDetails; // Use the actual error message
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: errorDetails
      },
      { status: statusCode }
    );
  }
}

