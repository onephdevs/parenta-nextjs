/**
 * API Endpoint: Generate Monthly Rent Invoices
 * Generates next month's rent invoices for all tenants with active leases
 * Automatically applies available advance to newly created invoices
 * 
 * This endpoint can be called:
 * - Manually by admin
 * - Via cron job/scheduled task (monthly)
 * - Via webhook/automation service
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateMonthlyRentInvoicesForAllTenants, generateNextMonthRentInvoice } from '@/lib/services/monthly-invoice-generator';

/**
 * POST /api/invoices/generate-monthly
 * Generate next month's rent invoices for all tenants with active leases
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
    const tenantId = body.tenantId; // Optional: generate for specific tenant

    if (tenantId) {
      // Generate for specific tenant
      const result = await generateNextMonthRentInvoice(tenantId);
      
      return NextResponse.json({
        success: result.success,
        data: result
      });
    } else {
      // Generate for all tenants with active leases
      const result = await generateMonthlyRentInvoicesForAllTenants();
      
      return NextResponse.json({
        success: result.success,
        data: result
      });
    }

  } catch (error) {
    console.error('Error generating monthly invoices:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate monthly invoices',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
