import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { syncActiveLeasesToPipelineCards } from '@/lib/api/pipeline';

/**
 * POST /api/pipeline/sync
 * Pull active leases into Payments board cards (and enrich linked onboarding cards).
 */
export async function POST() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const result = await syncActiveLeasesToPipelineCards();

    return NextResponse.json({
      success: true,
      message: `Synced leases → cards: ${result.created} created, ${result.updated} updated${
        result.skipped ? `, ${result.skipped} skipped` : ''
      }.`,
      data: result,
    });
  } catch (err) {
    console.error('Pipeline sync API error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to sync leases to cards',
      },
      { status: 500 }
    );
  }
}
