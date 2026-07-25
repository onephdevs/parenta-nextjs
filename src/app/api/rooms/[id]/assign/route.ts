import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateInvoicesForTenant } from '@/lib/services/invoice-generator';
import {
  getBuildingDepositConfig,
  calculateRequiredDeposit,
  calculateRequiredAdvance,
  getUtilityDeposit,
  validateDepositAmount,
  getDepositValidityDate,
  isDepositRefundable,
} from '@/lib/api/building-deposit-config';
import { requireAdmin } from '@/lib/api-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const client = await pool.connect();
  
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id: roomId } = await params;
    const { 
      tenantId, 
      startDate, 
      endDate, 
      monthlyRate, 
      depositPaid, 
      advanceAmount,
      utilityDepositAmount,
      notes
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

    // Get room and building information
    const roomResult = await client.query(
      `SELECT r.deposit_required, r.deposit_type, r.deposit_amount, r.deposit_percentage, 
              r.monthly_rate, r.building_id
       FROM rooms r
       WHERE r.id = $1`,
      [roomId]
    );

    if (roomResult.rows.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Room not found'
        },
        { status: 404 }
      );
    }

    const room = roomResult.rows[0];
    const buildingId = room.building_id;
    const monthlyRateValue = parseFloat(monthlyRate);
    
    // Get building deposit config (if exists)
    const buildingConfig = await getBuildingDepositConfig(buildingId);
    
    // Calculate required amounts based on building config or room config
    let requiredDeposit = 0;
    let requiredAdvance = 0;
    let requiredUtility = 0;
    
    if (buildingConfig) {
      // Use building config
      requiredDeposit = await calculateRequiredDeposit(buildingId, monthlyRateValue);
      requiredAdvance = await calculateRequiredAdvance(buildingId, monthlyRateValue);
      requiredUtility = await getUtilityDeposit(buildingId);
    } else if (room.deposit_required) {
      // Fall back to room-level deposit config
      switch (room.deposit_type) {
        case 'one_month':
          requiredDeposit = monthlyRateValue;
          break;
        case 'percentage':
          requiredDeposit = room.deposit_percentage
            ? (monthlyRateValue * parseFloat(room.deposit_percentage)) / 100
            : 0;
          break;
        case 'fixed':
          requiredDeposit = room.deposit_amount ? parseFloat(room.deposit_amount) : 0;
          break;
      }
    } else {
      // Default minimum deposit (3k minimum)
      requiredDeposit = 3000;
    }
    
    // Ensure deposit meets minimum requirement (3k minimum)
    const minimumDeposit = buildingConfig?.minimumDepositAmount || 3000;
    if (requiredDeposit < minimumDeposit) {
      requiredDeposit = minimumDeposit;
    }
    
    // Validate deposit amount
    const depositAmount = depositPaid ? parseFloat(depositPaid) : 0;
    if (depositAmount < requiredDeposit) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Deposit required: ₱${requiredDeposit.toLocaleString()}`,
          details: `This ${buildingConfig ? 'building' : 'room'} requires a deposit of ₱${requiredDeposit.toLocaleString()}. Current deposit: ₱${depositAmount.toLocaleString()}`
        },
        { status: 400 }
      );
    }
    
    // Validate advance amount if provided
    const advanceAmountValue = advanceAmount ? parseFloat(advanceAmount) : 0;
    if (advanceAmountValue > 0 && buildingConfig && advanceAmountValue < requiredAdvance) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Advance payment required: ₱${requiredAdvance.toLocaleString()}`,
          details: `This building requires an advance payment of ₱${requiredAdvance.toLocaleString()}. Current advance: ₱${advanceAmountValue.toLocaleString()}`
        },
        { status: 400 }
      );
    }
    
    // Validate utility deposit if provided
    const utilityDepositValue = utilityDepositAmount ? parseFloat(utilityDepositAmount) : 0;
    if (utilityDepositValue > 0 && buildingConfig && utilityDepositValue < requiredUtility) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Utility deposit required: ₱${requiredUtility.toLocaleString()}`,
          details: `This building requires a utility deposit of ₱${requiredUtility.toLocaleString()}. Current utility deposit: ₱${utilityDepositValue.toLocaleString()}`
        },
        { status: 400 }
      );
    }
    
    // Calculate deposit validity date (5 days from start date)
    // Rule: Deposit valid for 5 days, non-refundable after 5 days
    const depositValidUntil = buildingConfig
      ? await getDepositValidityDate(buildingId, new Date(startDate))
      : (() => {
          // Default: 5 days validity if no building config
          const validityDate = new Date(startDate);
          validityDate.setDate(validityDate.getDate() + 5);
          return validityDate;
        })();
    
    // Determine if deposit is refundable (true if within validity period, false after 5 days)
    const depositRefundable = depositValidUntil
      ? await isDepositRefundable(buildingId, depositValidUntil)
      : true;

    await client.query('BEGIN');

    // End any existing active assignments for this tenant
    await client.query(
      `UPDATE tenant_room_assignments 
       SET assignment_status = 'terminated', end_date = CURRENT_DATE 
       WHERE tenant_id = $1 AND assignment_status = 'active'`,
      [tenantId]
    );

    // Create new assignment with advance, utility deposit, and validity tracking
    const assignmentResult = await client.query(
      `INSERT INTO tenant_room_assignments 
       (tenant_id, room_id, start_date, end_date, monthly_rate, deposit_paid, 
        advance_paid, utility_deposit_paid, deposit_valid_until, deposit_refundable, 
        assignment_status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11)
       RETURNING *`,
      [
        tenantId, 
        roomId, 
        startDate, 
        endDate || null, 
        monthlyRate, 
        depositPaid || null,
        advanceAmountValue || null,
        utilityDepositValue || null,
        depositValidUntil || null,
        depositRefundable,
        notes || null
      ]
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

    // Always generate rent invoices for new assignments if end date is provided
    // This ensures all new tenant assignments automatically get rent invoices
    // Note: This is forward-looking only - does not retroactively create invoices for existing assignments
    let invoiceResult;
    if (endDate) {
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
