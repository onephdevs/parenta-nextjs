import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { getPropertyBuildingReport } from '@/lib/api/properties';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const month = request.nextUrl.searchParams.get('month');
    const report = await getPropertyBuildingReport(id, month);

    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Building not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: report });
  } catch (err) {
    console.error('Error fetching property building report:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch property report',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
