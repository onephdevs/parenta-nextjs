import pool from '@/lib/db';
import { Invoice, InvoiceFilters, InvoiceSummary, InvoicesResponse, InvoiceItem } from '@/types/financial';

// Get all invoices with filtering and pagination
export async function getInvoices(
  filters: InvoiceFilters = {},
  page: number = 1,
  limit: number = 20
): Promise<InvoicesResponse> {
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT 
      i.*,
      CONCAT(t.first_name, ' ', t.last_name) as tenant_name,
      t.email as tenant_email
    FROM invoices i
    LEFT JOIN tenants t ON i.tenant_id = t.id
    WHERE 1=1
  `;

  const params: unknown[] = [];
  let paramIndex = 1;

  // Apply filters
  if (filters.search) {
    query += ` AND (
      i.invoice_number ILIKE $${paramIndex} OR
      CONCAT(t.first_name, ' ', t.last_name) ILIKE $${paramIndex} OR
      t.email ILIKE $${paramIndex} OR
      i.notes ILIKE $${paramIndex} OR
      EXISTS (
        SELECT 1 FROM invoice_line_items ili
        WHERE ili.invoice_id = i.id AND ili.description ILIKE $${paramIndex}
      )
    )`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  if (filters.status) {
    query += ` AND i.invoice_status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters.tenantId) {
    query += ` AND i.tenant_id = $${paramIndex}`;
    params.push(filters.tenantId);
    paramIndex++;
  }

  // Remove room filtering since invoices don't have room_id
  // if (filters.roomId) {
  //   query += ` AND i.room_id = $${paramIndex}`;
  //   params.push(filters.roomId);
  //   paramIndex++;
  // }

  if (filters.dateFrom) {
    query += ` AND i.issue_date >= $${paramIndex}`;
    params.push(filters.dateFrom);
    paramIndex++;
  }

  if (filters.dateTo) {
    query += ` AND i.issue_date <= $${paramIndex}`;
    params.push(filters.dateTo);
    paramIndex++;
  }

  // Get total count
  const countQuery = query.replace(
    /SELECT[\s\S]*?FROM/,
    'SELECT COUNT(*) as total FROM'
  );
  
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].total);

  // Add ordering and pagination
  query += ` ORDER BY i.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  const invoices: Invoice[] = result.rows.map(row => ({
    id: row.id,
    tenantId: row.tenant_id,
    invoiceNumber: row.invoice_number,
    status: row.invoice_status,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    subtotal: parseFloat(row.subtotal),
    taxAmount: parseFloat(row.tax_amount),
    totalAmount: parseFloat(row.total_amount),
    paidAmount: parseFloat(row.amount_paid || '0'),
    balanceDue: parseFloat(row.balance_due ?? String(parseFloat(row.total_amount) - parseFloat(row.amount_paid || '0'))),
    // invoices table has notes only (no description column)
    description: row.notes,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tenantName: row.tenant_name,
    tenantEmail: row.tenant_email,
  }));

  return {
    invoices,
    total,
    page,
    limit,
  };
}

// Get single invoice by ID
export async function getInvoiceById(id: string | number): Promise<Invoice | null> {
  const query = `
    SELECT 
      i.*,
      CONCAT(t.first_name, ' ', t.last_name) as tenant_name,
      t.email as tenant_email,
      t.phone as tenant_phone
    FROM invoices i
    LEFT JOIN tenants t ON i.tenant_id = t.id
    WHERE i.id = $1
  `;

  const result = await pool.query(query, [id]);
  
  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  
  // Get invoice items
  const itemsQuery = `
    SELECT * FROM invoice_line_items 
    WHERE invoice_id = $1 
    ORDER BY id
  `;
  
  const itemsResult = await pool.query(itemsQuery, [id]);
  
  const items: InvoiceItem[] = itemsResult.rows.map(item => ({
    id: item.id,
    invoiceId: item.invoice_id,
    description: item.description,
    quantity: parseFloat(item.quantity),
    unitPrice: parseFloat(item.unit_price),
    amount: parseFloat(item.line_total),
    createdAt: item.created_at,
  }));

  return {
    id: row.id,
    tenantId: row.tenant_id,
    invoiceNumber: row.invoice_number,
    status: row.invoice_status,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    subtotal: parseFloat(row.subtotal),
    taxAmount: parseFloat(row.tax_amount),
    totalAmount: parseFloat(row.total_amount),
    paidAmount: parseFloat(row.amount_paid || '0'),
    description: row.notes,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tenantName: row.tenant_name,
    tenantEmail: row.tenant_email,
    items,
  };
}

// Create new invoice
export async function createInvoice(invoiceData: {
  tenantId: string;
  dueDate: string;
  description?: string;
  notes?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
}): Promise<Invoice> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Calculate totals
    const subtotal = invoiceData.items.reduce((sum, item) => 
      sum + (item.quantity * item.unitPrice), 0
    );
    // Keep tax at 0 for now — schema has tax_amount but UI/PH rent flows don't charge 8% VAT by default
    const taxAmount = 0;
    const totalAmount = subtotal + taxAmount;

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}`;

    // Store optional description in notes (no description column on invoices)
    const notes = [invoiceData.description, invoiceData.notes]
      .filter((part) => part && String(part).trim().length > 0)
      .join(' — ') || null;

    // Create invoice — columns must match schema.sql
    const invoiceQuery = `
      INSERT INTO invoices (
        tenant_id, invoice_number, invoice_status, issue_date, due_date,
        billing_period_start, billing_period_end,
        subtotal, tax_amount, total_amount, amount_paid, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const invoiceValues = [
      invoiceData.tenantId,
      invoiceNumber,
      'sent',
      new Date(),
      invoiceData.dueDate,
      invoiceData.billingPeriodStart || null,
      invoiceData.billingPeriodEnd || null,
      subtotal,
      taxAmount,
      totalAmount,
      0, // amount_paid
      notes,
    ];

    const invoiceResult = await client.query(invoiceQuery, invoiceValues);
    const invoice = invoiceResult.rows[0];

    // Create invoice items
    for (const item of invoiceData.items) {
      await client.query(`
        INSERT INTO invoice_line_items (
          invoice_id, description, quantity, unit_price
        ) VALUES ($1, $2, $3, $4)
      `, [
        invoice.id,
        item.description,
        item.quantity,
        item.unitPrice,
      ]);
    }

    await client.query('COMMIT');

    // Return the complete invoice
    return await getInvoiceById(invoice.id) as Invoice;
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Update invoice
export async function updateInvoice(
  id: string | number,
  updates: {
    status?: string;
    dueDate?: string;
    description?: string;
    notes?: string;
    paidAmount?: number;
  }
): Promise<Invoice | null> {
  const setClause: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.status !== undefined) {
    // Prevent manual setting of system-derived statuses (paid, partial)
    // Only allow: draft, sent, cancelled
    // paid and partial are system-derived based on amount_paid and balance_due
    const allowedStatuses = ['draft', 'sent', 'cancelled'];
    if (!allowedStatuses.includes(updates.status)) {
      throw new Error(`Cannot manually set status '${updates.status}'. Allowed statuses: ${allowedStatuses.join(', ')}. Statuses 'paid' and 'partial' are system-derived.`);
    }
    setClause.push(`invoice_status = $${paramIndex}`);
    values.push(updates.status);
    paramIndex++;
  }

  if (updates.dueDate !== undefined) {
    setClause.push(`due_date = $${paramIndex}`);
    values.push(updates.dueDate);
    paramIndex++;
  }

  // description maps to notes column (no description on invoices)
  if (updates.description !== undefined || updates.notes !== undefined) {
    const notesValue = updates.notes !== undefined ? updates.notes : updates.description;
    setClause.push(`notes = $${paramIndex}`);
    values.push(notesValue);
    paramIndex++;
  }

  if (updates.paidAmount !== undefined) {
    setClause.push(`amount_paid = $${paramIndex}`);
    values.push(updates.paidAmount);
    paramIndex++;
  }

  if (setClause.length === 0) {
    return await getInvoiceById(id);
  }

  setClause.push(`updated_at = $${paramIndex}`);
  values.push(new Date());
  paramIndex++;

  const query = `
    UPDATE invoices 
    SET ${setClause.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;
  
  values.push(id);

  const result = await pool.query(query, values);
  
  if (result.rows.length === 0) {
    return null;
  }

  return await getInvoiceById(id);
}

// Delete invoice
export async function deleteInvoice(id: string | number): Promise<boolean> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Delete invoice items first
    await client.query('DELETE FROM invoice_line_items WHERE invoice_id = $1', [id]);
    
    // Delete invoice
    const result = await client.query('DELETE FROM invoices WHERE id = $1', [id]);
    
    await client.query('COMMIT');
    
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Get invoice summary
export async function getInvoiceSummary(): Promise<InvoiceSummary> {
  const query = `
    SELECT 
      COUNT(*) as total_invoices,
      COALESCE(SUM(total_amount), 0) as total_amount,
      COUNT(CASE WHEN invoice_status = 'paid' THEN 1 END) as paid_invoices,
      COALESCE(SUM(CASE WHEN invoice_status = 'paid' THEN total_amount ELSE 0 END), 0) as paid_amount,
      COUNT(CASE WHEN invoice_status != 'paid' AND invoice_status != 'cancelled' THEN 1 END) as unpaid_invoices,
      COALESCE(SUM(CASE WHEN invoice_status != 'paid' AND invoice_status != 'cancelled' THEN total_amount ELSE 0 END), 0) as unpaid_amount,
      COUNT(CASE WHEN invoice_status = 'overdue' THEN 1 END) as overdue_invoices,
      COALESCE(SUM(CASE WHEN invoice_status = 'overdue' THEN total_amount ELSE 0 END), 0) as overdue_amount
    FROM invoices
  `;

  const result = await pool.query(query);
  const row = result.rows[0];

  const parseSafeInt = (v: unknown) => {
    const n = parseInt(String(v), 10);
    return Number.isNaN(n) ? 0 : n;
  };
  const parseSafeFloat = (v: unknown) => {
    const n = parseFloat(String(v));
    return Number.isNaN(n) ? 0 : n;
  };
  return {
    totalInvoices: parseSafeInt(row.total_invoices),
    totalAmount: parseSafeFloat(row.total_amount),
    paidInvoices: parseSafeInt(row.paid_invoices),
    paidAmount: parseSafeFloat(row.paid_amount),
    unpaidInvoices: parseSafeInt(row.unpaid_invoices),
    unpaidAmount: parseSafeFloat(row.unpaid_amount),
    overdueInvoices: parseSafeInt(row.overdue_invoices),
    overdueAmount: parseSafeFloat(row.overdue_amount),
  };
}

// Mark invoice as paid
export async function markInvoiceAsPaid(id: string | number, paidAmount: number): Promise<Invoice | null> {
  const invoice = await getInvoiceById(id);
  if (!invoice) {
    return null;
  }

  const status = paidAmount >= invoice.totalAmount ? 'paid' : 'sent';
  
  return await updateInvoice(id, {
    status,
    paidAmount,
  });
}

// Generate automated invoice for rent
export async function generateRentInvoice(
  tenantId: string,
  roomId: string,
  month: string, // Format: YYYY-MM
  dueDate: string
): Promise<Invoice> {
  // Get room rent amount
  const roomQuery = `
    SELECT r.monthly_rate, r.room_number, b.name as building_name
    FROM rooms r
    LEFT JOIN buildings b ON r.building_id = b.id
    WHERE r.id = $1
  `;
  
  const roomResult = await pool.query(roomQuery, [roomId]);
  
  if (roomResult.rows.length === 0) {
    throw new Error('Room not found');
  }

  const room = roomResult.rows[0];
  
  return await createInvoice({
    tenantId,
    dueDate,
    description: `Monthly rent for ${month}`,
    notes: `Rent invoice for ${room.building_name} ${room.room_number}`,
    items: [
      {
        description: `Monthly Rent - ${month}`,
        quantity: 1,
        unitPrice: parseFloat(room.monthly_rate),
      },
    ],
  });
} 