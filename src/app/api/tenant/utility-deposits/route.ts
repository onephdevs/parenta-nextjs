import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTenantByUserId } from '@/lib/api/tenant-user-link';
import pool from '@/lib/db';

/**
 * GET /api/tenant/utility-deposits
 * Get utility deposit information for logged-in tenant
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
    
    // Get current room assignment with utility deposit info
    const query = `
      SELECT 
        tra.id as assignment_id,
        tra.utility_deposit_paid,
        r.id as room_id,
        r.room_number,
        b.id as building_id,
        b.name as building_name
      FROM tenant_room_assignments tra
      INNER JOIN rooms r ON tra.room_id = r.id
      INNER JOIN buildings b ON r.building_id = b.id
      WHERE tra.tenant_id = $1
        AND tra.assignment_status = 'active'
      ORDER BY tra.start_date DESC
      LIMIT 1
    `;
    
    const result = await pool.query(query, [tenant.id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          hasAssignment: false,
          utilityDepositPaid: 0,
          roomNumber: null,
          buildingName: null,
        },
      });
    }
    
    const assignment = result.rows[0];
    
    // Get utility deposit payment history
    const historyQuery = `
      SELECT 
        p.id,
        p.amount,
        p.payment_type,
        p.payment_method,
        p.payment_date,
        p.payment_status,
        p.reference_number,
        p.notes
      FROM payments p
      WHERE p.tenant_id = $1
        AND p.payment_type = 'utility'
        AND p.notes ILIKE '%utility deposit%'
      ORDER BY p.payment_date DESC
      LIMIT 20
    `;
    
    const historyResult = await pool.query(historyQuery, [tenant.id]);
    
    const history = historyResult.rows.map(row => ({
      id: row.id,
      amount: parseFloat(row.amount || 0),
      paymentMethod: row.payment_method,
      paymentDate: row.payment_date,
      paymentStatus: row.payment_status,
      referenceNumber: row.reference_number,
      notes: row.notes,
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        hasAssignment: true,
        utilityDepositPaid: parseFloat(assignment.utility_deposit_paid || 0),
        roomNumber: assignment.room_number,
        buildingName: assignment.building_name,
        roomId: assignment.room_id,
        buildingId: assignment.building_id,
        assignmentId: assignment.assignment_id,
        history,
      },
    });
    
  } catch (error) {
    console.error('Error fetching utility deposit data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch utility deposit data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tenant/utility-deposits
 * Add utility deposit payment (electric/water) for logged-in tenant
 */
export async function POST(request: Request) {
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
    const { amount, utilityType, paymentMethod, referenceNumber, description } = body;
    
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid amount is required' },
        { status: 400 }
      );
    }
    
    if (!utilityType || !['electricity', 'water'].includes(utilityType)) {
      return NextResponse.json(
        { success: false, error: 'Utility type must be electricity or water' },
        { status: 400 }
      );
    }
    
    // Get current room assignment
    const assignmentQuery = `
      SELECT 
        tra.id as assignment_id,
        tra.room_id,
        tra.utility_deposit_paid,
        r.building_id
      FROM tenant_room_assignments tra
      INNER JOIN rooms r ON tra.room_id = r.id
      WHERE tra.tenant_id = $1
        AND tra.assignment_status = 'active'
      ORDER BY tra.start_date DESC
      LIMIT 1
    `;
    
    const assignmentResult = await pool.query(assignmentQuery, [tenant.id]);
    
    if (assignmentResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No active room assignment found' },
        { status: 404 }
      );
    }
    
    const assignment = assignmentResult.rows[0];
    const currentUtilityDeposit = parseFloat(assignment.utility_deposit_paid || 0);
    const newUtilityDeposit = currentUtilityDeposit + parseFloat(amount);
    
    // Update assignment with new utility deposit
    await pool.query(
      `UPDATE tenant_room_assignments 
       SET utility_deposit_paid = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [newUtilityDeposit, assignment.assignment_id]
    );
    
    // Create payment record
    const paymentQuery = `
      INSERT INTO payments (
        tenant_id,
        room_id,
        assignment_id,
        amount,
        payment_type,
        payment_method,
        payment_date,
        due_date,
        payment_status,
        reference_number,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, CURRENT_DATE, $7, $8, $9)
      RETURNING id, amount, payment_date
    `;
    
    const paymentResult = await pool.query(paymentQuery, [
      tenant.id,
      assignment.room_id,
      assignment.assignment_id,
      amount,
      'utility',
      paymentMethod || 'online',
      'paid',
      referenceNumber || null,
      description || `${utilityType} utility deposit payment`,
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        paymentId: paymentResult.rows[0].id,
        amount: parseFloat(paymentResult.rows[0].amount),
        paymentDate: paymentResult.rows[0].payment_date,
        utilityType,
        totalUtilityDeposit: newUtilityDeposit,
      },
      message: `${utilityType.charAt(0).toUpperCase() + utilityType.slice(1)} utility deposit recorded successfully`,
    });
    
  } catch (error) {
    console.error('Error recording utility deposit:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to record utility deposit',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
