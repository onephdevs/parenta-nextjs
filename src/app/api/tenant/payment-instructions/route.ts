import { NextResponse } from 'next/server';
import { requireTenantAccess } from '@/lib/api/require-tenant-access';
import { getTenantPaymentInstructions } from '@/lib/tenant-payment-instructions';

/**
 * GET /api/tenant/payment-instructions
 * Tenant-facing transfer / GCash details configured by admin
 */
export async function GET() {
  try {
    const access = await requireTenantAccess();
    if (access.error) return access.error;

    const instructions = await getTenantPaymentInstructions();
    return NextResponse.json({
      success: true,
      data: {
        phone: instructions.phone,
        accountName: instructions.accountName,
        bankName: instructions.bankName,
        bankAccountNumber: instructions.bankAccountNumber,
        notes: instructions.notes,
        acceptedMethods: instructions.acceptedMethods,
        configured: Boolean(instructions.phone),
      },
    });
  } catch (error) {
    console.error('Error fetching tenant payment instructions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load payment instructions' },
      { status: 500 }
    );
  }
}
