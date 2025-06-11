import pool from '../db';
import { 
  UtilityAllocationRule, 
  DatabaseUtilityAllocationRule, 
  TenantUtilityBill,
  DatabaseTenantUtilityBill,
  CreateAllocationRuleData,
  AllocationResult,
  CostAllocationHistory 
} from '../../types/database';
import { getAllMeterReadings } from './meterReadings';
import { getUtilityBillById } from './utilities';

// Helper function to map database allocation rule to interface
function mapDatabaseAllocationRule(dbRule: DatabaseUtilityAllocationRule): UtilityAllocationRule {
  return {
    id: dbRule.id,
    buildingId: dbRule.building_id,
    utilityType: dbRule.utility_type,
    allocationMethod: dbRule.allocation_method,
    includeCommonAreas: dbRule.include_common_areas,
    commonAreaPercentage: dbRule.common_area_percentage,
    isActive: dbRule.is_active,
    createdAt: dbRule.created_at,
    updatedAt: dbRule.updated_at
  };
}

// Helper function to map database tenant utility bill to interface
function mapDatabaseTenantUtilityBill(dbBill: DatabaseTenantUtilityBill): TenantUtilityBill {
  return {
    id: dbBill.id,
    tenantId: dbBill.tenant_id,
    buildingId: dbBill.building_id,
    roomId: dbBill.room_id,
    utilityBillId: dbBill.utility_bill_id,
    utilityType: dbBill.utility_type,
    billingPeriodStart: dbBill.billing_period_start,
    billingPeriodEnd: dbBill.billing_period_end,
    totalBuildingCost: dbBill.total_building_cost,
    totalBuildingUsage: dbBill.total_building_usage,
    tenantUsage: dbBill.tenant_usage,
    tenantSharePercentage: dbBill.tenant_share_percentage,
    allocatedAmount: dbBill.allocated_amount,
    allocationMethod: dbBill.allocation_method,
    commonAreaCharge: dbBill.common_area_charge,
    usageCharge: dbBill.usage_charge,
    baseCharge: dbBill.base_charge,
    billStatus: dbBill.bill_status,
    dueDate: dbBill.due_date,
    paidDate: dbBill.paid_date,
    notes: dbBill.notes,
    allocationDetails: dbBill.allocation_details,
    createdAt: dbBill.created_at,
    updatedAt: dbBill.updated_at
  };
}

// Get allocation rules for a building
export async function getAllocationRules(buildingId: string): Promise<UtilityAllocationRule[]> {
  try {
    const query = `
      SELECT * FROM utility_allocation_rules 
      WHERE building_id = $1 AND is_active = true
      ORDER BY utility_type ASC
    `;
    
    const result = await pool.query(query, [buildingId]);
    return result.rows.map(mapDatabaseAllocationRule);
  } catch (error) {
    console.error('Error fetching allocation rules:', error);
    throw error;
  }
}

// Create or update allocation rule
export async function createOrUpdateAllocationRule(ruleData: CreateAllocationRuleData): Promise<UtilityAllocationRule> {
  try {
    const query = `
      INSERT INTO utility_allocation_rules (
        building_id, utility_type, allocation_method, 
        include_common_areas, common_area_percentage
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (building_id, utility_type)
      DO UPDATE SET
        allocation_method = EXCLUDED.allocation_method,
        include_common_areas = EXCLUDED.include_common_areas,
        common_area_percentage = EXCLUDED.common_area_percentage,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const values = [
      ruleData.buildingId,
      ruleData.utilityType,
      ruleData.allocationMethod,
      ruleData.includeCommonAreas ?? true,
      ruleData.commonAreaPercentage ?? 20.0
    ];
    
    const result = await pool.query(query, values);
    return mapDatabaseAllocationRule(result.rows[0]);
  } catch (error) {
    console.error('Error creating/updating allocation rule:', error);
    throw error;
  }
}

// Get active tenants for a building
async function getActiveTenants(buildingId: string) {
  const query = `
    SELECT 
      t.id,
      t.first_name,
      t.last_name,
      t.email,
      r.id as room_id,
      r.room_number,
      r.square_footage,
      ta.id as assignment_id
    FROM tenants t
    JOIN tenant_assignments ta ON t.id = ta.tenant_id
    JOIN rooms r ON ta.room_id = r.id
    WHERE r.building_id = $1 
      AND ta.assignment_status = 'active'
      AND ta.move_out_date IS NULL
    ORDER BY r.room_number ASC
  `;
  
  const result = await pool.query(query, [buildingId]);
  return result.rows;
}

// Calculate cost allocation using different methods
export async function calculateCostAllocation(
  utilityBillId: string,
  allocationMethod: 'equal' | 'usage' | 'room_size' | 'custom',
  includeCommonAreas: boolean = true,
  commonAreaPercentage: number = 20.0
): Promise<AllocationResult[]> {
  try {
    // Get utility bill details
    const utilityBill = await getUtilityBillById(utilityBillId);
    if (!utilityBill) {
      throw new Error('Utility bill not found');
    }

    // Get active tenants for the building
    const tenants = await getActiveTenants(utilityBill.buildingId);
    
    if (tenants.length === 0) {
      throw new Error('No active tenants found for this building');
    }

    let allocations: AllocationResult[] = [];
    const totalAmount = utilityBill.amount;
    const commonAreaAmount = includeCommonAreas ? (totalAmount * commonAreaPercentage / 100) : 0;
    const allocatableAmount = totalAmount - commonAreaAmount;

    switch (allocationMethod) {
      case 'equal':
        allocations = await calculateEqualAllocation(tenants, allocatableAmount, commonAreaAmount);
        break;
      
      case 'usage':
        allocations = await calculateUsageBasedAllocation(
          tenants, 
          utilityBill, 
          allocatableAmount, 
          commonAreaAmount
        );
        break;
      
      case 'room_size':
        allocations = await calculateRoomSizeAllocation(tenants, allocatableAmount, commonAreaAmount);
        break;
      
      default:
        throw new Error(`Unsupported allocation method: ${allocationMethod}`);
    }

    return allocations;
  } catch (error) {
    console.error('Error calculating cost allocation:', error);
    throw error;
  }
}

// Equal allocation method
async function calculateEqualAllocation(
  tenants: any[], 
  allocatableAmount: number, 
  commonAreaAmount: number
): Promise<AllocationResult[]> {
  const perTenantShare = allocatableAmount / tenants.length;
  const commonAreaPerTenant = commonAreaAmount / tenants.length;
  
  return tenants.map(tenant => ({
    tenantId: tenant.id,
    tenantName: `${tenant.first_name} ${tenant.last_name}`,
    roomNumber: tenant.room_number,
    allocatedAmount: perTenantShare + commonAreaPerTenant,
    sharePercentage: 100 / tenants.length,
    commonAreaCharge: commonAreaPerTenant,
    usageCharge: 0,
    baseCharge: perTenantShare,
    allocationDetails: {
      method: 'equal',
      baseShare: perTenantShare,
      commonAreaShare: commonAreaPerTenant,
      totalTenants: tenants.length
    }
  }));
}

// Usage-based allocation method
async function calculateUsageBasedAllocation(
  tenants: any[], 
  utilityBill: any, 
  allocatableAmount: number, 
  commonAreaAmount: number
): Promise<AllocationResult[]> {
  // Get meter readings for the billing period
  const meterReadings = await getAllMeterReadings({
    buildingId: utilityBill.buildingId,
    utilityType: utilityBill.utilityType,
    startDate: utilityBill.billingPeriodStart.toISOString().split('T')[0],
    endDate: utilityBill.billingPeriodEnd.toISOString().split('T')[0]
  });

  // Calculate total usage
  let totalUsage = 0;
  const tenantUsages: { [key: string]: number } = {};

  // Aggregate usage by room/tenant
  for (const reading of meterReadings.readings) {
    if (reading.roomId && reading.usageCalculated > 0) {
      const tenant = tenants.find(t => t.room_id === reading.roomId);
      if (tenant) {
        tenantUsages[tenant.id] = (tenantUsages[tenant.id] || 0) + reading.usageCalculated;
        totalUsage += reading.usageCalculated;
      }
    }
  }

  // If no usage data, fall back to equal allocation
  if (totalUsage === 0) {
    console.warn('No usage data found, falling back to equal allocation');
    return calculateEqualAllocation(tenants, allocatableAmount, commonAreaAmount);
  }

  const commonAreaPerTenant = commonAreaAmount / tenants.length;

  return tenants.map(tenant => {
    const tenantUsage = tenantUsages[tenant.id] || 0;
    const usagePercentage = (tenantUsage / totalUsage) * 100;
    const usageBasedAmount = (tenantUsage / totalUsage) * allocatableAmount;

    return {
      tenantId: tenant.id,
      tenantName: `${tenant.first_name} ${tenant.last_name}`,
      roomNumber: tenant.room_number,
      allocatedAmount: usageBasedAmount + commonAreaPerTenant,
      sharePercentage: usagePercentage,
      usage: tenantUsage,
      commonAreaCharge: commonAreaPerTenant,
      usageCharge: usageBasedAmount,
      baseCharge: 0,
      allocationDetails: {
        method: 'usage',
        tenantUsage,
        totalUsage,
        usagePercentage,
        usageBasedAmount,
        commonAreaShare: commonAreaPerTenant
      }
    };
  });
}

// Room size-based allocation method
async function calculateRoomSizeAllocation(
  tenants: any[], 
  allocatableAmount: number, 
  commonAreaAmount: number
): Promise<AllocationResult[]> {
  const totalSquareFootage = tenants.reduce((sum, tenant) => 
    sum + (tenant.square_footage || 0), 0
  );

  if (totalSquareFootage === 0) {
    console.warn('No room size data found, falling back to equal allocation');
    return calculateEqualAllocation(tenants, allocatableAmount, commonAreaAmount);
  }

  const commonAreaPerTenant = commonAreaAmount / tenants.length;

  return tenants.map(tenant => {
    const roomSize = tenant.square_footage || 0;
    const sizePercentage = (roomSize / totalSquareFootage) * 100;
    const sizeBasedAmount = (roomSize / totalSquareFootage) * allocatableAmount;

    return {
      tenantId: tenant.id,
      tenantName: `${tenant.first_name} ${tenant.last_name}`,
      roomNumber: tenant.room_number,
      allocatedAmount: sizeBasedAmount + commonAreaPerTenant,
      sharePercentage: sizePercentage,
      roomSize,
      commonAreaCharge: commonAreaPerTenant,
      usageCharge: 0,
      baseCharge: sizeBasedAmount,
      allocationDetails: {
        method: 'room_size',
        roomSize,
        totalSquareFootage,
        sizePercentage,
        sizeBasedAmount,
        commonAreaShare: commonAreaPerTenant
      }
    };
  });
}

// Generate tenant utility bills from allocation results
export async function generateTenantUtilityBills(
  utilityBillId: string,
  allocations: AllocationResult[],
  dueDate?: Date
): Promise<TenantUtilityBill[]> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const utilityBill = await getUtilityBillById(utilityBillId);
    if (!utilityBill) {
      throw new Error('Utility bill not found');
    }

    const billDueDate = dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    const generatedBills: TenantUtilityBill[] = [];

    for (const allocation of allocations) {
      // Get tenant's room ID
      const tenantQuery = `
        SELECT ta.room_id
        FROM tenant_assignments ta
        WHERE ta.tenant_id = $1 
          AND ta.assignment_status = 'active'
          AND ta.move_out_date IS NULL
        LIMIT 1
      `;
      const tenantResult = await client.query(tenantQuery, [allocation.tenantId]);
      const roomId = tenantResult.rows[0]?.room_id;

      // Insert tenant utility bill
      const insertQuery = `
        INSERT INTO tenant_utility_bills (
          tenant_id, building_id, room_id, utility_bill_id,
          utility_type, billing_period_start, billing_period_end,
          total_building_cost, tenant_usage, tenant_share_percentage,
          allocated_amount, allocation_method, common_area_charge,
          usage_charge, base_charge, due_date, allocation_details
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `;

      const values = [
        allocation.tenantId,
        utilityBill.buildingId,
        roomId,
        utilityBillId,
        utilityBill.utilityType,
        utilityBill.billingPeriodStart,
        utilityBill.billingPeriodEnd,
        utilityBill.amount,
        allocation.usage || null,
        allocation.sharePercentage,
        allocation.allocatedAmount,
        allocation.allocationDetails.method,
        allocation.commonAreaCharge,
        allocation.usageCharge,
        allocation.baseCharge,
        billDueDate,
        JSON.stringify(allocation.allocationDetails)
      ];

      const result = await client.query(insertQuery, values);
      generatedBills.push(mapDatabaseTenantUtilityBill(result.rows[0]));
    }

    // Create allocation history record
    await client.query(`
      INSERT INTO cost_allocation_history (
        building_id, utility_bill_id, allocation_date, total_amount,
        total_tenants, allocation_method, allocation_summary, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      utilityBill.buildingId,
      utilityBillId,
      new Date(),
      utilityBill.amount,
      allocations.length,
      allocations[0]?.allocationDetails?.method || 'unknown',
      JSON.stringify(allocations),
      'system' // TODO: Get from session
    ]);

    await client.query('COMMIT');
    return generatedBills;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error generating tenant utility bills:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get tenant utility bills
export async function getTenantUtilityBills(filters: {
  tenantId?: string;
  buildingId?: string;
  utilityType?: string;
  billStatus?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
} = {}) {
  try {
    let query = `
      SELECT 
        tub.*,
        t.first_name,
        t.last_name,
        t.email,
        r.room_number,
        b.name as building_name
      FROM tenant_utility_bills tub
      LEFT JOIN tenants t ON tub.tenant_id = t.id
      LEFT JOIN rooms r ON tub.room_id = r.id
      LEFT JOIN buildings b ON tub.building_id = b.id
      WHERE 1=1
    `;

    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.tenantId) {
      query += ` AND tub.tenant_id = $${paramIndex}`;
      params.push(filters.tenantId);
      paramIndex++;
    }

    if (filters.buildingId) {
      query += ` AND tub.building_id = $${paramIndex}`;
      params.push(filters.buildingId);
      paramIndex++;
    }

    if (filters.utilityType) {
      query += ` AND tub.utility_type = $${paramIndex}`;
      params.push(filters.utilityType);
      paramIndex++;
    }

    if (filters.billStatus) {
      query += ` AND tub.bill_status = $${paramIndex}`;
      params.push(filters.billStatus);
      paramIndex++;
    }

    if (filters.startDate) {
      query += ` AND tub.billing_period_start >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      query += ` AND tub.billing_period_end <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }

    query += ` ORDER BY tub.created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
      paramIndex++;
    }

    const result = await pool.query(query, params);

    const bills = result.rows.map((row: any) => ({
      ...mapDatabaseTenantUtilityBill(row),
      tenantName: `${row.first_name} ${row.last_name}`,
      tenantEmail: row.email,
      roomNumber: row.room_number,
      buildingName: row.building_name
    }));

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) 
      FROM tenant_utility_bills tub
      WHERE 1=1
    `;
    const countParams: unknown[] = [];
    let countParamIndex = 1;

    if (filters.tenantId) {
      countQuery += ` AND tub.tenant_id = $${countParamIndex}`;
      countParams.push(filters.tenantId);
      countParamIndex++;
    }

    if (filters.buildingId) {
      countQuery += ` AND tub.building_id = $${countParamIndex}`;
      countParams.push(filters.buildingId);
      countParamIndex++;
    }

    if (filters.utilityType) {
      countQuery += ` AND tub.utility_type = $${countParamIndex}`;
      countParams.push(filters.utilityType);
      countParamIndex++;
    }

    if (filters.billStatus) {
      countQuery += ` AND tub.bill_status = $${countParamIndex}`;
      countParams.push(filters.billStatus);
      countParamIndex++;
    }

    if (filters.startDate) {
      countQuery += ` AND tub.billing_period_start >= $${countParamIndex}`;
      countParams.push(filters.startDate);
      countParamIndex++;
    }

    if (filters.endDate) {
      countQuery += ` AND tub.billing_period_end <= $${countParamIndex}`;
      countParams.push(filters.endDate);
      countParamIndex++;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return {
      bills,
      total,
      limit: filters.limit || total,
      offset: filters.offset || 0
    };
  } catch (error) {
    console.error('Error fetching tenant utility bills:', error);
    throw error;
  }
}

// Update tenant utility bill status
export async function updateTenantUtilityBillStatus(
  billId: string,
  status: 'pending' | 'sent' | 'paid' | 'overdue',
  paidDate?: Date
): Promise<TenantUtilityBill> {
  try {
    const query = `
      UPDATE tenant_utility_bills 
      SET bill_status = $1, paid_date = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [status, paidDate || null, billId]);

    if (result.rows.length === 0) {
      throw new Error('Tenant utility bill not found');
    }

    return mapDatabaseTenantUtilityBill(result.rows[0]);
  } catch (error) {
    console.error('Error updating tenant utility bill status:', error);
    throw error;
  }
} 