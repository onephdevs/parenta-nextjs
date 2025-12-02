import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantByUserId, getTenantCompleteData } from '@/lib/api/tenant-user-link';
import { calculateAllLateFees } from '@/lib/services/late-fee-service';
import { getBuildingDepositConfig } from '@/lib/api/building-deposit-config';
import pool from '@/lib/db';

/**
 * GET /api/tenant/balance
 * Calculate tenant's current balance including late fees
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || session.user.role !== 'tenant') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const tenant = await getTenantByUserId(userId);
    
    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tenant profile found',
        },
        { status: 404 }
      );
    }
    
    // Get tenant's complete data including building info
    const tenantData = await getTenantCompleteData(userId);
    
    // Calculate outstanding invoices (unpaid + partial)
    const outstandingQuery = `
      SELECT 
        COALESCE(SUM(balance_due), 0) as outstanding_amount,
        COUNT(*) as outstanding_count
      FROM invoices
      WHERE tenant_id = $1
        AND invoice_status IN ('sent', 'partial', 'overdue')
        AND balance_due > 0
    `;
    
    const outstandingResult = await pool.query(outstandingQuery, [tenant.id]);
    const outstandingAmount = parseFloat(outstandingResult.rows[0].outstanding_amount || 0);
    const outstandingCount = parseInt(outstandingResult.rows[0].outstanding_count || 0);
    
    // Get next due date and amount
    const nextDueQuery = `
      SELECT 
        due_date,
        balance_due,
        total_amount
      FROM invoices
      WHERE tenant_id = $1
        AND invoice_status IN ('sent', 'partial', 'overdue')
        AND balance_due > 0
      ORDER BY due_date ASC
      LIMIT 1
    `;
    
    const nextDueResult = await pool.query(nextDueQuery, [tenant.id]);
    const nextDue = nextDueResult.rows[0] || null;
    
    // Calculate late fees for this tenant's invoices
    let totalLateFees = 0;
    let lateFeeDetails: any[] = [];
    
    try {
      // Get all overdue invoices for late fees
      const overdueInvoicesQuery = `
        SELECT 
          i.id as invoice_id,
          i.tenant_id,
          i.balance_due as outstanding_amount,
          i.due_date,
          CURRENT_DATE - i.due_date AS days_overdue,
          b.id as building_id
        FROM invoices i
        LEFT JOIN tenants t ON i.tenant_id = t.id
        LEFT JOIN tenant_room_assignments tra ON t.id = tra.tenant_id AND tra.assignment_status = 'active'
        LEFT JOIN rooms r ON tra.room_id = r.id
        LEFT JOIN buildings b ON r.building_id = b.id
        WHERE i.tenant_id = $1
          AND i.invoice_status IN ('sent', 'partial', 'overdue')
          AND i.balance_due > 0
          AND i.due_date < CURRENT_DATE
      `;
      
      const overdueResult = await pool.query(overdueInvoicesQuery, [tenant.id]);
      
      if (overdueResult.rows.length > 0 && tenantData?.building_id) {
        // Get building deposit config for late fee settings
        const buildingConfig = await getBuildingDepositConfig(tenantData.building_id);
        
        if (buildingConfig && buildingConfig.lateFeeSettingId) {
          // Calculate late fees for each overdue invoice
          for (const invoice of overdueResult.rows) {
            try {
              const feeResult = await pool.query(
                'SELECT calculate_late_fee($1, $2) as fee_amount',
                [invoice.invoice_id, buildingConfig.lateFeeSettingId]
              );
              
              const feeAmount = parseFloat(feeResult.rows[0]?.fee_amount || 0);
              if (feeAmount > 0) {
                totalLateFees += feeAmount;
                lateFeeDetails.push({
                  invoiceId: invoice.invoice_id,
                  daysOverdue: invoice.days_overdue,
                  outstandingAmount: parseFloat(invoice.outstanding_amount || 0),
                  lateFee: feeAmount,
                });
              }
            } catch (feeError) {
              console.error(`Error calculating late fee for invoice ${invoice.invoice_id}:`, feeError);
              // Continue with other invoices
            }
          }
        }
      }
    } catch (lateFeeError) {
      console.error('Error calculating late fees:', lateFeeError);
      // Continue without late fees if calculation fails
    }
    
    const totalBalance = outstandingAmount + totalLateFees;
    
    return NextResponse.json({
      success: true,
      data: {
        outstanding: outstandingAmount,
        lateFees: totalLateFees,
        total: totalBalance,
        outstandingCount,
        nextDueDate: nextDue?.due_date || null,
        nextAmount: parseFloat(nextDue?.balance_due || nextDue?.total_amount || 0),
        lateFeeDetails: lateFeeDetails.length > 0 ? lateFeeDetails : undefined,
      },
    });
    
  } catch (error) {
    console.error('Error calculating balance:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate balance',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
