import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { getPropertyBuildingDetail } from '@/lib/api/properties';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const detail = await getPropertyBuildingDetail(id);

    if (!detail) {
      return NextResponse.json(
        { success: false, error: 'Building not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: detail,
    });
  } catch (err) {
    console.error('Error fetching property building detail:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch property details',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
