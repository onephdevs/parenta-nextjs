import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { applyLateFees } from '@/lib/services/late-fee-service';
import { LateFeeApplicationRequest } from '@/types/financial';

/**
 * POST /api/late-fees/apply
 * Apply late fees to invoices
 * Body:
 *  - invoice_ids: string[] (optional) - Specific invoices to apply fees to
 *  - dry_run: boolean (optional) - If true, calculate but don't actually apply
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body: LateFeeApplicationRequest = await request.json();
    const { invoice_ids, dry_run } = body;
    
    const result = await applyLateFees(invoice_ids, dry_run || false);
    
    if (!result.success && result.errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          partial_success: result.fees_applied > 0,
          fees_applied: result.fees_applied,
          total_fee_amount: result.total_fee_amount,
          applications: result.applications,
          errors: result.errors,
          message: `Applied ${result.fees_applied} late fee(s), ${result.errors.length} error(s) occurred`,
        },
        { status: 207 } // Multi-status
      );
    }
    
    return NextResponse.json({
      success: true,
      fees_applied: result.fees_applied,
      total_fee_amount: result.total_fee_amount,
      applications: result.applications.map(app => ({
        id: app.id,
        invoice_id: app.invoice_id,
        tenant_id: app.tenant_id,
        fee_amount: app.fee_amount,
        late_fee_invoice_id: app.late_fee_invoice_id,
        status: app.status,
      })),
      message: dry_run
        ? `Dry run: ${result.fees_applied} invoice(s) would have late fees applied totaling ₱${result.total_fee_amount.toFixed(2)}`
        : `Successfully applied ${result.fees_applied} late fee(s) totaling ₱${result.total_fee_amount.toFixed(2)}`,
    });
  } catch (error) {
    console.error('Error applying late fees:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply late fees',
      },
      { status: 500 }
    );
  }
}

