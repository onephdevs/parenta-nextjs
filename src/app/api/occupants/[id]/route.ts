import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/occupants/[id] - Get a specific occupant
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const query = `
      SELECT 
        o.*,
        r.room_number,
        b.name as building_name,
        t.first_name as tenant_first_name,
        t.last_name as tenant_last_name
      FROM occupants o
      LEFT JOIN rooms r ON o.room_id = r.id
      LEFT JOIN buildings b ON r.building_id = b.id
      LEFT JOIN tenants t ON o.tenant_id = t.id
      WHERE o.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Occupant not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching occupant:', error);
    return NextResponse.json(
      { error: 'Failed to fetch occupant', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT /api/occupants/[id] - Update an occupant
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const updateFields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    // Build dynamic update query
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
      // If move_out_date is set, also set is_active to false
      updateFields.push(`is_active = false`);
    }
    if (body.notes !== undefined) {
      updateFields.push(`notes = $${paramCount++}`);
      values.push(body.notes);
    }
    if (body.isActive !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      values.push(body.isActive);
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE occupants
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Occupant not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating occupant:', error);
    return NextResponse.json(
      { error: 'Failed to update occupant', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/occupants/[id] - Delete (soft delete) an occupant
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const query = `
      UPDATE occupants
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Occupant not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Occupant deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting occupant:', error);
    return NextResponse.json(
      { error: 'Failed to delete occupant', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

