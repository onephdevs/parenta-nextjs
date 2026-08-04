/**
 * Late Fee Service
 * Handles automatic late fee calculation, application, and management
 */

import { Pool } from 'pg';
import pool from '../db';
import {
  LateFeeSettings,
  LateFeeApplication,
  LateFeeTier,
  OverdueInvoiceForLateFee,
  LateFeeCalculationResult,
  CreateLateFeeSettingsData,
  CreateLateFeeTierData,
} from '@/types/financial';

/**
 * Calculate late fee for a specific invoice
 */
export async function calculateLateFeeForInvoice(
  invoiceId: string,
  settingId: string,
  dbPool: Pool = pool
): Promise<number> {
  const result = await dbPool.query(
    'SELECT calculate_late_fee($1, $2) as fee_amount',
    [invoiceId, settingId]
  );
  
  return parseFloat(result.rows[0]?.fee_amount || '0');
}

/**
 * Get all overdue invoices eligible for late fees
 */
export async function getOverdueInvoicesForLateFees(
  dbPool: Pool = pool
): Promise<OverdueInvoiceForLateFee[]> {
  const result = await dbPool.query<OverdueInvoiceForLateFee>(
    'SELECT * FROM get_overdue_invoices_for_late_fees()'
  );
  
  return result.rows;
}

/**
 * Calculate late fees for all eligible invoices (batched settings lookup)
 */
export async function calculateAllLateFees(
  dbPool: Pool = pool
): Promise<LateFeeCalculationResult[]> {
  const overdueInvoices = await getOverdueInvoicesForLateFees(dbPool);
  if (overdueInvoices.length === 0) return [];

  const settingIds = [
    ...new Set(
      overdueInvoices
        .map((i) => i.applicable_setting_id)
        .filter(Boolean)
    ),
  ];

  const settingsResult = await dbPool.query<LateFeeSettings>(
    `SELECT * FROM late_fee_settings WHERE id = ANY($1::uuid[])`,
    [settingIds]
  );
  const settingsById = new Map(
    settingsResult.rows.map((s) => [String(s.id), s])
  );

  // Batch fee amounts: one DB function call still required per invoice
  // (Postgres function calculate_late_fee), but settings are no longer N+1.
  const calculations: LateFeeCalculationResult[] = [];

  const feeResults = await Promise.all(
    overdueInvoices.map(async (invoice) => {
      const feeAmount = await calculateLateFeeForInvoice(
        invoice.invoice_id,
        invoice.applicable_setting_id,
        dbPool
      );
      return { invoice, feeAmount };
    })
  );

  for (const { invoice, feeAmount } of feeResults) {
    if (feeAmount <= 0) continue;
    const setting = settingsById.get(String(invoice.applicable_setting_id));
    calculations.push({
      invoice_id: invoice.invoice_id,
      tenant_id: invoice.tenant_id,
      fee_amount: feeAmount,
      days_overdue: invoice.days_overdue,
      original_amount: invoice.outstanding_amount,
      calculation_method: setting?.fee_type || 'unknown',
      setting_used: setting,
    });
  }

  return calculations;
}

/**
 * Apply late fee to an invoice (creates a late fee application record and optionally an invoice)
 */
export async function applyLateFeeToInvoice(
  invoiceId: string,
  settingId: string,
  createInvoice: boolean = true,
  dbPool: Pool = pool
): Promise<LateFeeApplication> {
  const client = await dbPool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Calculate the fee
    const feeAmount = await calculateLateFeeForInvoice(invoiceId, settingId, client);
    
    if (feeAmount === 0) {
      throw new Error('No late fee applicable for this invoice');
    }
    
    // Get invoice and setting details
    const invoiceResult = await client.query(
      `SELECT 
        i.*, 
        i.total_amount as original_amount,
        CURRENT_DATE - i.due_date AS days_overdue
      FROM invoices i 
      WHERE i.id = $1`,
      [invoiceId]
    );
    
    if (invoiceResult.rows.length === 0) {
      throw new Error('Invoice not found');
    }
    
    const invoice = invoiceResult.rows[0];
    
    const settingResult = await client.query<LateFeeSettings>(
      'SELECT * FROM late_fee_settings WHERE id = $1',
      [settingId]
    );
    
    if (settingResult.rows.length === 0) {
      throw new Error('Late fee setting not found');
    }
    
    const setting = settingResult.rows[0];
    
    let lateFeeInvoiceId: string | null = null;
    
    // Create a late fee invoice if requested
    if (createInvoice) {
      const invoiceNumberResult = await client.query(
        `SELECT 'INV-' || LPAD(CAST(COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)), 0) + 1 AS TEXT), 6, '0') AS next_number
         FROM invoices WHERE invoice_number LIKE 'INV-%'`
      );
      const invoiceNumber = invoiceNumberResult.rows[0].next_number;
      
      const newInvoiceResult = await client.query(
        `INSERT INTO invoices (
          tenant_id, invoice_number, invoice_status, issue_date, due_date,
          total_amount, amount_paid, description
        ) VALUES ($1, $2, 'sent', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', $3, 0, $4)
        RETURNING id`,
        [
          invoice.tenant_id,
          invoiceNumber,
          feeAmount,
          `Late fee for invoice ${invoice.invoice_number} (${invoice.days_overdue} days overdue)`,
        ]
      );
      
      lateFeeInvoiceId = newInvoiceResult.rows[0].id;
    }
    
    // Create the late fee application record
    const applicationResult = await client.query<LateFeeApplication>(
      `INSERT INTO late_fee_applications (
        invoice_id, tenant_id, late_fee_setting_id,
        fee_amount, calculation_method, days_overdue, original_amount,
        status, applied_at, late_fee_invoice_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'applied', CURRENT_TIMESTAMP, $8)
      RETURNING *`,
      [
        invoiceId,
        invoice.tenant_id,
        settingId,
        feeAmount,
        setting.fee_type,
        invoice.days_overdue,
        invoice.original_amount,
        lateFeeInvoiceId,
      ]
    );
    
    // Update original invoice status to 'overdue' if not already
    await client.query(
      `UPDATE invoices 
       SET invoice_status = 'overdue' 
       WHERE id = $1 AND invoice_status != 'overdue'`,
      [invoiceId]
    );
    
    await client.query('COMMIT');
    
    return applicationResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Apply late fees to multiple invoices
 */
export async function applyLateFees(
  invoiceIds?: string[],
  dryRun: boolean = false,
  dbPool: Pool = pool
): Promise<{
  success: boolean;
  fees_applied: number;
  total_fee_amount: number;
  applications: LateFeeApplication[];
  errors: { invoice_id: string; error: string }[];
}> {
  const applications: LateFeeApplication[] = [];
  const errors: { invoice_id: string; error: string }[] = [];
  let totalFeeAmount = 0;
  
  // Get invoices to process
  let invoicesToProcess: OverdueInvoiceForLateFee[];
  
  if (invoiceIds && invoiceIds.length > 0) {
    // Process specific invoices
    const result = await dbPool.query<OverdueInvoiceForLateFee>(
      `SELECT * FROM get_overdue_invoices_for_late_fees()
       WHERE invoice_id = ANY($1)`,
      [invoiceIds]
    );
    invoicesToProcess = result.rows;
  } else {
    // Process all eligible invoices
    invoicesToProcess = await getOverdueInvoicesForLateFees(dbPool);
  }
  
  for (const invoice of invoicesToProcess) {
    try {
      if (dryRun) {
        // Just calculate, don't apply
        const feeAmount = await calculateLateFeeForInvoice(
          invoice.invoice_id,
          invoice.applicable_setting_id,
          dbPool
        );
        
        if (feeAmount > 0) {
          totalFeeAmount += feeAmount;
          applications.push({
            id: 'dry-run',
            invoice_id: invoice.invoice_id,
            tenant_id: invoice.tenant_id,
            late_fee_setting_id: invoice.applicable_setting_id,
            fee_amount: feeAmount,
            calculation_method: 'dry-run',
            days_overdue: invoice.days_overdue,
            original_amount: invoice.outstanding_amount,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as LateFeeApplication);
        }
      } else {
        // Actually apply the late fee
        const application = await applyLateFeeToInvoice(
          invoice.invoice_id,
          invoice.applicable_setting_id,
          true,
          dbPool
        );
        
        applications.push(application);
        totalFeeAmount += application.fee_amount;
      }
    } catch (error) {
      errors.push({
        invoice_id: invoice.invoice_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  return {
    success: errors.length === 0,
    fees_applied: applications.length,
    total_fee_amount: totalFeeAmount,
    applications,
    errors,
  };
}

/**
 * Apply late fees only for settings with auto_apply enabled.
 * Optionally scoped to a single tenant (e.g. when they load their balance).
 */
export async function applyAutoLateFees(options?: {
  tenantId?: string;
  dryRun?: boolean;
  dbPool?: Pool;
}): Promise<{
  success: boolean;
  fees_applied: number;
  total_fee_amount: number;
  applications: LateFeeApplication[];
  errors: { invoice_id: string; error: string }[];
}> {
  const dbPool = options?.dbPool ?? pool;
  const dryRun = options?.dryRun ?? false;

  let invoicesToProcess = await getOverdueInvoicesForLateFees(dbPool);

  if (options?.tenantId) {
    invoicesToProcess = invoicesToProcess.filter(
      (inv) => String(inv.tenant_id) === String(options.tenantId)
    );
  }

  if (invoicesToProcess.length === 0) {
    return {
      success: true,
      fees_applied: 0,
      total_fee_amount: 0,
      applications: [],
      errors: [],
    };
  }

  const settingIds = [
    ...new Set(invoicesToProcess.map((i) => String(i.applicable_setting_id)).filter(Boolean)),
  ];

  const settingsResult = await dbPool.query<{ id: string; auto_apply: boolean }>(
    `SELECT id, auto_apply FROM late_fee_settings WHERE id = ANY($1::uuid[]) AND is_active = true`,
    [settingIds]
  );
  const autoApplyIds = new Set(
    settingsResult.rows.filter((s) => s.auto_apply).map((s) => String(s.id))
  );

  const eligibleIds = invoicesToProcess
    .filter((inv) => autoApplyIds.has(String(inv.applicable_setting_id)))
    .map((inv) => String(inv.invoice_id));

  if (eligibleIds.length === 0) {
    return {
      success: true,
      fees_applied: 0,
      total_fee_amount: 0,
      applications: [],
      errors: [],
    };
  }

  return applyLateFees(eligibleIds, dryRun, dbPool);
}

/**
 * Waive a late fee application
 */
export async function waiveLateFee(
  applicationId: string,
  reason: string,
  waivedBy: string,
  dbPool: Pool = pool
): Promise<LateFeeApplication> {
  const result = await dbPool.query<LateFeeApplication>(
    `UPDATE late_fee_applications 
     SET status = 'waived', 
         waived_at = CURRENT_TIMESTAMP,
         waived_by = $2,
         waived_reason = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [applicationId, waivedBy, reason]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Late fee application not found');
  }
  
  // If a late fee invoice was created, cancel it
  if (result.rows[0].late_fee_invoice_id) {
    await dbPool.query(
      `UPDATE invoices 
       SET invoice_status = 'cancelled' 
       WHERE id = $1`,
      [result.rows[0].late_fee_invoice_id]
    );
  }
  
  return result.rows[0];
}

/**
 * Create a new late fee setting
 */
export async function createLateFeeSettings(
  data: CreateLateFeeSettingsData,
  createdBy?: string,
  dbPool: Pool = pool
): Promise<LateFeeSettings> {
  const client = await dbPool.connect();
  
  try {
    await client.query('BEGIN');
    
    const result = await client.query<LateFeeSettings>(
      `INSERT INTO late_fee_settings (
        building_id, name, description,
        fee_type, percentage_amount, flat_rate_amount,
        grace_period_days, apply_after_days,
        is_recurring, recurring_interval_days, max_occurrences,
        max_fee_amount, min_invoice_amount,
        is_active, auto_apply, send_notification,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        data.building_id || null,
        data.name,
        data.description || null,
        data.fee_type,
        data.percentage_amount || null,
        data.flat_rate_amount || null,
        data.grace_period_days,
        data.apply_after_days,
        data.is_recurring || false,
        data.recurring_interval_days || null,
        data.max_occurrences || null,
        data.max_fee_amount || null,
        data.min_invoice_amount || null,
        data.is_active !== undefined ? data.is_active : true,
        data.auto_apply || false,
        data.send_notification !== undefined ? data.send_notification : true,
        createdBy || null,
      ]
    );
    
    const settingId = result.rows[0].id;
    
    // If tiered, create the tiers
    if (data.fee_type === 'tiered' && data.tiers && data.tiers.length > 0) {
      for (const tier of data.tiers) {
        await client.query(
          `INSERT INTO late_fee_tiers (
            late_fee_setting_id, min_days_overdue, max_days_overdue,
            fee_type, percentage_amount, flat_rate_amount, tier_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            settingId,
            tier.min_days_overdue,
            tier.max_days_overdue || null,
            tier.fee_type,
            tier.percentage_amount || null,
            tier.flat_rate_amount || null,
            tier.tier_order,
          ]
        );
      }
    }
    
    await client.query('COMMIT');
    
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get all late fee settings
 */
export async function getAllLateFeeSettings(
  buildingId?: string,
  dbPool: Pool = pool
): Promise<LateFeeSettings[]> {
  let query = 'SELECT * FROM late_fee_settings';
  const params: any[] = [];
  
  if (buildingId) {
    query += ' WHERE building_id = $1';
    params.push(buildingId);
  }
  
  query += ' ORDER BY created_at DESC';
  
  const result = await dbPool.query<LateFeeSettings>(query, params);
  return result.rows;
}

/**
 * Get late fee applications for a tenant
 */
export async function getLateFeeApplicationsForTenant(
  tenantId: string,
  dbPool: Pool = pool
): Promise<LateFeeApplication[]> {
  const result = await dbPool.query<LateFeeApplication>(
    `SELECT lfa.*, i.invoice_number 
     FROM late_fee_applications lfa
     JOIN invoices i ON i.id = lfa.invoice_id
     WHERE lfa.tenant_id = $1
     ORDER BY lfa.created_at DESC`,
    [tenantId]
  );
  
  return result.rows;
}

/**
 * Get late fee applications for an invoice
 */
export async function getLateFeeApplicationsForInvoice(
  invoiceId: string,
  dbPool: Pool = pool
): Promise<LateFeeApplication[]> {
  const result = await dbPool.query<LateFeeApplication>(
    'SELECT * FROM late_fee_applications WHERE invoice_id = $1 ORDER BY created_at DESC',
    [invoiceId]
  );
  
  return result.rows;
}

