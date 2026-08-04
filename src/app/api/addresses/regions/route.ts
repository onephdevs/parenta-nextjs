import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { getAddressRegions } from '@/lib/api/addresses';

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const countryCode = request.nextUrl.searchParams.get('country') || 'PH';
    const regions = await getAddressRegions(countryCode);

    return NextResponse.json({
      success: true,
      data: regions,
    });
  } catch (err) {
    console.error('Address regions API error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch regions',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
