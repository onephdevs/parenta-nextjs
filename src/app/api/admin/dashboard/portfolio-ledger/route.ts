import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { getPortfolioLedger } from '@/lib/services/portfolio-ledger-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const buildingIdRaw = searchParams.get('buildingId') || '';
    const buildingId = UUID_RE.test(buildingIdRaw) ? buildingIdRaw : null;
    const month = searchParams.get('month') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const data = await getPortfolioLedger({ month, startDate, endDate, buildingId });
    return NextResponse.json(
      { success: true, data },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('GET /api/admin/dashboard/portfolio-ledger error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to load portfolio ledger' },
      { status: 500 }
    );
  }
}
