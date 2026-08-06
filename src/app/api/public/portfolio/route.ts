import { NextResponse } from 'next/server';
import { getPublicPortfolio } from '@/lib/api/public-portfolio';

/**
 * Public portfolio snapshot for the marketing homepage.
 * Safe aggregates only — no revenue, tenant PII, or admin internals.
 */
export async function GET() {
  try {
    const data = await getPublicPortfolio();
    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          // Short cache so the "live data" badge stays honest without hammering the DB
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('Public portfolio API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Unable to load portfolio data',
      },
      { status: 500 }
    );
  }
}
