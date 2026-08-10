/**
 * GET /api/reports/unit-month-collections
 * Query: startMonth, endMonth (YYYY-MM), optional buildingId
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { generateUnitMonthCollections } from '@/lib/services/unit-month-collections';

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireRole(['admin']);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const startMonth = searchParams.get('startMonth') || '';
    const endMonth = searchParams.get('endMonth') || '';
    const buildingId = searchParams.get('buildingId');

    if (!startMonth || !endMonth) {
      return NextResponse.json(
        { success: false, error: 'startMonth and endMonth (YYYY-MM) are required' },
        { status: 400 }
      );
    }

    const data = await generateUnitMonthCollections({
      startMonth,
      endMonth,
      buildingId: buildingId || null,
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('GET /api/reports/unit-month-collections error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to generate matrix',
      },
      { status: 500 }
    );
  }
}
