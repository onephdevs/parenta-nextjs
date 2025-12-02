import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantByUserId, getTenantCompleteData } from '@/lib/api/tenant-user-link';
import pool from '@/lib/db';

/**
 * GET /api/tenant/occupants
 * List occupants for tenant's room
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || session.user.role !== 'tenant') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const tenant = await getTenantByUserId(userId);
    
    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tenant profile found',
        },
        { status: 404 }
      );
    }
    
    // Get tenant's room assignment
    const tenantData = await getTenantCompleteData(userId);
    
    if (!tenantData || !tenantData.room_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active room assignment found',
        },
        { status: 404 }
      );
    }
    
    // Get occupants for tenant's room
    const occupantsQuery = `
      SELECT 
        o.id,
        o.first_name,
        o.last_name,
        o.relationship_to_tenant,
        o.date_of_birth,
        o.phone,
        o.email,
        o.emergency_contact_name,
        o.emergency_contact_phone,
        o.emergency_contact_relationship,
        o.move_in_date,
        o.move_out_date,
        o.notes,
        o.is_active
      FROM occupants o
      WHERE o.room_id = $1
        AND o.is_active = true
      ORDER BY o.move_in_date DESC
    `;
    
    const occupantsResult = await pool.query(occupantsQuery, [tenantData.room_id]);
    
    return NextResponse.json({
      success: true,
      data: occupantsResult.rows.map(row => ({
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        relationshipToTenant: row.relationship_to_tenant,
        dateOfBirth: row.date_of_birth,
        phone: row.phone,
        email: row.email,
        emergencyContactName: row.emergency_contact_name,
        emergencyContactPhone: row.emergency_contact_phone,
        emergencyContactRelationship: row.emergency_contact_relationship,
        moveInDate: row.move_in_date,
        moveOutDate: row.move_out_date,
        notes: row.notes,
        isActive: row.is_active,
      })),
    });
    
  } catch (error) {
    console.error('Error fetching occupants:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch occupants',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenant/occupants
 * Add occupant to tenant's room
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || session.user.role !== 'tenant') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const tenant = await getTenantByUserId(userId);
    
    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tenant profile found',
        },
        { status: 404 }
      );
    }
    
    // Get tenant's room assignment
    const tenantData = await getTenantCompleteData(userId);
    
    if (!tenantData || !tenantData.room_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active room assignment found',
        },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    const {
      firstName,
      lastName,
      relationshipToTenant,
      dateOfBirth,
      phone,
      email,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
      moveInDate,
      notes,
    } = body;
    
    // Validation
    if (!firstName || !lastName || !moveInDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          details: 'First name, last name, and move-in date are required',
        },
        { status: 400 }
      );
    }
    
    // Insert occupant
    const insertQuery = `
      INSERT INTO occupants (
        room_id,
        tenant_id,
        first_name,
        last_name,
        relationship_to_tenant,
        date_of_birth,
        phone,
        email,
        emergency_contact_name,
        emergency_contact_phone,
        emergency_contact_relationship,
        move_in_date,
        notes,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [
      tenantData.room_id,
      tenant.id,
      firstName,
      lastName,
      relationshipToTenant || null,
      dateOfBirth || null,
      phone || null,
      email || null,
      emergencyContactName || null,
      emergencyContactPhone || null,
      emergencyContactRelationship || null,
      moveInDate,
      notes || null,
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        id: result.rows[0].id,
        firstName: result.rows[0].first_name,
        lastName: result.rows[0].last_name,
        relationshipToTenant: result.rows[0].relationship_to_tenant,
        dateOfBirth: result.rows[0].date_of_birth,
        phone: result.rows[0].phone,
        email: result.rows[0].email,
        emergencyContactName: result.rows[0].emergency_contact_name,
        emergencyContactPhone: result.rows[0].emergency_contact_phone,
        emergencyContactRelationship: result.rows[0].emergency_contact_relationship,
        moveInDate: result.rows[0].move_in_date,
        moveOutDate: result.rows[0].move_out_date,
        notes: result.rows[0].notes,
        isActive: result.rows[0].is_active,
      },
      message: 'Occupant added successfully',
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating occupant:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create occupant',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
