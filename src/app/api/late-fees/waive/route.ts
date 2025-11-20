import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { waiveLateFee } from '@/lib/services/late-fee-service';

/**
 * PATCH /api/late-fees/waive
 * Waive a late fee application
 * Body:
 *  - application_id: string - ID of the late fee application to waive
 *  - reason: string - Reason for waiving the fee
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { application_id, reason } = body;
    
    if (!application_id || !reason) {
      return NextResponse.json(
        { success: false, error: 'application_id and reason are required' },
        { status: 400 }
      );
    }
    
    const userId = (session.user as any)?.id;
    const waivedApplication = await waiveLateFee(application_id, reason, userId);
    
    return NextResponse.json({
      success: true,
      application: waivedApplication,
      message: `Late fee of ₱${waivedApplication.fee_amount.toFixed(2)} waived successfully`,
    });
  } catch (error) {
    console.error('Error waiving late fee:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to waive late fee',
      },
      { status: 500 }
    );
  }
}

