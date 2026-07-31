import { NextResponse } from 'next/server';
import { convertReservationToAssignment } from '@/lib/api/reservations';
import { generateInvoicesForTenant } from '@/lib/services/invoice-generator';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivitySafe } from '@/lib/services/activity-logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
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

    const { id: reservationId } = await params;
    const assignmentData = await request.json();
    
    // Validation
    if (!assignmentData.startDate) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          details: 'Start date is required'
        },
        { status: 400 }
      );
    }

    // Convert reservation to assignment
    const result = await convertReservationToAssignment(reservationId, {
      startDate: new Date(assignmentData.startDate),
      endDate: assignmentData.endDate ? new Date(assignmentData.endDate) : undefined,
      depositPaid: assignmentData.depositPaid,
      advanceAmount: assignmentData.advanceAmount,
      notes: assignmentData.notes,
      generateInvoices: assignmentData.generateInvoices !== false, // Default to true
    });

    // Generate invoices if requested
    let invoiceResult;
    if (assignmentData.generateInvoices !== false && assignmentData.endDate) {
      try {
        // Get reservation details to get tenant and room info
        const reservation = result.reservation;
        
        invoiceResult = await generateInvoicesForTenant({
          tenantId: reservation.tenantId,
          roomId: reservation.roomId,
          leaseStartDate: new Date(assignmentData.startDate),
          leaseEndDate: new Date(assignmentData.endDate),
          monthlyRent: reservation.monthlyRate,
          depositAmount: assignmentData.depositPaid || reservation.reservationDeposit,
          advanceAmount: assignmentData.advanceAmount,
        });
      } catch (invoiceError) {
        console.error('Error generating invoices:', invoiceError);
        // Don't fail the conversion if invoice generation fails
      }
    }

    logActivitySafe({
      actorUserId: session.user.id || null,
      actorRole: 'admin',
      actionType: 'reservation.converted',
      category: 'leases',
      entityType: 'reservation',
      entityId: reservationId,
      entityLabel: reservationId,
      afterData: {
        reservation: result.reservation,
        assignmentId: result.assignmentId,
        invoices: invoiceResult || null,
      },
      link: result.reservation?.tenantId
        ? `/admin/tenants/${result.reservation.tenantId}`
        : '/admin/tenants/reservations',
      metadata: {
        link: result.reservation?.tenantId
          ? `/admin/tenants/${result.reservation.tenantId}`
          : '/admin/tenants/reservations',
        assignmentId: result.assignmentId,
      },
    });
    
    return NextResponse.json({
      success: true,
      data: {
        reservation: result.reservation,
        assignmentId: result.assignmentId,
        invoices: invoiceResult,
      },
      message: 'Reservation converted to assignment successfully'
    });
  } catch (error) {
    console.error('Convert reservation error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to convert reservation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

