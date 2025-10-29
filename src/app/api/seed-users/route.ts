import { NextResponse } from 'next/server';
import { createUser } from '@/lib/db';

/**
 * POST /api/seed-users
 * Creates demo users for testing
 */
export async function POST() {
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
      credentials: {
        admin: { email: 'admin@parenta.com', password: 'admin123' },
        tenant: { email: 'tenant@parenta.com', password: 'tenant123' },
      }
    });
    
  } catch (error) {
    console.error('Error creating demo users:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create demo users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

