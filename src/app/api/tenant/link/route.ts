import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { linkUserToTenant } from '@/lib/api/tenant-user-link';
import pool from '@/lib/db';

/**
 * POST /api/tenant/link
 * Link an existing user account to an existing tenant profile
 * Admin only - for fixing tenant-user links
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, tenantId, email, tenantEmail } = body;

    // Option 1: Link by userId and tenantId
    if (userId && tenantId) {
      await linkUserToTenant(userId, tenantId);
      
      return NextResponse.json({
        success: true,
        message: 'User linked to tenant successfully',
        data: { userId, tenantId }
      });
    }

    // Option 2: Link by email addresses
    if (email && tenantEmail) {
      // Get user by email
      const userResult = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase().trim()]
      );
      
      if (userResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }
      
      const userId = userResult.rows[0].id;
      
      // Get tenant by email
      const tenantResult = await pool.query(
        'SELECT id FROM tenants WHERE email = $1',
        [tenantEmail.toLowerCase().trim()]
      );
      
      if (tenantResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Tenant not found' },
          { status: 404 }
        );
      }
      
      const tenantId = tenantResult.rows[0].id;
      
      await linkUserToTenant(userId, tenantId);
      
      return NextResponse.json({
        success: true,
        message: 'User linked to tenant successfully',
        data: { userId, tenantId, userEmail: email, tenantEmail }
      });
    }

    // Option 3: Link by matching email (user email = tenant email)
    if (email) {
      // Get user by email
      const userResult = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase().trim()]
      );
      
      if (userResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }
      
      const userId = userResult.rows[0].id;
      
      // Get tenant by matching email
      const tenantResult = await pool.query(
        'SELECT id FROM tenants WHERE email = $1',
        [email.toLowerCase().trim()]
      );
      
      if (tenantResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Tenant not found with matching email' },
          { status: 404 }
        );
      }
      
      const tenantId = tenantResult.rows[0].id;
      
      await linkUserToTenant(userId, tenantId);
      
      return NextResponse.json({
        success: true,
        message: 'User linked to tenant successfully',
        data: { userId, tenantId, email }
      });
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Missing required fields',
        details: 'Provide either (userId and tenantId) or (email) or (email and tenantEmail)'
      },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Error linking user to tenant:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to link user to tenant',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tenant/link
 * Check if a user is linked to a tenant profile
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const userId = searchParams.get('userId');

    if (!email && !userId) {
      return NextResponse.json(
        { success: false, error: 'Provide email or userId' },
        { status: 400 }
      );
    }

    let query: string;
    let values: string[];

    if (userId) {
      query = `
        SELECT 
          u.id as user_id,
          u.email as user_email,
          u.role,
          t.id as tenant_id,
          t.first_name || ' ' || t.last_name as tenant_name,
          t.email as tenant_email,
          t.user_id IS NOT NULL as is_linked
        FROM users u
        LEFT JOIN tenants t ON t.user_id = u.id
        WHERE u.id = $1
      `;
      values = [userId];
    } else {
      query = `
        SELECT 
          u.id as user_id,
          u.email as user_email,
          u.role,
          t.id as tenant_id,
          t.first_name || ' ' || t.last_name as tenant_name,
          t.email as tenant_email,
          t.user_id IS NOT NULL as is_linked
        FROM users u
        LEFT JOIN tenants t ON t.user_id = u.id
        WHERE u.email = $1
      `;
      values = [email!.toLowerCase().trim()];
    }

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error checking user-tenant link:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check link',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
