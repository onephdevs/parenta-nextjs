import { NextRequest, NextResponse } from 'next/server';
import { seedDatabase } from '@/lib/seed-data';

/**
 * POST /api/seed-db
 * Seeds sample buildings/rooms/tenants. Locked to development + SEED_SECRET.
 */
function isSeedAllowed(request: NextRequest): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  const expected = process.env.SEED_SECRET;
  if (!expected) {
    return false;
  }
  return request.headers.get('x-seed-secret') === expected;
}

export async function POST(request: NextRequest) {
  if (!isSeedAllowed(request)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Seed endpoint disabled',
        details:
          'Only available in development when SEED_SECRET is set and sent as x-seed-secret header',
      },
      { status: 403 }
    );
  }

  try {
    await seedDatabase();

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully with sample data',
    });
  } catch (error) {
    console.error('Seed database error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to seed database',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
