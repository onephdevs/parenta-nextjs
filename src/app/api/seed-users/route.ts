import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/db';

/**
 * POST /api/seed-users
 * Creates demo users for local testing.
 *
 * Locked: development only, and requires header
 *   x-seed-secret: <SEED_SECRET from env>
 * Never enable in production.
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
    const users = [];

    // Create admin user
    try {
      const admin = await createUser({
        email: 'admin@parenta.com',
        password: 'admin123',
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
      });
      users.push({ role: 'admin', email: admin.email });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        users.push({ role: 'admin', email: 'admin@parenta.com', note: 'already exists' });
      } else {
        throw error;
      }
    }

    // Create tenant user
    try {
      const tenant = await createUser({
        email: 'tenant@parenta.com',
        password: 'tenant123',
        role: 'tenant',
        firstName: 'John',
        lastName: 'Doe',
      });
      users.push({ role: 'tenant', email: tenant.email });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        users.push({ role: 'tenant', email: 'tenant@parenta.com', note: 'already exists' });
      } else {
        throw error;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Demo users created successfully',
      users,
      // Credentials only returned in locked local seed — do not expose in production
      credentials: {
        admin: { email: 'admin@parenta.com', password: 'admin123' },
        tenant: { email: 'tenant@parenta.com', password: 'tenant123' },
      },
    });
  } catch (error) {
    console.error('Error creating demo users:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create demo users',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
