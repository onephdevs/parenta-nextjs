import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantByUserId, getTenantCompleteData } from '@/lib/api/tenant-user-link';
import pool from '@/lib/db';

/**
 * GET /api/tenant/profile
 * Get tenant profile with occupant and emergency contact info
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
    
    // Get complete tenant data including room assignment
    const tenantData = await getTenantCompleteData(userId);
    
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
      WHERE o.room_id = (
        SELECT room_id 
        FROM tenant_room_assignments 
        WHERE tenant_id = $1 AND assignment_status = 'active'
        LIMIT 1
      )
      AND o.is_active = true
      ORDER BY o.move_in_date DESC
    `;
    
    const occupantsResult = await pool.query(occupantsQuery, [tenant.id]);
    
    return NextResponse.json({
      success: true,
      data: {
        profile: {
          id: tenant.id,
          firstName: tenant.first_name,
          lastName: tenant.last_name,
          email: tenant.email || tenant.user_email,
          phone: tenant.phone,
          dateOfBirth: tenant.date_of_birth,
          emergencyContactName: tenant.emergency_contact_name,
          emergencyContactPhone: tenant.emergency_contact_phone,
          emergencyContactRelationship: tenant.emergency_contact_relationship,
          employmentStatus: tenant.employment_status,
          employerName: tenant.employer_name,
          monthlyIncome: tenant.monthly_income,
          previousAddress: tenant.previous_address,
          securityDeposit: tenant.security_deposit,
          leaseStartDate: tenant.lease_start_date,
          leaseEndDate: tenant.lease_end_date,
          tenantStatus: tenant.tenant_status,
          notes: tenant.notes,
        },
        roomAssignment: tenantData ? {
          roomId: tenantData.room_id,
          roomNumber: tenantData.room_number,
          floorNumber: tenantData.floor_number,
          roomType: tenantData.room_type,
          buildingId: tenantData.building_id,
          buildingName: tenantData.building_name,
          address: [
            tenantData.address_line1,
            tenantData.address_line2,
            tenantData.city,
            tenantData.state,
            tenantData.postal_code,
          ].filter(Boolean).join(', '),
          assignmentStart: tenantData.assignment_start,
          assignmentEnd: tenantData.assignment_end,
          monthlyRate: tenantData.monthly_rate,
        } : null,
        occupants: occupantsResult.rows.map(row => ({
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
      },
    });
    
  } catch (error) {
    console.error('Error fetching tenant profile:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch profile',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tenant/profile
 * Update tenant profile
 */
export async function PUT(request: NextRequest) {
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
    
    const body = await request.json();
    const {
      firstName,
      lastName,
      phone,
      dateOfBirth,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
      employmentStatus,
      employerName,
      monthlyIncome,
      previousAddress,
    } = body;
    
    // Update tenant profile
    const updateQuery = `
      UPDATE tenants
      SET 
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        phone = COALESCE($3, phone),
        date_of_birth = COALESCE($4, date_of_birth),
        emergency_contact_name = COALESCE($5, emergency_contact_name),
        emergency_contact_phone = COALESCE($6, emergency_contact_phone),
        emergency_contact_relationship = COALESCE($7, emergency_contact_relationship),
        employment_status = COALESCE($8, employment_status),
        employer_name = COALESCE($9, employer_name),
        monthly_income = COALESCE($10, monthly_income),
        previous_address = COALESCE($11, previous_address),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `;
    
    const updateResult = await pool.query(updateQuery, [
      firstName,
      lastName,
      phone,
      dateOfBirth,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
      employmentStatus,
      employerName,
      monthlyIncome,
      previousAddress,
      tenant.id,
    ]);
    
    const updatedTenant = updateResult.rows[0];
    
    return NextResponse.json({
      success: true,
      data: {
        id: updatedTenant.id,
        firstName: updatedTenant.first_name,
        lastName: updatedTenant.last_name,
        email: updatedTenant.email,
        phone: updatedTenant.phone,
        dateOfBirth: updatedTenant.date_of_birth,
        emergencyContactName: updatedTenant.emergency_contact_name,
        emergencyContactPhone: updatedTenant.emergency_contact_phone,
        emergencyContactRelationship: updatedTenant.emergency_contact_relationship,
        employmentStatus: updatedTenant.employment_status,
        employerName: updatedTenant.employer_name,
        monthlyIncome: updatedTenant.monthly_income,
        previousAddress: updatedTenant.previous_address,
      },
      message: 'Profile updated successfully',
    });
    
  } catch (error) {
    console.error('Error updating tenant profile:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update profile',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
