import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import {
  syncActiveLeasesToPipelineCards,
  syncOpenMaintenanceToPipelineCards,
  syncPendingUtilityBillsToPipelineCards,
  syncPendingExpensesToPipelineCards,
} from '@/lib/api/pipeline';

/**
 * POST /api/pipeline/sync
 * Pull active leases + invoices into Payments stages,
 * open maintenance requests into the Maintenance board,
 * and utility bills + vendor expenses into the Expenses board.
 */
export async function POST() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const [payments, maintenance, utilityBills, vendorExpenses] = await Promise.all([
      syncActiveLeasesToPipelineCards(),
      syncOpenMaintenanceToPipelineCards(),
      syncPendingUtilityBillsToPipelineCards(),
      syncPendingExpensesToPipelineCards(),
    ]);

    const expensesCreated = utilityBills.created + vendorExpenses.created;
    const expensesUpdated = utilityBills.updated + vendorExpenses.updated;

    return NextResponse.json({
      success: true,
      message: `Payments: ${payments.created} created, ${payments.updated} updated, ${payments.stagesMoved} stage moves${
        payments.skipped ? `, ${payments.skipped} skipped` : ''
      }. Maintenance: ${maintenance.created} created, ${maintenance.updated} updated. Expenses: ${expensesCreated} created, ${expensesUpdated} updated (utilities ${utilityBills.created}/${utilityBills.updated}, vendor ${vendorExpenses.created}/${vendorExpenses.updated}).`,
      data: {
        payments,
        maintenance,
        expenses: {
          utilityBills,
          vendorExpenses,
          created: expensesCreated,
          updated: expensesUpdated,
        },
      },
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
