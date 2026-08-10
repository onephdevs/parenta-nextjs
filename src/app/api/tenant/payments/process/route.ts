/**
 * POST /api/tenant/payments/process
 * Deprecated for JSON-only claims — receipt image is required for all tenant payments.
 * Clients must use POST /api/tenant/payments/upload-receipt (multipart).
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/api/require-tenant-access';

export async function POST(request: NextRequest) {
  try {
    const access = await requireTenantAccess({ allowMutation: true });
    if (access.error) return access.error;

    // Consume body so clients don't hang; validation is intentional rejection
    await request.json().catch(() => ({}));

    return NextResponse.json(
      {
        success: false,
        error: 'Receipt image required',
        details:
          'All tenant payments require a receipt screenshot and reference number. Use Pay online or Upload receipt.',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit payment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
