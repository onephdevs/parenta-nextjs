import pool from '@/lib/db';

export interface Payment {
  id: string;
  tenantId: string;
  roomAssignmentId?: string;
  amount: number;
  paymentType: 'rent' | 'deposit' | 'fee' | 'utilities' | 'other';
  paymentMethod?: 'cash' | 'check' | 'credit_card' | 'bank_transfer' | 'online';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentDate: Date;
  dueDate?: Date;
  referenceNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentWithDetails extends Payment {
  tenantName: string;
  tenantEmail: string;
  roomNumber?: string;
  buildingName?: string;
}

export interface PaymentSummary {
  totalPayments: number;
  totalAmount: number;
  pendingPayments: number;
  pendingAmount: number;
  completedPayments: number;
  completedAmount: number;
  overduePayments: number;
  overdueAmount: number;
  averagePaymentAmount: number;
}

export interface CreatePaymentData {
  tenantId: string;
  roomAssignmentId?: string;
  amount: number;
  paymentType: 'rent' | 'deposit' | 'fee' | 'utilities' | 'other';
  paymentMethod?: 'cash' | 'check' | 'credit_card' | 'bank_transfer' | 'online';
  paymentDate: Date;
  dueDate?: Date;
  referenceNumber?: string;
  notes?: string;
}

export interface UpdatePaymentData {
  amount?: number;
  paymentType?: 'rent' | 'deposit' | 'fee' | 'utilities' | 'other';
  paymentMethod?: 'cash' | 'check' | 'credit_card' | 'bank_transfer' | 'online';
  paymentStatus?: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentDate?: Date;
  dueDate?: Date;
  referenceNumber?: string;
  notes?: string;
}

export interface PaymentFilters {
  tenantId?: string;
  paymentType?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
}

// Create a new payment
export async function createPayment(paymentData: CreatePaymentData): Promise<Payment> {
  const query = `
    INSERT INTO payments (
      tenant_id, assignment_id, amount, payment_type, payment_method,
      payment_date, due_date, reference_number, notes, payment_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;
  
  const values = [
    paymentData.tenantId,
    paymentData.roomAssignmentId || null,
    paymentData.amount,
    paymentData.paymentType,
    paymentData.paymentMethod || null,
    paymentData.paymentDate.toISOString().split('T')[0],
    paymentData.dueDate?.toISOString().split('T')[0] || null,
    paymentData.referenceNumber || null,
    paymentData.notes || null,
    'pending'
  ];

  try {
    const result = await pool.query(query, values);
    const row = result.rows[0];
    
    return {
      id: row.id,
      tenantId: row.tenant_id,
      roomAssignmentId: row.assignment_id,
      amount: parseFloat(row.amount),
      paymentType: row.payment_type,
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      paymentDate: new Date(row.payment_date),
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      referenceNumber: row.reference_number,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  } catch (error) {
    console.error('Error creating payment:', error);
    throw new Error(`Failed to create payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get all payments with filtering and pagination
export async function getPayments(
  filters: PaymentFilters = {},
  page: number = 1,
  limit: number = 20
): Promise<{ payments: PaymentWithDetails[]; total: number }> {
  const whereConditions: string[] = [];
  const queryParams: unknown[] = [];
  let paramIndex = 1;

  // Build WHERE conditions
  if (filters.tenantId) {
    whereConditions.push(`p.tenant_id = $${paramIndex++}`);
    queryParams.push(filters.tenantId);
  }
  if (filters.paymentType) {
    whereConditions.push(`p.payment_type = $${paramIndex++}`);
    queryParams.push(filters.paymentType);
  }
  if (filters.paymentStatus) {
    whereConditions.push(`p.payment_status = $${paramIndex++}`);
    queryParams.push(filters.paymentStatus);
  }
  if (filters.paymentMethod) {
    whereConditions.push(`p.payment_method = $${paramIndex++}`);
    queryParams.push(filters.paymentMethod);
  }
  if (filters.startDate) {
    whereConditions.push(`p.payment_date >= $${paramIndex++}`);
    queryParams.push(filters.startDate.toISOString().split('T')[0]);
  }
  if (filters.endDate) {
    whereConditions.push(`p.payment_date <= $${paramIndex++}`);
    queryParams.push(filters.endDate.toISOString().split('T')[0]);
  }
  if (filters.minAmount) {
    whereConditions.push(`p.amount >= $${paramIndex++}`);
    queryParams.push(filters.minAmount);
  }
  if (filters.maxAmount) {
    whereConditions.push(`p.amount <= $${paramIndex++}`);
    queryParams.push(filters.maxAmount);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM payments p
    INNER JOIN tenants t ON p.tenant_id = t.id
    ${whereClause}
  `;
  
  const countResult = await pool.query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].total);

  // Get paginated results
  const dataQuery = `
    SELECT 
      p.*,
      t.first_name,
      t.last_name,
      t.email,
      r.room_number,
      b.name as building_name
    FROM payments p
    INNER JOIN tenants t ON p.tenant_id = t.id
    LEFT JOIN tenant_room_assignments ra ON p.assignment_id = ra.id
    LEFT JOIN rooms r ON ra.room_id = r.id
    LEFT JOIN buildings b ON r.building_id = b.id
    ${whereClause}
    ORDER BY p.payment_date DESC, p.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  queryParams.push(limit, (page - 1) * limit);

  try {
    const result = await pool.query(dataQuery, queryParams);
    
    const payments: PaymentWithDetails[] = result.rows.map((row: Record<string, unknown>) => ({
      id: row.id,
      tenantId: row.tenant_id,
      roomAssignmentId: row.assignment_id,
      amount: parseFloat(row.amount),
      paymentType: row.payment_type,
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      paymentDate: new Date(row.payment_date),
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      referenceNumber: row.reference_number,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      tenantName: `${row.first_name} ${row.last_name}`,
      tenantEmail: row.email,
      roomNumber: row.room_number,
      buildingName: row.building_name,
    }));

    return { payments, total };
  } catch (error) {
    console.error('Error fetching payments:', error);
    throw new Error(`Failed to fetch payments: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get payment by ID
export async function getPaymentById(id: string): Promise<PaymentWithDetails | null> {
  const query = `
    SELECT 
      p.*,
      t.first_name,
      t.last_name,
      t.email,
      r.room_number,
      b.name as building_name
    FROM payments p
    INNER JOIN tenants t ON p.tenant_id = t.id
    LEFT JOIN tenant_room_assignments ra ON p.assignment_id = ra.id
    LEFT JOIN rooms r ON ra.room_id = r.id
    LEFT JOIN buildings b ON r.building_id = b.id
    WHERE p.id = $1
  `;

  try {
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      tenantId: row.tenant_id,
      roomAssignmentId: row.assignment_id,
      amount: parseFloat(row.amount),
      paymentType: row.payment_type,
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      paymentDate: new Date(row.payment_date),
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      referenceNumber: row.reference_number,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      tenantName: `${row.first_name} ${row.last_name}`,
      tenantEmail: row.email,
      roomNumber: row.room_number,
      buildingName: row.building_name,
    };
  } catch (error) {
    console.error('Error fetching payment:', error);
    throw new Error(`Failed to fetch payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Update payment
export async function updatePayment(id: string, updateData: UpdatePaymentData): Promise<Payment> {
  const updateFields: string[] = [];
  const queryParams: unknown[] = [];
  let paramIndex = 1;

  if (updateData.amount !== undefined) {
    updateFields.push(`amount = $${paramIndex++}`);
    queryParams.push(updateData.amount);
  }
  if (updateData.paymentType) {
    updateFields.push(`payment_type = $${paramIndex++}`);
    queryParams.push(updateData.paymentType);
  }
  if (updateData.paymentMethod) {
    updateFields.push(`payment_method = $${paramIndex++}`);
    queryParams.push(updateData.paymentMethod);
  }
  if (updateData.paymentStatus) {
    updateFields.push(`payment_status = $${paramIndex++}`);
    queryParams.push(updateData.paymentStatus);
  }
  if (updateData.paymentDate) {
    updateFields.push(`payment_date = $${paramIndex++}`);
    queryParams.push(updateData.paymentDate.toISOString().split('T')[0]);
  }
  if (updateData.dueDate) {
    updateFields.push(`due_date = $${paramIndex++}`);
    queryParams.push(updateData.dueDate.toISOString().split('T')[0]);
  }

  if (updateData.referenceNumber) {
    updateFields.push(`reference_number = $${paramIndex++}`);
    queryParams.push(updateData.referenceNumber);
  }
  if (updateData.notes !== undefined) {
    updateFields.push(`notes = $${paramIndex++}`);
    queryParams.push(updateData.notes);
  }

  updateFields.push(`updated_at = NOW()`);
  queryParams.push(id);

  const query = `
    UPDATE payments 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  try {
    const result = await pool.query(query, queryParams);
    
    if (result.rows.length === 0) {
      throw new Error('Payment not found');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      tenantId: row.tenant_id,
      roomAssignmentId: row.assignment_id,
      amount: parseFloat(row.amount),
      paymentType: row.payment_type,
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      paymentDate: new Date(row.payment_date),
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      referenceNumber: row.reference_number,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  } catch (error) {
    console.error('Error updating payment:', error);
    throw new Error(`Failed to update payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Delete payment
export async function deletePayment(id: string): Promise<void> {
  const query = 'DELETE FROM payments WHERE id = $1';

  try {
    const result = await pool.query(query, [id]);
    
    if (result.rowCount === 0) {
      throw new Error('Payment not found');
    }
  } catch (error) {
    console.error('Error deleting payment:', error);
    throw new Error(`Failed to delete payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get payment summary statistics
export async function getPaymentSummary(
  startDate?: Date,
  endDate?: Date
): Promise<PaymentSummary> {
  const whereConditions: string[] = [];
  const queryParams: unknown[] = [];
  let paramIndex = 1;

  if (startDate) {
    whereConditions.push(`payment_date >= $${paramIndex++}`);
    queryParams.push(startDate.toISOString().split('T')[0]);
  }
  if (endDate) {
    whereConditions.push(`payment_date <= $${paramIndex++}`);
    queryParams.push(endDate.toISOString().split('T')[0]);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const query = `
    SELECT 
      COUNT(*) as total_payments,
      COALESCE(SUM(amount), 0) as total_amount,
      COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_payments,
      COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
      COUNT(CASE WHEN payment_status = 'completed' THEN 1 END) as completed_payments,
      COALESCE(SUM(CASE WHEN payment_status = 'completed' THEN amount ELSE 0 END), 0) as completed_amount,
      COUNT(CASE WHEN payment_status = 'pending' AND due_date < CURRENT_DATE THEN 1 END) as overdue_payments,
      COALESCE(SUM(CASE WHEN payment_status = 'pending' AND due_date < CURRENT_DATE THEN amount ELSE 0 END), 0) as overdue_amount
    FROM payments
    ${whereClause}
  `;

  try {
    const result = await pool.query(query, queryParams);
    const row = result.rows[0];

    const totalPayments = parseInt(row.total_payments);
    const totalAmount = parseFloat(row.total_amount);

    return {
      totalPayments,
      totalAmount,
      pendingPayments: parseInt(row.pending_payments),
      pendingAmount: parseFloat(row.pending_amount),
      completedPayments: parseInt(row.completed_payments),
      completedAmount: parseFloat(row.completed_amount),
      overduePayments: parseInt(row.overdue_payments),
      overdueAmount: parseFloat(row.overdue_amount),
      averagePaymentAmount: totalPayments > 0 ? totalAmount / totalPayments : 0,
    };
  } catch (error) {
    console.error('Error fetching payment summary:', error);
    throw new Error(`Failed to fetch payment summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get payments by tenant
export async function getPaymentsByTenant(tenantId: string): Promise<PaymentWithDetails[]> {
  const { payments } = await getPayments({ tenantId }, 1, 1000);
  return payments;
}

// Mark payment as completed
export async function markPaymentCompleted(id: string): Promise<Payment> {
  return updatePayment(id, { paymentStatus: 'completed' });
}

// Calculate late fees for overdue payments
export async function calculateLateFees(lateFeeRate: number = 0.05): Promise<number> {
  const query = `
    SELECT id, amount, due_date
    FROM payments
    WHERE payment_status = 'pending' 
    AND due_date IS NOT NULL 
    AND due_date < CURRENT_DATE
  `;

  try {
    const result = await pool.query(query);
    let totalLateFees = 0;

    for (const payment of result.rows) {
      const daysOverdue = Math.floor((Date.now() - new Date(payment.due_date).getTime()) / (1000 * 60 * 60 * 24));
      const newLateFee = payment.amount * lateFeeRate * Math.ceil(daysOverdue / 30); // Monthly late fee
      
      // Since we don't have a late_fee column, we'll just calculate the total
      totalLateFees += newLateFee;
    }

    return totalLateFees;
  } catch (error) {
    console.error('Error calculating late fees:', error);
    throw new Error(`Failed to calculate late fees: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Search payments
export async function searchPayments(
  query: string,
  filters: PaymentFilters = {}
): Promise<PaymentWithDetails[]> {
  const { payments } = await getPayments(filters, 1, 1000);
  
  const lowercaseQuery = query.toLowerCase();
  
  return payments.filter(payment => 
    payment.tenantName.toLowerCase().includes(lowercaseQuery) ||
    payment.tenantEmail.toLowerCase().includes(lowercaseQuery) ||
    payment.referenceNumber?.toLowerCase().includes(lowercaseQuery) ||
    payment.paymentType.toLowerCase().includes(lowercaseQuery) ||
    payment.notes?.toLowerCase().includes(lowercaseQuery)
  );
} 