import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import {
  syncActiveLeasesToPipelineCards,
  syncOpenMaintenanceToPipelineCards,
} from '@/lib/api/pipeline';

/**
 * POST /api/pipeline/sync
 * Pull active leases + invoices into Payments stages,
 * and open maintenance requests into the Maintenance board.
 */
export async function POST() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const [payments, maintenance] = await Promise.all([
      syncActiveLeasesToPipelineCards(),
      syncOpenMaintenanceToPipelineCards(),
    ]);

    return NextResponse.json({
      success: true,
      message: `Payments: ${payments.created} created, ${payments.updated} updated, ${payments.stagesMoved} stage moves${
        payments.skipped ? `, ${payments.skipped} skipped` : ''
      }. Maintenance: ${maintenance.created} created, ${maintenance.updated} updated.`,
      data: { payments, maintenance },
    });
  } catch (err) {
    console.error('Pipeline sync API error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to sync pipeline cards',
      },
      { status: 500 }
    );
  }
}
