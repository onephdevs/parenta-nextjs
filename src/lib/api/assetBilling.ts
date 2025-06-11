import pool from '../db';
import { AssetBilling, DatabaseAssetBilling, CreateAssetBillingData } from '@/types/database';
import { formatDateForDatabase, parseDate } from '@/lib/utils';

// Database transformation helpers
function mapDatabaseAssetBillingToAssetBilling(dbBilling: DatabaseAssetBilling): AssetBilling {
  return {
    id: dbBilling.id,
    assetAssignmentId: dbBilling.asset_assignment_id,
    tenantId: dbBilling.tenant_id,
    billingPeriodStart: parseDate(dbBilling.billing_period_start),
    billingPeriodEnd: parseDate(dbBilling.billing_period_end),
    rentalAmount: dbBilling.rental_amount,
    paymentId: dbBilling.payment_id,
    billingStatus: dbBilling.billing_status,
    dueDate: dbBilling.due_date ? parseDate(dbBilling.due_date) : undefined,
    notes: dbBilling.notes,
    createdAt: parseDate(dbBilling.created_at),
    updatedAt: parseDate(dbBilling.updated_at)
  };
}

// Create asset billing record
export async function createAssetBilling(billingData: CreateAssetBillingData): Promise<AssetBilling> {
  const client = await pool.connect();
  
  try {
    const query = `
      INSERT INTO asset_billing (
        asset_assignment_id, tenant_id, billing_period_start, billing_period_end,
        rental_amount, due_date, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      billingData.assetAssignmentId,
      billingData.tenantId,
      formatDateForDatabase(billingData.billingPeriodStart),
      formatDateForDatabase(billingData.billingPeriodEnd),
      billingData.rentalAmount,
      billingData.dueDate ? formatDateForDatabase(billingData.dueDate) : null,
      billingData.notes
    ];
    
    const result = await client.query(query, values);
    return mapDatabaseAssetBillingToAssetBilling(result.rows[0]);
  } finally {
    client.release();
  }
}

// Get asset billing records for a tenant
export async function getTenantAssetBilling(tenantId: string): Promise<AssetBilling[]> {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT ab.*, a.asset_name, a.asset_type
      FROM asset_billing ab
      INNER JOIN asset_assignments aa ON ab.asset_assignment_id = aa.id
      INNER JOIN assets a ON aa.asset_id = a.id
      WHERE ab.tenant_id = $1
      ORDER BY ab.billing_period_start DESC
    `;
    
    const result = await client.query(query, [tenantId]);
    return result.rows.map(mapDatabaseAssetBillingToAssetBilling);
  } finally {
    client.release();
  }
}

// Get pending asset billing for a tenant (for payment calculation)
export async function getPendingAssetBilling(tenantId: string): Promise<{
  totalAmount: number;
  billingRecords: AssetBilling[];
}> {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT ab.*, a.asset_name, a.asset_type
      FROM asset_billing ab
      INNER JOIN asset_assignments aa ON ab.asset_assignment_id = aa.id
      INNER JOIN assets a ON aa.asset_id = a.id
      WHERE ab.tenant_id = $1 
        AND ab.billing_status IN ('pending', 'billed')
        AND ab.payment_id IS NULL
      ORDER BY ab.due_date ASC
    `;
    
    const result = await client.query(query, [tenantId]);
    const billingRecords = result.rows.map(mapDatabaseAssetBillingToAssetBilling);
    
    const totalAmount = billingRecords.reduce((sum, record) => sum + record.rentalAmount, 0);
    
    return {
      totalAmount,
      billingRecords
    };
  } finally {
    client.release();
  }
}

// Generate monthly asset billing for active assignments
export async function generateMonthlyAssetBilling(
  billingPeriodStart: Date,
  billingPeriodEnd: Date
): Promise<AssetBilling[]> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get all active asset assignments with rental rates
    const query = `
      SELECT 
        aa.id as assignment_id,
        aa.tenant_id,
        aa.monthly_rental_fee,
        a.rental_rate,
        COALESCE(aa.monthly_rental_fee, a.rental_rate) as effective_rate
      FROM asset_assignments aa
      INNER JOIN assets a ON aa.asset_id = a.id
      WHERE aa.assignment_status = 'active'
        AND aa.tenant_id IS NOT NULL
        AND (aa.monthly_rental_fee > 0 OR a.rental_rate > 0)
        AND aa.assignment_date <= $2
        AND (aa.return_date IS NULL OR aa.return_date >= $1)
    `;
    
    const assignmentsResult = await client.query(query, [
      formatDateForDatabase(billingPeriodStart),
      formatDateForDatabase(billingPeriodEnd)
    ]);
    
    const generatedBillings: AssetBilling[] = [];
    
    // Create billing record for each active assignment
    for (const assignment of assignmentsResult.rows) {
      if (assignment.effective_rate > 0) {
        const billingData: CreateAssetBillingData = {
          assetAssignmentId: assignment.assignment_id,
          tenantId: assignment.tenant_id,
          billingPeriodStart,
          billingPeriodEnd,
          rentalAmount: assignment.effective_rate,
          dueDate: new Date(billingPeriodEnd.getTime() + 5 * 24 * 60 * 60 * 1000), // Due 5 days after period end
          notes: `Monthly asset rental billing for ${billingPeriodStart.toISOString().slice(0, 7)}`
        };
        
        const billing = await createAssetBilling(billingData);
        generatedBillings.push(billing);
      }
    }
    
    await client.query('COMMIT');
    return generatedBillings;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error generating monthly asset billing:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Update asset billing status when payment is made
export async function updateAssetBillingPayment(
  billingIds: string[],
  paymentId: string
): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const query = `
      UPDATE asset_billing 
      SET payment_id = $1, billing_status = 'paid', updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($2)
    `;
    
    await client.query(query, [paymentId, billingIds]);
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating asset billing payment:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get asset billing summary for admin dashboard
export async function getAssetBillingSummary(): Promise<{
  totalPending: number;
  totalOverdue: number;
  totalPaid: number;
  monthlyRevenue: number;
}> {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT 
        SUM(CASE WHEN billing_status = 'pending' THEN rental_amount ELSE 0 END) as total_pending,
        SUM(CASE WHEN billing_status = 'overdue' THEN rental_amount ELSE 0 END) as total_overdue,
        SUM(CASE WHEN billing_status = 'paid' THEN rental_amount ELSE 0 END) as total_paid,
        SUM(CASE 
          WHEN billing_status = 'paid' 
            AND billing_period_start >= DATE_TRUNC('month', CURRENT_DATE)
          THEN rental_amount 
          ELSE 0 
        END) as monthly_revenue
      FROM asset_billing
      WHERE billing_period_start >= CURRENT_DATE - INTERVAL '12 months'
    `;
    
    const result = await client.query(query);
    const row = result.rows[0];
    
    return {
      totalPending: parseFloat(row.total_pending || '0'),
      totalOverdue: parseFloat(row.total_overdue || '0'),
      totalPaid: parseFloat(row.total_paid || '0'),
      monthlyRevenue: parseFloat(row.monthly_revenue || '0')
    };
  } finally {
    client.release();
  }
} 