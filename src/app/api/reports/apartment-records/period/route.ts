import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { logActivitySafe } from '@/lib/services/activity-logger';
import { invalidateDashboardCache } from '@/lib/cache/memory-cache';
import { openApartmentBillingPeriod } from '@/lib/services/apartment-records-service';

export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MONTH_RE = /^\d{4}-\d{2}$/;

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const monthKey = typeof body.monthKey === 'string' ? body.monthKey : '';
    const buildingRaw = typeof body.buildingId === 'string' ? body.buildingId : '';
    const buildingId = UUID_RE.test(buildingRaw) ? buildingRaw : null;

    if (!MONTH_RE.test(monthKey)) {
      return NextResponse.json(
        { success: false, error: 'A valid billing period is required' },
        { status: 400 }
      );
    }

    const result = await openApartmentBillingPeriod({ monthKey, buildingId });
    invalidateDashboardCache();

    if (result.invoicesCreated > 0) {
      logActivitySafe({
        actorUserId: session?.user?.id || null,
        actorRole: 'admin',
        actionType: 'bulk.invoices_generated',
        category: 'system',
        entityType: 'bulk_operation',
        entityLabel: `${result.invoicesCreated} rent invoice(s) for ${result.periodLabel}`,
        afterData: {
          monthKey: result.monthKey,
          invoicesCreated: result.invoicesCreated,
          invoicesSkipped: result.invoicesSkipped,
          occupiedUnits: result.occupiedUnits,
          buildingId,
        },
        link: `/admin/reports/apartment-records?month=${result.monthKey}`,
      });
    }

    const invoicePart =
      result.invoicesCreated > 0
        ? `Created ${result.invoicesCreated} rent invoice${result.invoicesCreated === 1 ? '' : 's'}`
        : result.occupiedUnits > 0
          ? 'Rent invoices for occupied units are already in place'
          : 'No occupied units to invoice';

    return NextResponse.json({
      success: true,
      data: result,
      message: `Opened ${result.periodShortLabel}. ${invoicePart}.`,
    });
  } catch (err) {
    console.error('POST /api/reports/apartment-records/period error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to open billing period',
      },
      { status: 400 }
    );
  }
}
