import pool from '@/lib/db';
import type { PoolClient } from 'pg';
import { toCanonicalPaymentMethod } from '@/lib/constants/payment-methods';
import { recalculateInvoiceStatusesForIds } from '@/lib/services/invoice-status-recalculator';
import { clampPageLimit } from '@/lib/db/query-limits';

export interface Payment {
  id: string;
  tenantId: string;
  roomAssignmentId?: string;
  amount: number;
  paymentType: 'rent' | 'deposit' | 'advance' | 'late_fee' | 'utility' | 'asset_rental' | 'other';
  paymentMethod?: 'cash' | 'cheque' | 'check' | 'credit_card' | 'bank_transfer' | 'online' | 'gcash' | 'other';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentDate: Date;
  dueDate?: Date;
  /** GCash / bank receipt number the tenant typed */
  referenceNumber?: string;
  /** Internal Parenta id: txn-r-000001-26 */
  parentaTxnId?: string;
  notes?: string;
  /** Official receipt number (admin process payment) */
  orNumber?: string;
  /** Official receipt date */
  orDate?: Date;
  receiptFilePath?: string;
  receiptFileName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentWithDetails extends Payment {
  tenantName: string;
  tenantEmail: string;
  tenantPhone?: string;
  roomId?: string;
  roomNumber?: string;
  buildingName?: string;
  monthlyRate?: number;
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
  paymentType: 'rent' | 'deposit' | 'advance' | 'late_fee' | 'utility' | 'asset_rental' | 'other';
  paymentMethod?: 'cash' | 'cheque' | 'check' | 'credit_card' | 'bank_transfer' | 'online' | 'gcash' | 'maya' | 'other';
  paymentStatus?: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentDate: Date;
  dueDate?: Date;
  referenceNumber?: string;
  parentaTxnId?: string;
  notes?: string;
  orNumber?: string;
  orDate?: Date | null;
}

export interface UpdatePaymentData {
  amount?: number;
  paymentType?: 'rent' | 'deposit' | 'downpayment' | 'late_fee' | 'utility' | 'asset_rental' | 'other';
  paymentMethod?: 'cash' | 'cheque' | 'check' | 'credit_card' | 'bank_transfer' | 'online' | 'gcash' | 'other';
  paymentStatus?: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentDate?: Date;
  dueDate?: Date;
  referenceNumber?: string;
  parentaTxnId?: string;
  notes?: string;
  orNumber?: string;
  orDate?: Date;
}

export interface PaymentFilters {
  tenantId?: string;
  paymentType?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  buildingId?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

// Map app payment status to DB enum (pending, paid, partial, overdue, cancelled, refunded)
const mapPaymentStatusToDb = (status?: string): string => {
  switch (status) {
    case 'completed': return 'paid';
    case 'failed': return 'cancelled';
    case 'refunded': return 'refunded';
    default: return status || 'pending';
  }
};

// Map app payment type to DB enum (schema: rent, deposit, advance, late_fee, utility, asset_rental, other)
const mapPaymentTypeToDb = (type: string): string => {
  switch (type) {
    case 'utilities':
      return 'utility';
    case 'fee':
      return 'other';
    default:
      return type;
  }
};

// Create a new payment
export async function createPayment(
  paymentData: CreatePaymentData,
  client?: PoolClient
): Promise<Payment> {
  const query = `
    INSERT INTO payments (
      tenant_id, assignment_id, amount, payment_type, payment_method,
      payment_date, due_date, reference_number, parenta_txn_id, notes, payment_status,
      or_number, or_date
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `;
  
  // Validate required fields
  if (!paymentData.paymentType) {
    throw new Error('Payment type is required');
  }
  if (!paymentData.amount || paymentData.amount <= 0) {
    throw new Error('Payment amount must be greater than 0');
  }
  
  const paymentStatus = mapPaymentStatusToDb(paymentData.paymentStatus);
  const paymentType = mapPaymentTypeToDb(paymentData.paymentType);
  const paymentMethod = paymentData.paymentMethod
    ? toCanonicalPaymentMethod(paymentData.paymentMethod)
    : null;

  const { txnTypeFromPaymentType } = await import(
    '@/lib/constants/transaction-ids'
  );
  const txnType = txnTypeFromPaymentType(paymentData.paymentType);

  let parentaTxnId = paymentData.parentaTxnId || null;
  if (!parentaTxnId) {
    try {
      const { allocateParentaTxnId } = await import(
        '@/lib/services/transaction-id-service'
      );
      parentaTxnId = await allocateParentaTxnId(txnType);
    } catch (err) {
      console.error('Parenta txn allocate failed (non-fatal):', err);
    }
  }

  let orNumber = paymentData.orNumber?.trim() || null;
  if (!orNumber) {
    try {
      const { allocateParentaOrId } = await import(
        '@/lib/services/transaction-id-service'
      );
      orNumber = await allocateParentaOrId(txnType);
    } catch (err) {
      console.error('Parenta OR allocate failed (non-fatal):', err);
    }
  }

  const orDate =
    paymentData.orDate && !Number.isNaN(paymentData.orDate.getTime())
      ? paymentData.orDate.toISOString().split('T')[0]
      : paymentData.paymentDate.toISOString().split('T')[0];
  
  const values = [
    paymentData.tenantId,
    paymentData.roomAssignmentId || null,
    paymentData.amount,
    paymentType,
    paymentMethod,
    paymentData.paymentDate.toISOString().split('T')[0],
    paymentData.dueDate?.toISOString().split('T')[0] || paymentData.paymentDate.toISOString().split('T')[0],
    paymentData.referenceNumber || null,
    parentaTxnId,
    paymentData.notes || null,
    paymentStatus,
    orNumber,
    orDate,
  ];

  try {
    const executor = client ?? pool;
    const result = await executor.query(query, values);
    const row = result.rows[0];
    const dbStatus = row.payment_status as string;
    const appStatus = dbStatus === 'paid' ? 'completed' : dbStatus === 'cancelled' ? 'failed' : dbStatus;
    
    return {
      id: row.id,
      tenantId: row.tenant_id,
      roomAssignmentId: row.assignment_id,
      amount: parseFloat(row.amount),
      paymentType: row.payment_type,
      paymentMethod: row.payment_method,
      paymentStatus: appStatus as Payment['paymentStatus'],
      paymentDate: new Date(row.payment_date),
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      referenceNumber: row.reference_number,
      parentaTxnId: row.parenta_txn_id || undefined,
      notes: row.notes,
      orNumber: row.or_number || undefined,
      orDate: row.or_date ? new Date(row.or_date) : undefined,
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
  const safeLimit = clampPageLimit(limit, 20, 100);
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
    queryParams.push(mapPaymentStatusToDb(filters.paymentStatus));
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
  if (filters.search && filters.search.trim()) {
    whereConditions.push(`(
      CONCAT(t.first_name, ' ', t.last_name) ILIKE $${paramIndex}
      OR t.email ILIKE $${paramIndex}
      OR p.notes ILIKE $${paramIndex}
      OR p.reference_number ILIKE $${paramIndex}
      OR r.room_number ILIKE $${paramIndex}
      OR b.name ILIKE $${paramIndex}
    )`);
    queryParams.push(`%${filters.search.trim()}%`);
    paramIndex++;
  }
  if (filters.buildingId) {
    whereConditions.push(`b.id = $${paramIndex++}`);
    queryParams.push(filters.buildingId);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM payments p
    INNER JOIN tenants t ON p.tenant_id = t.id
    LEFT JOIN tenant_room_assignments ra ON p.assignment_id = ra.id
    LEFT JOIN rooms r ON ra.room_id = r.id
    LEFT JOIN buildings b ON r.building_id = b.id
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

  queryParams.push(safeLimit, (page - 1) * safeLimit);

  try {
    const result = await pool.query(dataQuery, queryParams);
    
    const payments: PaymentWithDetails[] = result.rows.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      roomAssignmentId: (row.assignment_id as string) || undefined,
      amount: parseFloat(String(row.amount)),
      paymentType: row.payment_type as Payment['paymentType'],
      paymentMethod: (row.payment_method as Payment['paymentMethod']) || undefined,
      paymentStatus: row.payment_status as Payment['paymentStatus'],
      paymentDate: new Date(row.payment_date as string | Date),
      dueDate: row.due_date ? new Date(row.due_date as string | Date) : undefined,
      referenceNumber: (row.reference_number as string) || undefined,
      parentaTxnId: (row.parenta_txn_id as string) || undefined,
      notes: (row.notes as string) || undefined,
      receiptFilePath: (row.receipt_file_path as string) || undefined,
      receiptFileName: (row.receipt_file_name as string) || undefined,
      createdAt: new Date(row.created_at as string | Date),
      updatedAt: new Date(row.updated_at as string | Date),
      tenantName: `${row.first_name} ${row.last_name}`,
      tenantEmail: row.email as string,
      roomNumber: (row.room_number as string) || undefined,
      buildingName: (row.building_name as string) || undefined,
    }));

    return { payments, total };
  } catch (error) {
    console.error('Error fetching payments:', error);
    throw new Error(`Failed to fetch payments: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/** Tenant receipt claims waiting for office confirmation — not filtered by hub search. */
export async function getPendingPaymentClaims(): Promise<{
  payments: PaymentWithDetails[];
  total: number;
}> {
  const result = await pool.query(
    `SELECT
       p.*,
       t.first_name,
       t.last_name,
       t.email,
       COALESCE(r.room_number, current_r.room_number, direct_r.room_number) AS room_number,
       COALESCE(b.name, current_b.name, direct_b.name) AS building_name
     FROM payments p
     INNER JOIN tenants t ON p.tenant_id = t.id
     LEFT JOIN tenant_room_assignments ra ON p.assignment_id = ra.id
     LEFT JOIN rooms r ON ra.room_id = r.id
     LEFT JOIN buildings b ON r.building_id = b.id
     LEFT JOIN rooms direct_r ON p.room_id = direct_r.id
     LEFT JOIN buildings direct_b ON direct_r.building_id = direct_b.id
     LEFT JOIN LATERAL (
       SELECT tra.room_id
       FROM tenant_room_assignments tra
       WHERE tra.tenant_id = p.tenant_id
         AND tra.assignment_status = 'active'
       ORDER BY tra.start_date DESC
       LIMIT 1
     ) current_ra ON true
     LEFT JOIN rooms current_r ON current_ra.room_id = current_r.id
     LEFT JOIN buildings current_b ON current_r.building_id = current_b.id
     WHERE LOWER(COALESCE(p.payment_status, '')) = 'pending'
     ORDER BY p.created_at DESC
     LIMIT 50`
  );

  const payments: PaymentWithDetails[] = result.rows.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    tenantId: row.tenant_id as string,
    roomAssignmentId: (row.assignment_id as string) || undefined,
    amount: parseFloat(String(row.amount)),
    paymentType: row.payment_type as Payment['paymentType'],
    paymentMethod: (row.payment_method as Payment['paymentMethod']) || undefined,
    paymentStatus: 'pending',
    paymentDate: new Date(row.payment_date as string | Date),
    dueDate: row.due_date ? new Date(row.due_date as string | Date) : undefined,
    referenceNumber: (row.reference_number as string) || undefined,
    parentaTxnId: (row.parenta_txn_id as string) || undefined,
    notes: (row.notes as string) || undefined,
    receiptFilePath: (row.receipt_file_path as string) || undefined,
    receiptFileName: (row.receipt_file_name as string) || undefined,
    createdAt: new Date(row.created_at as string | Date),
    updatedAt: new Date(row.updated_at as string | Date),
    tenantName: `${row.first_name} ${row.last_name}`,
    tenantEmail: row.email as string,
    roomNumber: (row.room_number as string) || undefined,
    buildingName: (row.building_name as string) || undefined,
  }));

  return { payments, total: payments.length };
}

// Get payment by ID
export async function getPaymentById(id: string): Promise<PaymentWithDetails | null> {
  const query = `
    SELECT 
      p.*,
      t.first_name,
      t.last_name,
      t.email,
      t.phone,
      -- Use payment's assignment room if available, otherwise use tenant's current assignment
      COALESCE(ra.room_id, current_ra.room_id) as room_id,
      COALESCE(r.room_number, current_r.room_number) as room_number,
      COALESCE(r.monthly_rate, current_r.monthly_rate) as room_monthly_rate,
      COALESCE(ra.monthly_rate, current_ra.monthly_rate) as assignment_monthly_rate,
      COALESCE(b.name, current_b.name) as building_name
    FROM payments p
    INNER JOIN tenants t ON p.tenant_id = t.id
    -- Get room from payment's assignment (if payment was linked to a specific assignment)
    LEFT JOIN tenant_room_assignments ra ON p.assignment_id = ra.id
    LEFT JOIN rooms r ON ra.room_id = r.id
    LEFT JOIN buildings b ON r.building_id = b.id
    -- Get tenant's current active room assignment as fallback
    LEFT JOIN LATERAL (
      SELECT tra.room_id, tra.monthly_rate
      FROM tenant_room_assignments tra
      WHERE tra.tenant_id = p.tenant_id 
        AND tra.assignment_status = 'active'
      ORDER BY tra.start_date DESC
      LIMIT 1
    ) current_ra ON true
    LEFT JOIN rooms current_r ON current_ra.room_id = current_r.id
    LEFT JOIN buildings current_b ON current_r.building_id = current_b.id
    WHERE p.id = $1
  `;

  try {
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    // Use assignment monthly_rate if available, otherwise use room monthly_rate
    const monthlyRate = row.assignment_monthly_rate || row.room_monthly_rate;
    
    return {
      id: row.id,
      tenantId: row.tenant_id,
      roomAssignmentId: row.assignment_id,
      roomId: row.room_id,
      amount: parseFloat(row.amount),
      paymentType: row.payment_type,
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      paymentDate: new Date(row.payment_date),
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      referenceNumber: row.reference_number,
      parentaTxnId: row.parenta_txn_id || undefined,
      notes: row.notes,
      orNumber: row.or_number || undefined,
      orDate: row.or_date ? new Date(row.or_date) : undefined,
      receiptFilePath: row.receipt_file_path || undefined,
      receiptFileName: row.receipt_file_name || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      tenantName: `${row.first_name} ${row.last_name}`,
      tenantEmail: row.email,
      tenantPhone: row.phone,
      roomNumber: row.room_number,
      buildingName: row.building_name,
      monthlyRate: monthlyRate ? parseFloat(monthlyRate) : undefined,
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
    queryParams.push(mapPaymentStatusToDb(updateData.paymentStatus));
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
  if (updateData.parentaTxnId !== undefined) {
    updateFields.push(`parenta_txn_id = $${paramIndex++}`);
    queryParams.push(updateData.parentaTxnId);
  }
  if (updateData.notes !== undefined) {
    updateFields.push(`notes = $${paramIndex++}`);
    queryParams.push(updateData.notes);
  }
  if (updateData.orNumber !== undefined) {
    updateFields.push(`or_number = $${paramIndex++}`);
    queryParams.push(updateData.orNumber);
  }
  if (updateData.orDate !== undefined) {
    updateFields.push(`or_date = $${paramIndex++}`);
    queryParams.push(updateData.orDate.toISOString().split('T')[0]);
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
      parentaTxnId: row.parenta_txn_id || undefined,
      notes: row.notes,
      orNumber: row.or_number || undefined,
      orDate: row.or_date ? new Date(row.or_date) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  } catch (error) {
    console.error('Error updating payment:', error);
    throw new Error(`Failed to update payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function isAlreadyReversedStatus(status: string | undefined): boolean {
  const key = String(status || '').toLowerCase();
  return key === 'refunded' || key === 'cancelled' || key === 'failed';
}

function isPaidStatus(status: string | undefined): boolean {
  const key = String(status || '').toLowerCase();
  return key === 'paid' || key === 'completed';
}

/**
 * Drop invoice allocations and unused excess-payment credits for this payment.
 * Invoice amount_paid is recalculated after the caller commits (INSERT trigger
 * does not fire on allocation DELETE).
 */
async function reversePaymentEffects(
  client: PoolClient,
  paymentId: string
): Promise<{ invoiceIds: string[]; tenantId: string }> {
  const paymentResult = await client.query(
    `SELECT id, tenant_id, payment_status FROM payments WHERE id = $1 FOR UPDATE`,
    [paymentId]
  );
  if (paymentResult.rows.length === 0) {
    throw new Error('Payment not found');
  }

  const allocResult = await client.query(
    `SELECT DISTINCT invoice_id::text AS invoice_id
     FROM payment_allocations
     WHERE payment_id = $1`,
    [paymentId]
  );
  const invoiceIds = allocResult.rows.map((row) => String(row.invoice_id));

  await client.query(`DELETE FROM payment_allocations WHERE payment_id = $1`, [paymentId]);
  await client.query(
    `UPDATE tenant_credits
     SET status = 'refunded', updated_at = CURRENT_TIMESTAMP
     WHERE payment_id = $1 AND status = 'available'`,
    [paymentId]
  );

  return {
    invoiceIds,
    tenantId: String(paymentResult.rows[0].tenant_id),
  };
}

async function recalcInvoicesAndSync(invoiceIds: string[], tenantId: string): Promise<void> {
  if (invoiceIds.length > 0) {
    await recalculateInvoiceStatusesForIds(invoiceIds);
  }
  try {
    const { syncPaymentCardForTenant } = await import('@/lib/api/pipeline');
    await syncPaymentCardForTenant(tenantId);
  } catch (err) {
    console.error('Payment pipeline sync after refund/void failed:', err);
  }
}

/** Mark a collected payment as refunded and restore invoice balances. */
export async function refundPayment(id: string): Promise<Payment> {
  const client = await pool.connect();
  let invoiceIds: string[] = [];
  let tenantId = '';

  try {
    await client.query('BEGIN');
    const current = await client.query(
      `SELECT payment_status, notes FROM payments WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (current.rows.length === 0) {
      throw new Error('Payment not found');
    }
    const status = String(current.rows[0].payment_status || '');
    if (isAlreadyReversedStatus(status)) {
      throw new Error('This payment is already refunded or cancelled');
    }
    if (!isPaidStatus(status)) {
      throw new Error('Only a completed payment can be refunded. Reject or void a pending claim instead.');
    }

    const reversed = await reversePaymentEffects(client, id);
    invoiceIds = reversed.invoiceIds;
    tenantId = reversed.tenantId;

    const priorNotes = current.rows[0].notes ? String(current.rows[0].notes) : '';
    const refundNote = `Refunded by office on ${new Date().toISOString().slice(0, 10)}`;
    await client.query(
      `UPDATE payments
       SET payment_status = $2,
           notes = $3,
           updated_at = NOW()
       WHERE id = $1`,
      [id, mapPaymentStatusToDb('refunded'), [priorNotes, refundNote].filter(Boolean).join('\n')]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error refunding payment:', error);
    throw new Error(
      `Failed to refund payment: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  } finally {
    client.release();
  }

  await recalcInvoicesAndSync(invoiceIds, tenantId);
  const updated = await getPaymentById(id);
  if (!updated) {
    throw new Error('Payment not found');
  }
  return updated;
}

// Delete payment (void) — restores invoice balances first
export async function deletePayment(id: string): Promise<void> {
  const client = await pool.connect();
  let invoiceIds: string[] = [];
  let tenantId = '';

  try {
    await client.query('BEGIN');
    const current = await client.query(
      `SELECT id, tenant_id FROM payments WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (current.rows.length === 0) {
      throw new Error('Payment not found');
    }
    const reversed = await reversePaymentEffects(client, id);
    invoiceIds = reversed.invoiceIds;
    tenantId = reversed.tenantId;
    await client.query('DELETE FROM payments WHERE id = $1', [id]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting payment:', error);
    throw new Error(
      `Failed to delete payment: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  } finally {
    client.release();
  }

  await recalcInvoicesAndSync(invoiceIds, tenantId);
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
      COUNT(CASE WHEN payment_status IN ('paid', 'completed') THEN 1 END) as completed_payments,
      COALESCE(SUM(CASE WHEN payment_status IN ('paid', 'completed') THEN amount ELSE 0 END), 0) as completed_amount,
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