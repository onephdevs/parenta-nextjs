/**
 * API Endpoint: Invoice Backfill (One-Time Demo)
 * Generates rent invoices for tenants with active leases but no existing invoices
 * Applies existing payments and advance balances to newly created invoices
 * 
 * WARNING: This is a one-time operation for demo purposes only.
 * Moving forward, invoices are only generated when tenants are assigned.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  backfillInvoicesForAllTenants, 
  backfillInvoicesForTenant,
  findTenantsNeedingBackfill 
} from '@/lib/services/invoice-backfill';

/**
 * GET /api/invoices/backfill
 * Preview tenants that would be backfilled (dry run)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tenants = await findTenantsNeedingBackfill();

    return NextResponse.json({
      success: true,
      data: {
        tenantsFound: tenants.length,
        tenants: tenants.map(t => ({
          tenantId: t.tenantId,
          tenantName: t.tenantName,
          room: `${t.buildingName} - ${t.roomNumber}`,
          leaseStart: t.leaseStartDate,
          leaseEnd: t.leaseEndDate,
          monthlyRent: t.monthlyRent
        }))
      }
    });

  } catch (error) {
    console.error('Error previewing backfill:', error);
    return NextResponse.json(
      {
        error: 'Failed to preview backfill',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invoices/backfill
 * Execute the one-time backfill operation
 * 
 * Body (optional):
 * - tenantId: string - Backfill for specific tenant only
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const tenantId = body.tenantId; // Optional: backfill for specific tenant

    if (tenantId) {
      // Backfill for specific tenant
      const tenants = await findTenantsNeedingBackfill();
      const tenant = tenants.find(t => t.tenantId === tenantId);

      if (!tenant) {
        return NextResponse.json(
          { 
            error: 'Tenant not found or already has invoices',
            details: 'This tenant either does not exist, has no active lease, or already has rent invoices'
          },
          { status: 404 }
        );
      }

      const result = await backfillInvoicesForTenant(
        tenant.tenantId,
        tenant.tenantName,
        tenant.roomId,
        tenant.roomNumber,
        tenant.buildingName,
        tenant.leaseStartDate,
        tenant.leaseEndDate,
        tenant.monthlyRent
      );

      return NextResponse.json({
        success: result.success,
        data: result
      });

    } else {
      // Backfill for all tenants
      const result = await backfillInvoicesForAllTenants();

      return NextResponse.json({
        success: result.success,
        data: {
          totalTenants: result.totalTenants,
          successful: result.successful,
          failed: result.failed,
          results: result.results
        }
      });
    }

  } catch (error) {
    console.error('Error executing backfill:', error);
    return NextResponse.json(
      {
        error: 'Failed to execute backfill',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
