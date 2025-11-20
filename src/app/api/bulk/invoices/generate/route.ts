import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateMonthlyInvoicesForAllTenants } from '@/lib/services/bulk-operations-service';

/**
 * POST /api/bulk/invoices/generate
 * Generate monthly invoices for all active tenants
 * Body:
 *  - month: string (optional) - Target month in 'YYYY-MM' format
 *  - building_id: string (optional) - Filter by building
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
    
    const body = await request.json();
    const { month, building_id } = body;
    
    const result = await generateMonthlyInvoicesForAllTenants(month, building_id);
    
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          partial_success: result.successful > 0,
          ...result,
          message: `Generated ${result.successful} invoice(s), ${result.failed} failed`,
        },
        { status: 207 } // Multi-status
      );
    }
    
    return NextResponse.json({
      success: true,
      ...result,
      message: `Successfully generated ${result.successful} invoice(s) for ${month || 'next month'}`,
    });
  } catch (error) {
    console.error('Error generating bulk invoices:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate bulk invoices',
      },
      { status: 500 }
    );
  }
}

