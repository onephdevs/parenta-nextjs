import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { getAddressCitiesByRegion } from '@/lib/api/addresses';

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const regionId = request.nextUrl.searchParams.get('regionId');
    if (!regionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing regionId',
          details: 'Query param regionId is required',
        },
        { status: 400 }
      );
    }

    const cities = await getAddressCitiesByRegion(regionId);

    return NextResponse.json({
      success: true,
      data: cities,
    });
  } catch (err) {
    console.error('Address cities API error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch cities',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
