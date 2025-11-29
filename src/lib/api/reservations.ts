import pool from '@/lib/db';
import { Reservation, ReservationWithDetails, CreateReservationData } from '@/types/database';

// Helper function to map database row to Reservation
function mapDatabaseReservationToReservation(row: any): Reservation {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    roomId: row.room_id,
    reservationDate: new Date(row.reservation_date),
    expiryDate: new Date(row.expiry_date),
    monthlyRate: parseFloat(row.monthly_rate),
    reservationDeposit: parseFloat(row.reservation_deposit || 0),
    depositPaymentId: row.deposit_payment_id || undefined,
    reservationStatus: row.reservation_status,
    convertedToAssignmentId: row.converted_to_assignment_id || undefined,
    notes: row.notes || undefined,
    createdBy: row.created_by || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// Create a new reservation
export async function createReservation(
  reservationData: CreateReservationData,
  createdBy?: string
): Promise<Reservation> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Validate deposit is required (must be > 0)
    if (!reservationData.reservationDeposit || reservationData.reservationDeposit <= 0) {
      throw new Error('Reservation deposit is required. No reservation can be created without a deposit payment.');
    }

    // Validate room is available (vacant or reserved)
    const roomCheck = await client.query(
      'SELECT room_status, deposit_required, deposit_type, deposit_amount, deposit_percentage, monthly_rate FROM rooms WHERE id = $1 AND is_active = true',
      [reservationData.roomId]
    );

    if (roomCheck.rows.length === 0) {
      throw new Error('Room not found');
    }

    const room = roomCheck.rows[0];
    
    if (room.room_status === 'occupied') {
      throw new Error('Room is already occupied');
    }

    // Check for existing active reservations on this room
    const existingReservation = await client.query(
      `SELECT id FROM reservations 
       WHERE room_id = $1 
       AND reservation_status = 'active' 
       AND expiry_date >= CURRENT_DATE`,
      [reservationData.roomId]
    );

    if (existingReservation.rows.length > 0) {
      throw new Error('Room already has an active reservation');
    }

    // Validate expiry date is after reservation date
    const reservationDate = reservationData.reservationDate 
      ? (reservationData.reservationDate instanceof Date 
          ? reservationData.reservationDate 
          : new Date(reservationData.reservationDate))
      : new Date();
    const expiryDate = reservationData.expiryDate instanceof Date 
      ? reservationData.expiryDate 
      : new Date(reservationData.expiryDate);
    
    if (expiryDate <= reservationDate) {
      throw new Error('Expiry date must be after reservation date');
    }

    // Validate deposit meets room requirements if room has depositRequired
    // Note: Deposit is always required (> 0), but if room has depositRequired, it must meet minimum
    if (room.deposit_required) {
      let requiredDeposit = 0;
      
      switch (room.deposit_type) {
        case 'one_month':
          requiredDeposit = parseFloat(room.monthly_rate);
          break;
        case 'percentage':
          requiredDeposit = room.deposit_percentage
            ? (parseFloat(room.monthly_rate) * parseFloat(room.deposit_percentage)) / 100
            : 0;
          break;
        case 'fixed':
          requiredDeposit = room.deposit_amount ? parseFloat(room.deposit_amount) : 0;
          break;
      }

      if (reservationData.reservationDeposit < requiredDeposit) {
        throw new Error(`Minimum deposit required: ${requiredDeposit.toLocaleString()}`);
      }
    }

    // Create payment record (deposit is always required, so this always executes)
    let depositPaymentId: string | undefined;
      // Create payment directly in the transaction
      const paymentQuery = `
        INSERT INTO payments (
          tenant_id, assignment_id, amount, payment_type, payment_method,
          payment_date, due_date, reference_number, notes, payment_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `;
      
      const paymentResult = await client.query(paymentQuery, [
        reservationData.tenantId,
        null, // No assignment_id for reservation deposits
        reservationData.reservationDeposit,
        'deposit',
        'cash', // Default, can be updated later
        reservationDate.toISOString().split('T')[0],
        reservationDate.toISOString().split('T')[0],
        null, // reference_number
        `Reservation deposit for room reservation`,
        'paid' // Set directly to paid for reservation deposits
      ]);
      
    depositPaymentId = paymentResult.rows[0].id;

    // Create reservation
    const reservationQuery = `
      INSERT INTO reservations (
        tenant_id, room_id, reservation_date, expiry_date, monthly_rate,
        reservation_deposit, deposit_payment_id, notes, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const reservationResult = await client.query(reservationQuery, [
      reservationData.tenantId,
      reservationData.roomId,
      reservationDate.toISOString().split('T')[0],
      expiryDate.toISOString().split('T')[0],
      reservationData.monthlyRate,
      reservationData.reservationDeposit, // Deposit is always required, no need for || 0
      depositPaymentId,
      reservationData.notes || null,
      createdBy || null,
    ]);

    // Update room status to reserved
    await client.query(
      'UPDATE rooms SET room_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['reserved', reservationData.roomId]
    );

    await client.query('COMMIT');

    return mapDatabaseReservationToReservation(reservationResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating reservation:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get all reservations with filters and pagination
export async function getAllReservations(filters?: {
  status?: string;
  tenantId?: string;
  roomId?: string;
  expiredOnly?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ reservations: ReservationWithDetails[]; total: number; page: number; limit: number }> {
  try {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const values: any[] = [];
    let paramCount = 0;

    if (filters?.status) {
      paramCount++;
      whereClause += ` AND r.reservation_status = $${paramCount}`;
      values.push(filters.status);
    }

    if (filters?.tenantId) {
      paramCount++;
      whereClause += ` AND r.tenant_id = $${paramCount}`;
      values.push(filters.tenantId);
    }

    if (filters?.roomId) {
      paramCount++;
      whereClause += ` AND r.room_id = $${paramCount}`;
      values.push(filters.roomId);
    }

    if (filters?.expiredOnly) {
      whereClause += ` AND r.expiry_date < CURRENT_DATE AND r.reservation_status = 'active'`;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM reservations r ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get reservations with details
    const query = `
      SELECT 
        r.*,
        t.first_name || ' ' || t.last_name as tenant_name,
        t.email as tenant_email,
        rm.room_number,
        b.name as building_name,
        CURRENT_DATE - r.expiry_date as days_until_expiry
      FROM reservations r
      INNER JOIN tenants t ON r.tenant_id = t.id
      INNER JOIN rooms rm ON r.room_id = rm.id
      INNER JOIN buildings b ON rm.building_id = b.id
      ${whereClause}
      ORDER BY r.expiry_date ASC, r.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    values.push(limit, offset);
    const result = await pool.query(query, values);

    const reservations: ReservationWithDetails[] = result.rows.map(row => {
      const reservation = mapDatabaseReservationToReservation(row);
      const daysUntilExpiry = parseInt(row.days_until_expiry) || 0;
      
      return {
        ...reservation,
        tenantName: row.tenant_name,
        tenantEmail: row.tenant_email,
        roomNumber: row.room_number,
        buildingName: row.building_name,
        daysUntilExpiry: daysUntilExpiry,
        isExpired: daysUntilExpiry < 0 && reservation.reservationStatus === 'active',
      };
    });

    return {
      reservations,
      total,
      page,
      limit,
    };
  } catch (error) {
    console.error('Error fetching reservations:', error);
    throw error;
  }
}

// Get reservation by ID
export async function getReservationById(id: string): Promise<ReservationWithDetails | null> {
  try {
    const query = `
      SELECT 
        r.*,
        t.first_name || ' ' || t.last_name as tenant_name,
        t.email as tenant_email,
        rm.room_number,
        b.name as building_name,
        CURRENT_DATE - r.expiry_date as days_until_expiry
      FROM reservations r
      INNER JOIN tenants t ON r.tenant_id = t.id
      INNER JOIN rooms rm ON r.room_id = rm.id
      INNER JOIN buildings b ON rm.building_id = b.id
      WHERE r.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const reservation = mapDatabaseReservationToReservation(row);
    const daysUntilExpiry = parseInt(row.days_until_expiry) || 0;

    return {
      ...reservation,
      tenantName: row.tenant_name,
      tenantEmail: row.tenant_email,
      roomNumber: row.room_number,
      buildingName: row.building_name,
      daysUntilExpiry: daysUntilExpiry,
      isExpired: daysUntilExpiry < 0 && reservation.reservationStatus === 'active',
    };
  } catch (error) {
    console.error('Error fetching reservation:', error);
    throw error;
  }
}

// Get reservations by room
export async function getReservationsByRoom(roomId: string): Promise<Reservation[]> {
  try {
    const query = `
      SELECT * FROM reservations
      WHERE room_id = $1
      ORDER BY reservation_date DESC
    `;

    const result = await pool.query(query, [roomId]);
    return result.rows.map(mapDatabaseReservationToReservation);
  } catch (error) {
    console.error('Error fetching reservations by room:', error);
    throw error;
  }
}

// Get reservations by tenant
export async function getReservationsByTenant(tenantId: string): Promise<Reservation[]> {
  try {
    const query = `
      SELECT * FROM reservations
      WHERE tenant_id = $1
      ORDER BY reservation_date DESC
    `;

    const result = await pool.query(query, [tenantId]);
    return result.rows.map(mapDatabaseReservationToReservation);
  } catch (error) {
    console.error('Error fetching reservations by tenant:', error);
    throw error;
  }
}

// Update reservation
export async function updateReservation(
  id: string,
  updates: Partial<CreateReservationData>
): Promise<Reservation> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (updates.expiryDate) {
      paramCount++;
      updateFields.push(`expiry_date = $${paramCount}`);
      values.push(new Date(updates.expiryDate).toISOString().split('T')[0]);
    }

    if (updates.monthlyRate !== undefined) {
      paramCount++;
      updateFields.push(`monthly_rate = $${paramCount}`);
      values.push(updates.monthlyRate);
    }

    if (updates.reservationDeposit !== undefined) {
      paramCount++;
      updateFields.push(`reservation_deposit = $${paramCount}`);
      values.push(updates.reservationDeposit);
    }

    if (updates.notes !== undefined) {
      paramCount++;
      updateFields.push(`notes = $${paramCount}`);
      values.push(updates.notes);
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    paramCount++;
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE reservations
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Reservation not found');
    }

    await client.query('COMMIT');
    return mapDatabaseReservationToReservation(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating reservation:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Cancel reservation
export async function cancelReservation(id: string, refundDeposit: boolean = true): Promise<Reservation> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get reservation details
    const reservationResult = await client.query(
      'SELECT * FROM reservations WHERE id = $1',
      [id]
    );

    if (reservationResult.rows.length === 0) {
      throw new Error('Reservation not found');
    }

    const reservation = reservationResult.rows[0];

    if (reservation.reservation_status !== 'active') {
      throw new Error('Only active reservations can be cancelled');
    }

    // Create refund payment if deposit was paid and refund requested
    if (refundDeposit && reservation.deposit_payment_id && reservation.reservation_deposit > 0) {
      const refundPaymentData: CreatePaymentData = {
        tenantId: reservation.tenant_id,
        amount: parseFloat(reservation.reservation_deposit),
        paymentType: 'deposit',
        paymentMethod: 'cash',
        paymentDate: new Date(),
        notes: `Refund for cancelled reservation #${id}`,
      };

      const refundPayment = await createPayment(refundPaymentData);
      
      // Mark refund payment as paid
      await client.query(
        'UPDATE payments SET payment_status = $1 WHERE id = $2',
        ['paid', refundPayment.id]
      );
    }

    // Update reservation status
    const updateResult = await client.query(
      `UPDATE reservations 
       SET reservation_status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    // Check if room has other active reservations
    const otherReservations = await client.query(
      `SELECT id FROM reservations 
       WHERE room_id = $1 
       AND reservation_status = 'active' 
       AND id != $2
       AND expiry_date >= CURRENT_DATE`,
      [reservation.room_id, id]
    );

    // If no other active reservations, set room to vacant
    if (otherReservations.rows.length === 0) {
      await client.query(
        'UPDATE rooms SET room_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['vacant', reservation.room_id]
      );
    }

    await client.query('COMMIT');
    return mapDatabaseReservationToReservation(updateResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error cancelling reservation:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Convert reservation to assignment
export async function convertReservationToAssignment(
  reservationId: string,
  assignmentData: {
    startDate: Date;
    endDate?: Date;
    depositPaid?: number;
    advanceAmount?: number;
    notes?: string;
    generateInvoices?: boolean;
  }
): Promise<{ reservation: Reservation; assignmentId: string }> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get reservation details
    const reservationResult = await client.query(
      'SELECT * FROM reservations WHERE id = $1',
      [reservationId]
    );

    if (reservationResult.rows.length === 0) {
      throw new Error('Reservation not found');
    }

    const reservation = reservationResult.rows[0];

    if (reservation.reservation_status !== 'active') {
      throw new Error('Only active reservations can be converted');
    }

    // Check if reservation is expired
    const expiryDate = new Date(reservation.expiry_date);
    if (expiryDate < new Date()) {
      throw new Error('Cannot convert expired reservation');
    }

    // Create tenant room assignment
    const assignmentQuery = `
      INSERT INTO tenant_room_assignments (
        tenant_id, room_id, start_date, end_date, monthly_rate, 
        deposit_paid, assignment_status, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)
      RETURNING id
    `;

    const assignmentResult = await client.query(assignmentQuery, [
      reservation.tenant_id,
      reservation.room_id,
      assignmentData.startDate.toISOString().split('T')[0],
      assignmentData.endDate?.toISOString().split('T')[0] || null,
      reservation.monthly_rate,
      assignmentData.depositPaid || reservation.reservation_deposit || 0,
      assignmentData.notes || reservation.notes || null,
    ]);

    const assignmentId = assignmentResult.rows[0].id;

    // Update reservation status and link to assignment
    const updateReservationQuery = `
      UPDATE reservations
      SET reservation_status = 'converted',
          converted_to_assignment_id = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const updatedReservation = await client.query(updateReservationQuery, [
      assignmentId,
      reservationId,
    ]);

    // Update room status to occupied
    await client.query(
      'UPDATE rooms SET room_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['occupied', reservation.room_id]
    );

    // Update tenant status
    await client.query(
      `UPDATE tenants 
       SET tenant_status = 'active', 
           move_in_date = $1,
           lease_start_date = $1,
           lease_end_date = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [
        assignmentData.startDate.toISOString().split('T')[0],
        assignmentData.endDate?.toISOString().split('T')[0] || null,
        reservation.tenant_id,
      ]
    );

    await client.query('COMMIT');

    return {
      reservation: mapDatabaseReservationToReservation(updatedReservation.rows[0]),
      assignmentId,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error converting reservation to assignment:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get expired reservations
export async function getExpiredReservations(): Promise<ReservationWithDetails[]> {
  try {
    const result = await getAllReservations({
      expiredOnly: true,
      limit: 1000, // Get all expired
    });
    return result.reservations;
  } catch (error) {
    console.error('Error fetching expired reservations:', error);
    throw error;
  }
}

