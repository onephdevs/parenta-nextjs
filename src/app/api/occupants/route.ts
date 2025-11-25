import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/occupants - Get all occupants (optionally filtered by room_id or tenant_id)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const tenantId = searchParams.get('tenantId');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let query = `
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
      WHERE 1=1
    `;
    const params: string[] = [];
    let paramCount = 1;

    if (roomId) {
      query += ` AND o.room_id = $${paramCount}`;
      params.push(roomId);
      paramCount++;
    }

    if (tenantId) {
      query += ` AND o.tenant_id = $${paramCount}`;
      params.push(tenantId);
      paramCount++;
    }

    if (activeOnly) {
      query += ` AND o.is_active = true AND (o.move_out_date IS NULL OR o.move_out_date > CURRENT_DATE)`;
    }

    query += ` ORDER BY o.move_in_date DESC`;

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching occupants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch occupants', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/occupants - Create a new occupant
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      roomId,
      tenantId,
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
      notes
    } = body;

    // Validation
    if (!roomId || !firstName || !lastName || !moveInDate) {
      return NextResponse.json(
        { error: 'Missing required fields', details: 'Room ID, first name, last name, and move-in date are required' },
        { status: 400 }
      );
    }

    const query = `
      INSERT INTO occupants (
        room_id, tenant_id, first_name, last_name, relationship_to_tenant,
        date_of_birth, phone, email, emergency_contact_name,
        emergency_contact_phone, emergency_contact_relationship,
        move_in_date, notes, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
      RETURNING *
    `;

    const result = await pool.query(query, [
      roomId,
      tenantId || null,
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
      notes || null
    ]);

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating occupant:', error);
    return NextResponse.json(
      { error: 'Failed to create occupant', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

