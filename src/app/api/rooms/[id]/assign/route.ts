import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateInvoicesForTenant } from '@/lib/services/invoice-generator';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const client = await pool.connect();
  
  try {
    const { id: roomId } = await params;
    const { 
      tenantId, 
      startDate, 
      endDate, 
      monthlyRate, 
      depositPaid, 
      advanceAmount,
      notes,
      generateInvoices = true // Option to auto-generate invoices
    } = await request.json();
    
    // Validation
    if (!tenantId || !startDate || !monthlyRate) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          details: 'Tenant ID, start date, and monthly rate are required'
        },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // End any existing active assignments for this tenant
    await client.query(
      `UPDATE tenant_room_assignments 
       SET assignment_status = 'terminated', end_date = CURRENT_DATE 
       WHERE tenant_id = $1 AND assignment_status = 'active'`,
      [tenantId]
    );

    // Create new assignment
    const assignmentResult = await client.query(
      `INSERT INTO tenant_room_assignments 
       (tenant_id, room_id, start_date, end_date, monthly_rate, deposit_paid, assignment_status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)
       RETURNING *`,
      [tenantId, roomId, startDate, endDate || null, monthlyRate, depositPaid || null, notes || null]
    );

    // Update tenant status and move-in date
    await client.query(
      `UPDATE tenants 
       SET tenant_status = 'active', 
           move_in_date = $1,
           lease_start_date = $1,
           lease_end_date = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [startDate, tenantId, endDate || null]
    );

    // Update room status to occupied
    await client.query(
      `UPDATE rooms 
       SET room_status = 'occupied', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [roomId]
    );

    await client.query('COMMIT');

    // Auto-generate invoices if requested and end date is provided
    let invoiceResult;
    if (generateInvoices && endDate) {
      try {
        invoiceResult = await generateInvoicesForTenant({
          tenantId,
          roomId,
          leaseStartDate: new Date(startDate),
          leaseEndDate: new Date(endDate),
          monthlyRent: parseFloat(monthlyRate),
          depositAmount: depositPaid ? parseFloat(depositPaid) : undefined,
          advanceAmount: advanceAmount ? parseFloat(advanceAmount) : undefined
        });
      } catch (invoiceError) {
        console.error('Error generating invoices:', invoiceError);
        // Don't fail the assignment if invoice generation fails
        // Just log the error and continue
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        assignment: assignmentResult.rows[0],
        invoices: invoiceResult || null
      },
      message: invoiceResult 
        ? `Tenant assigned successfully. ${invoiceResult.invoicesCreated} invoice(s) generated.`
        : 'Tenant assigned to room successfully',
      invoicesGenerated: invoiceResult?.invoicesCreated || 0,
      invoiceDetails: invoiceResult ? {
        totalInvoices: invoiceResult.invoicesCreated,
        totalAmount: invoiceResult.invoices?.reduce((sum: number, inv: any) => sum + parseFloat(inv.amount), 0) || 0,
        firstInvoiceNumber: invoiceResult.invoices?.[0]?.invoiceNumber,
        lastInvoiceNumber: invoiceResult.invoices?.[invoiceResult.invoices.length - 1]?.invoiceNumber
      } : null
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Assign tenant to room error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to assign tenant to room',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
