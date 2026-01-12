import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { backfillRentInvoicesForActiveTenants } from '@/lib/services/rent-invoice-backfill';

/**
 * POST /api/admin/invoices/backfill-rent
 * One-time demo backfill to generate rent invoices for tenants with active leases but no existing rent invoices
 * Admin-only endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Execute backfill
    const summary = await backfillRentInvoicesForActiveTenants();

    return NextResponse.json({
      success: summary.success,
      message: summary.success
        ? `Backfill completed successfully. Processed ${summary.totalTenantsProcessed} tenant(s), created ${summary.totalInvoicesCreated} invoice(s), applied ${summary.totalAdvanceApplied} in advance, and updated ${summary.totalStatusesUpdated} invoice status(es).`
        : 'Backfill completed with errors',
      data: {
        totalTenantsProcessed: summary.totalTenantsProcessed,
        totalInvoicesCreated: summary.totalInvoicesCreated,
        totalPaymentsApplied: summary.totalPaymentsApplied,
        totalAdvanceApplied: summary.totalAdvanceApplied,
        totalStatusesUpdated: summary.totalStatusesUpdated,
        results: summary.results,
        errors: summary.errors
      }
    });

  } catch (error) {
    console.error('Error executing rent invoice backfill:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute rent invoice backfill',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/invoices/backfill-rent
 * Preview tenants that would be affected by backfill (without executing)
 * Admin-only endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { identifyTenantsNeedingBackfill } = await import('@/lib/services/rent-invoice-backfill');
    const tenants = await identifyTenantsNeedingBackfill();

    return NextResponse.json({
      success: true,
      message: `Found ${tenants.length} tenant(s) with active leases but no rent invoices`,
      data: {
        count: tenants.length,
        tenants: tenants.map(t => ({
          tenantId: t.tenantId,
          tenantName: t.tenantName,
          assignmentId: t.assignmentId,
          roomNumber: t.roomNumber,
          buildingName: t.buildingName,
          startDate: t.startDate,
          endDate: t.endDate,
          monthlyRate: t.monthlyRate
        }))
      }
    });

  } catch (error) {
    console.error('Error previewing rent invoice backfill:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to preview rent invoice backfill',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
