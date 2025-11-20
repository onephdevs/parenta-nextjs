import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  calculateAllLateFees,
  calculateLateFeeForInvoice,
} from '@/lib/services/late-fee-service';

/**
 * GET /api/late-fees/calculate
 * Calculate late fees for all eligible invoices (dry run)
 * Query params:
 *  - invoice_id: Calculate for a specific invoice
 *  - setting_id: Use a specific setting (required if invoice_id is provided)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoice_id');
    const settingId = searchParams.get('setting_id');
    
    if (invoiceId) {
      // Calculate for a specific invoice
      if (!settingId) {
        return NextResponse.json(
          { success: false, error: 'setting_id is required when invoice_id is provided' },
          { status: 400 }
        );
      }
      
      const feeAmount = await calculateLateFeeForInvoice(invoiceId, settingId);
      
      return NextResponse.json({
        success: true,
        invoice_id: invoiceId,
        fee_amount: feeAmount,
        message: feeAmount > 0 
          ? `Late fee of ₱${feeAmount.toFixed(2)} would be applied`
          : 'No late fee applicable for this invoice',
      });
    } else {
      // Calculate for all eligible invoices
      const calculations = await calculateAllLateFees();
      const totalFeeAmount = calculations.reduce((sum, calc) => sum + calc.fee_amount, 0);
      
      return NextResponse.json({
        success: true,
        invoices_count: calculations.length,
        total_fee_amount: totalFeeAmount,
        calculations: calculations.map(calc => ({
          invoice_id: calc.invoice_id,
          tenant_id: calc.tenant_id,
          fee_amount: calc.fee_amount,
          days_overdue: calc.days_overdue,
          original_amount: calc.original_amount,
          calculation_method: calc.calculation_method,
        })),
        message: calculations.length > 0
          ? `${calculations.length} invoice(s) eligible for late fees totaling ₱${totalFeeAmount.toFixed(2)}`
          : 'No invoices currently eligible for late fees',
      });
    }
  } catch (error) {
    console.error('Error calculating late fees:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate late fees',
      },
      { status: 500 }
    );
  }
}

