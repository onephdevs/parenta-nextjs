import { NextRequest, NextResponse } from 'next/server';
import { calculateAssetDepreciation, getAssetRentalRevenue } from '@/lib/api/assets';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'depreciation';

    switch (type) {
      case 'depreciation':
        const depreciation = await calculateAssetDepreciation(id);
        return NextResponse.json({
          success: true,
          data: depreciation
        });

      case 'rental':
        const rental = await getAssetRentalRevenue(id);
        return NextResponse.json({
          success: true,
          data: rental
        });

      case 'all':
        const [depreciationData, rentalData] = await Promise.all([
          calculateAssetDepreciation(id),
          getAssetRentalRevenue(id)
        ]);
        
        return NextResponse.json({
          success: true,
          data: {
            depreciation: depreciationData,
            rental: rentalData
          }
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid financial type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error fetching asset financial data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch asset financial data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 