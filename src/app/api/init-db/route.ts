import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db';

/**
 * POST /api/init-db
 * Applies bootstrap schema. Locked to development + SEED_SECRET.
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
        message: 'Init endpoint disabled',
        error:
          'Only available in development when SEED_SECRET is set and sent as x-seed-secret header',
      },
      { status: 403 }
    );
  }

  try {
    await initializeDatabase();
    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to initialize database',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
