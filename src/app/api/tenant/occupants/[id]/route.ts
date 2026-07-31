import { NextRequest, NextResponse } from 'next/server';
import { getTenantCompleteDataByTenantId } from '@/lib/api/tenant-user-link';
import { requireTenantAccess } from '@/lib/api/require-tenant-access';
import pool from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/tenant/occupants/[id]
 * Update occupant (only for tenant's room)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const access = await requireTenantAccess({ allowMutation: true });
    if (access.error) return access.error;

    const { tenant } = access;
    
    // Get tenant's room assignment
    const tenantData = await getTenantCompleteDataByTenantId(String(tenant.id));
    
    if (!tenantData || !tenantData.room_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active room assignment found',
        },
        { status: 404 }
      );
    }
    
    const { id } = await params;
    const body = await request.json();
    
    // Verify occupant belongs to tenant's room
    const verifyQuery = `
      SELECT id, room_id
      FROM occupants
      WHERE id = $1
    `;
    
    const verifyResult = await pool.query(verifyQuery, [id]);
    
    if (verifyResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Occupant not found',
        },
        { status: 404 }
      );
    }
    
    if (verifyResult.rows[0].room_id !== tenantData.room_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized - You can only update occupants in your own room',
        },
        { status: 403 }
      );
    }
    
    // Build update query
    const updateFields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;
    
    if (body.firstName !== undefined) {
      updateFields.push(`first_name = $${paramCount++}`);
      values.push(body.firstName);
    }
    if (body.lastName !== undefined) {
      updateFields.push(`last_name = $${paramCount++}`);
      values.push(body.lastName);
    }
    if (body.relationshipToTenant !== undefined) {
      updateFields.push(`relationship_to_tenant = $${paramCount++}`);
      values.push(body.relationshipToTenant);
    }
    if (body.dateOfBirth !== undefined) {
      updateFields.push(`date_of_birth = $${paramCount++}`);
      values.push(body.dateOfBirth);
    }
    if (body.phone !== undefined) {
      updateFields.push(`phone = $${paramCount++}`);
      values.push(body.phone);
    }
    if (body.email !== undefined) {
      updateFields.push(`email = $${paramCount++}`);
      values.push(body.email);
    }
    if (body.emergencyContactName !== undefined) {
      updateFields.push(`emergency_contact_name = $${paramCount++}`);
      values.push(body.emergencyContactName);
    }
    if (body.emergencyContactPhone !== undefined) {
      updateFields.push(`emergency_contact_phone = $${paramCount++}`);
      values.push(body.emergencyContactPhone);
    }
    if (body.emergencyContactRelationship !== undefined) {
      updateFields.push(`emergency_contact_relationship = $${paramCount++}`);
      values.push(body.emergencyContactRelationship);
    }
    if (body.moveInDate !== undefined) {
      updateFields.push(`move_in_date = $${paramCount++}`);
      values.push(body.moveInDate);
    }
    if (body.moveOutDate !== undefined) {
      updateFields.push(`move_out_date = $${paramCount++}`);
      values.push(body.moveOutDate);
      updateFields.push(`is_active = false`);
    }
    if (body.notes !== undefined) {
      updateFields.push(`notes = $${paramCount++}`);
      values.push(body.notes);
    }
    
    if (updateFields.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No fields to update',
        },
        { status: 400 }
      );
    }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    const updateQuery = `
      UPDATE occupants
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, values);
    
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
      message: 'Occupant updated successfully',
    });
    
  } catch (error) {
    console.error('Error updating occupant:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update occupant',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tenant/occupants/[id]
 * Remove occupant (soft delete - set is_active to false)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const access = await requireTenantAccess({ allowMutation: true });
    if (access.error) return access.error;

    const { tenant } = access;
    
    // Get tenant's room assignment
    const tenantData = await getTenantCompleteDataByTenantId(String(tenant.id));
    
    if (!tenantData || !tenantData.room_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active room assignment found',
        },
        { status: 404 }
      );
    }
    
    const { id } = await params;
    
    // Verify occupant belongs to tenant's room
    const verifyQuery = `
      SELECT id, room_id
      FROM occupants
      WHERE id = $1
    `;
    
    const verifyResult = await pool.query(verifyQuery, [id]);
    
    if (verifyResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Occupant not found',
        },
        { status: 404 }
      );
    }
    
    if (verifyResult.rows[0].room_id !== tenantData.room_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized - You can only remove occupants from your own room',
        },
        { status: 403 }
      );
    }
    
    // Soft delete (set is_active to false and move_out_date to today)
    const deleteQuery = `
      UPDATE occupants
      SET 
        is_active = false,
        move_out_date = CURRENT_DATE,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(deleteQuery, [id]);
    
    return NextResponse.json({
      success: true,
      message: 'Occupant removed successfully',
    });
    
  } catch (error) {
    console.error('Error deleting occupant:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete occupant',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
