import pool from '../db';
import {
  AllocationMethod,
  UtilityType,
  normalizeAllocationMethod,
  normalizeUtilityType,
} from '@/lib/constants/bills-expenses';

export interface UtilityBillFilters {
  roomId?: string;
  buildingId?: string;
  utilityType?: UtilityType | '';
  billStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  /** When true, only rows with room_id; when false, only building-wide; omit for all */
  unitScoped?: boolean;
  includeChildAllocations?: boolean;
}

export interface UtilityBillRecord {
  id: string;
  buildingId?: string;
  roomId?: string;
  utilityType: UtilityType | string;
  amount: number;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  dueDate: Date;
  billStatus: string;
  providerName: string;
  providerAccountNumber?: string;
  usageAmount?: number;
  usageUnit?: string;
  meterReadingPrevious?: number;
  meterReadingCurrent?: number;
  allocationMethod: AllocationMethod;
  /** TENANT = billable; OWNER = vacant/owner-absorbed (not tenant balance) */
  costBearer: 'TENANT' | 'OWNER';
  parentBillId?: string;
  billUrl?: string;
  notes?: string;
  buildingName?: string;
  roomNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

function mapRow(row: Record<string, unknown>): UtilityBillRecord {
  const roomId = row.room_id ? String(row.room_id) : undefined;
  return {
    id: String(row.id),
    buildingId: row.building_id ? String(row.building_id) : undefined,
    roomId,
    utilityType: normalizeUtilityType(String(row.utility_type)) || String(row.utility_type),
    amount: parseFloat(String(row.amount)),
    billingPeriodStart: new Date(String(row.billing_period_start)),
    billingPeriodEnd: new Date(String(row.billing_period_end)),
    dueDate: new Date(String(row.due_date)),
    billStatus: String(row.bill_status || 'pending'),
    providerName: String(row.provider_name || ''),
    providerAccountNumber: row.provider_account_number
      ? String(row.provider_account_number)
      : undefined,
    usageAmount: row.usage_amount != null ? parseFloat(String(row.usage_amount)) : undefined,
    usageUnit: row.usage_unit ? String(row.usage_unit) : undefined,
    meterReadingPrevious:
      row.meter_reading_previous != null
        ? parseFloat(String(row.meter_reading_previous))
        : undefined,
    meterReadingCurrent:
      row.meter_reading_current != null
        ? parseFloat(String(row.meter_reading_current))
        : undefined,
    allocationMethod: normalizeAllocationMethod(
      row.allocation_method ? String(row.allocation_method) : undefined,
      Boolean(roomId)
    ),
    costBearer:
      String(row.cost_bearer || 'TENANT').toUpperCase() === 'OWNER'
        ? 'OWNER'
        : 'TENANT',
    parentBillId: row.parent_bill_id ? String(row.parent_bill_id) : undefined,
    billUrl: row.bill_url ? String(row.bill_url) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    buildingName: row.building_name ? String(row.building_name) : undefined,
    roomNumber: row.room_number ? String(row.room_number) : undefined,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

async function syncUtilityBillToExpensesBoard(bill: UtilityBillRecord): Promise<void> {
  try {
    const { ensureUtilityBillPipelineCard } = await import('@/lib/api/pipeline');
    await ensureUtilityBillPipelineCard({
      utilityBillId: bill.id,
      utilityType: String(bill.utilityType),
      amount: bill.amount,
      billStatus: bill.billStatus,
      dueDate: bill.dueDate,
      providerName: bill.providerName,
      buildingId: bill.buildingId,
      roomId: bill.roomId,
      buildingName: bill.buildingName,
      roomNumber: bill.roomNumber,
      notes: bill.notes,
    });
  } catch (err) {
    console.error('Expenses pipeline sync after utility bill failed:', err);
  }
}

async function fetchUtilityBillWithNames(id: string): Promise<UtilityBillRecord | null> {
  const named = await pool.query(
    `SELECT ub.*, b.name as building_name, r.room_number
     FROM utility_bills ub
     LEFT JOIN rooms r ON ub.room_id = r.id
     LEFT JOIN buildings b ON COALESCE(ub.building_id, r.building_id) = b.id
     WHERE ub.id = $1`,
    [id]
  );
  if (!named.rows[0]) return null;
  return mapRow(named.rows[0]);
}

export async function getRoomUtilityBillById(id: string): Promise<UtilityBillRecord | null> {
  return fetchUtilityBillWithNames(id);
}

/**
 * List utility bills (unit-specific and/or building-wide).
 * Electric/water per room, or common-area / split building bills.
 */
export async function getRoomUtilityBills(
  filters: UtilityBillFilters = {},
  page = 1,
  limit = 50
) {
  try {
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramCount = 0;

    // Default: hide child allocation slices unless explicitly requested
    if (!filters.includeChildAllocations) {
      conditions.push('ub.parent_bill_id IS NULL');
    }

    if (filters.roomId) {
      paramCount++;
      conditions.push(`ub.room_id = $${paramCount}`);
      values.push(filters.roomId);
    }

    if (filters.buildingId) {
      paramCount++;
      conditions.push(
        `(ub.building_id = $${paramCount} OR r.building_id = $${paramCount})`
      );
      values.push(filters.buildingId);
    }

    if (filters.utilityType) {
      paramCount++;
      conditions.push(`ub.utility_type = $${paramCount}`);
      values.push(filters.utilityType);
    }

    if (filters.billStatus) {
      paramCount++;
      conditions.push(`ub.bill_status = $${paramCount}`);
      values.push(filters.billStatus);
    }

    if (filters.dateFrom) {
      paramCount++;
      conditions.push(`ub.billing_period_start >= $${paramCount}`);
      values.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      paramCount++;
      conditions.push(`ub.billing_period_end <= $${paramCount}`);
      values.push(filters.dateTo);
    }

    if (filters.unitScoped === true) {
      conditions.push('ub.room_id IS NOT NULL');
    } else if (filters.unitScoped === false) {
      conditions.push('ub.room_id IS NULL');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) as count
      FROM utility_bills ub
      LEFT JOIN rooms r ON ub.room_id = r.id
      LEFT JOIN buildings b ON COALESCE(ub.building_id, r.building_id) = b.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    paramCount++;
    const limitParam = paramCount;
    paramCount++;
    const offsetParam = paramCount;

    const query = `
      SELECT
        ub.*,
        b.name as building_name,
        r.room_number,
        r.id as room_id_resolved
      FROM utility_bills ub
      LEFT JOIN rooms r ON ub.room_id = r.id
      LEFT JOIN buildings b ON COALESCE(ub.building_id, r.building_id) = b.id
      ${whereClause}
      ORDER BY ub.due_date DESC, ub.created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const result = await pool.query(query, [...values, limit, offset]);
    const bills = result.rows.map(mapRow);

    return {
      bills,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  } catch (error) {
    console.error('Error fetching utility bills:', error);
    throw new Error('Failed to fetch utility bills');
  }
}

export interface CreateUtilityBillInput {
  buildingId?: string;
  roomId?: string | null;
  utilityType: UtilityType;
  amount: number;
  billingPeriodStart: Date | string;
  billingPeriodEnd: Date | string;
  dueDate: Date | string;
  providerName?: string;
  providerAccountNumber?: string;
  usageAmount?: number;
  usageUnit?: string;
  meterReadingPrevious?: number;
  meterReadingCurrent?: number;
  allocationMethod?: AllocationMethod;
  billStatus?: 'pending' | 'paid' | 'overdue' | 'disputed';
  billUrl?: string;
  notes?: string;
  /** When true and SHARED_MANUAL / split_evenly + building-wide, create per-unit child rows */
  distributeAcrossUnits?: boolean;
  /** Optional floor filter for equal-split (e.g. 3rd-floor shared water) */
  floorNumber?: number | string | null;
  /** Named unit group — preferred over floor filter when set */
  utilityUnitGroupId?: string | null;
}

/**
 * Create a utility bill. roomId may be null for building-wide / common-area bills.
 */
export async function createRoomUtilityBill(billData: CreateUtilityBillInput) {
  const client = await pool.connect();
  let parentId = '';
  try {
    await client.query('BEGIN');

    let buildingId = billData.buildingId || null;
    const roomId = billData.roomId || null;
    let roomStatus: string | null = null;

    if (roomId) {
      const roomQuery = await client.query(
        'SELECT building_id, room_status FROM rooms WHERE id = $1',
        [roomId]
      );
      if (roomQuery.rows.length === 0) {
        throw new Error('Room not found');
      }
      buildingId = roomQuery.rows[0].building_id;
      roomStatus = roomQuery.rows[0].room_status
        ? String(roomQuery.rows[0].room_status)
        : null;
    }

    if (!buildingId) {
      throw new Error('Building is required for utility bills');
    }

    // Vacant units: provider minimums still apply, but cost is owner-absorbed
    let costBearer: 'TENANT' | 'OWNER' = 'TENANT';
    if (roomId) {
      const activeTenant = await client.query(
        `SELECT 1 FROM tenant_room_assignments
         WHERE room_id = $1
           AND assignment_status = 'active'
           AND (end_date IS NULL OR end_date >= CURRENT_DATE)
         LIMIT 1`,
        [roomId]
      );
      if (
        activeTenant.rows.length === 0 ||
        String(roomStatus || '').toLowerCase() === 'vacant'
      ) {
        costBearer = 'OWNER';
      }
    }

    const allocationMethod = normalizeAllocationMethod(
      billData.allocationMethod,
      Boolean(roomId)
    );

    let usageAmount = billData.usageAmount ?? null;
    if (
      usageAmount == null &&
      billData.meterReadingPrevious != null &&
      billData.meterReadingCurrent != null
    ) {
      usageAmount = billData.meterReadingCurrent - billData.meterReadingPrevious;
    }

    const providerName =
      billData.providerName?.trim() ||
      (billData.utilityType === 'electricity' ? 'Electric utility' : 'Water utility');

    const utilityUnitGroupId =
      billData.utilityUnitGroupId && String(billData.utilityUnitGroupId).trim()
        ? String(billData.utilityUnitGroupId).trim()
        : null;

    if (utilityUnitGroupId) {
      const groupCheck = await client.query(
        `SELECT id FROM utility_unit_groups
         WHERE id = $1 AND building_id = $2 AND COALESCE(is_active, true) = true`,
        [utilityUnitGroupId, buildingId]
      );
      if (groupCheck.rows.length === 0) {
        throw new Error('Utility unit group not found for this building');
      }
    }

    const insertQuery = `
      INSERT INTO utility_bills (
        building_id, room_id, utility_type, provider_name, provider_account_number,
        billing_period_start, billing_period_end, due_date, amount,
        usage_amount, usage_unit, meter_reading_previous, meter_reading_current,
        allocation_method, bill_status, bill_url, notes, cost_bearer,
        utility_unit_group_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING *
    `;

    const values = [
      buildingId,
      roomId,
      billData.utilityType,
      providerName,
      billData.providerAccountNumber || null,
      billData.billingPeriodStart,
      billData.billingPeriodEnd,
      billData.dueDate,
      billData.amount,
      usageAmount,
      billData.usageUnit ||
        (billData.utilityType === 'electricity' ? 'kWh' : 'm³'),
      billData.meterReadingPrevious ?? null,
      billData.meterReadingCurrent ?? null,
      allocationMethod,
      billData.billStatus || 'pending',
      billData.billUrl || null,
      billData.notes || null,
      costBearer,
      utilityUnitGroupId,
    ];

    const result = await client.query(insertQuery, values);
    const parent = mapRow(result.rows[0]);
    parentId = parent.id;

    // Equal-split: create one child bill per room (group → floor → all)
    const shouldDistribute =
      !roomId &&
      billData.distributeAcrossUnits !== false &&
      (allocationMethod === 'split_evenly' ||
        allocationMethod === 'SHARED_MANUAL');

    if (shouldDistribute) {
      let roomsResult;
      let splitLabel = '';

      if (utilityUnitGroupId) {
        roomsResult = await client.query(
          `SELECT r.id, r.room_number, r.room_status,
                  EXISTS (
                    SELECT 1 FROM tenant_room_assignments tra
                    WHERE tra.room_id = r.id
                      AND tra.assignment_status = 'active'
                      AND (tra.end_date IS NULL OR tra.end_date >= CURRENT_DATE)
                  ) AS has_tenant
           FROM utility_unit_group_members m
           JOIN rooms r ON r.id = m.room_id
           WHERE m.group_id = $1
             AND COALESCE(r.is_active, true) = true
             AND COALESCE(r.is_revenue_unit, true) = true
           ORDER BY r.room_number`,
          [utilityUnitGroupId]
        );
        const groupName = await client.query(
          `SELECT name FROM utility_unit_groups WHERE id = $1`,
          [utilityUnitGroupId]
        );
        splitLabel = `, group ${groupName.rows[0]?.name || utilityUnitGroupId}`;
      } else {
        const floorFilter =
          billData.floorNumber != null &&
          String(billData.floorNumber).trim() !== ''
            ? `AND r.floor_number = $2`
            : '';
        const roomParams: unknown[] =
          floorFilter !== ''
            ? [buildingId, Number(billData.floorNumber)]
            : [buildingId];

        roomsResult = await client.query(
          `SELECT r.id, r.room_number, r.room_status,
                  EXISTS (
                    SELECT 1 FROM tenant_room_assignments tra
                    WHERE tra.room_id = r.id
                      AND tra.assignment_status = 'active'
                      AND (tra.end_date IS NULL OR tra.end_date >= CURRENT_DATE)
                  ) AS has_tenant
           FROM rooms r
           WHERE r.building_id = $1 AND COALESCE(r.is_active, true) = true
             AND COALESCE(r.is_revenue_unit, true) = true
             ${floorFilter}
           ORDER BY r.room_number`,
          roomParams
        );
        if (floorFilter) {
          splitLabel = `, floor ${billData.floorNumber}`;
        }
      }

      const rooms = roomsResult.rows;
      if (rooms.length > 0) {
        const share = Math.round((billData.amount / rooms.length) * 100) / 100;
        let allocated = 0;
        for (let i = 0; i < rooms.length; i++) {
          const isLast = i === rooms.length - 1;
          const amount = isLast
            ? Math.round((billData.amount - allocated) * 100) / 100
            : share;
          allocated += amount;
          const childBearer =
            !rooms[i].has_tenant ||
            String(rooms[i].room_status || '').toLowerCase() === 'vacant'
              ? 'OWNER'
              : 'TENANT';

          await client.query(
            `INSERT INTO utility_bills (
              building_id, room_id, utility_type, provider_name, provider_account_number,
              billing_period_start, billing_period_end, due_date, amount,
              usage_unit, allocation_method, parent_bill_id, bill_status, notes, cost_bearer,
              utility_unit_group_id
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
            [
              buildingId,
              rooms[i].id,
              billData.utilityType,
              providerName,
              billData.providerAccountNumber || null,
              billData.billingPeriodStart,
              billData.billingPeriodEnd,
              billData.dueDate,
              amount,
              billData.usageUnit ||
                (billData.utilityType === 'electricity' ? 'kWh' : 'm³'),
              'SHARED_MANUAL',
              parent.id,
              billData.billStatus || 'pending',
              `Equal split of building bill (${rooms.length} units${splitLabel})${
                childBearer === 'OWNER' ? ' — owner-absorbed (vacant)' : ''
              }`,
              childBearer,
              utilityUnitGroupId,
            ]
          );
        }
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating utility bill:', error);
    throw error;
  } finally {
    client.release();
  }

  try {
    const named = await fetchUtilityBillWithNames(parentId);
    if (!named) {
      throw new Error('Failed to fetch created utility bill');
    }
    await syncUtilityBillToExpensesBoard(named);
    return named;
  } catch (error) {
    console.error('Error fetching created utility bill:', error);
    throw error;
  }
}

export async function updateRoomUtilityBill(
  id: string,
  updates: Partial<{
    amount: number;
    billingPeriodStart: Date | string;
    billingPeriodEnd: Date | string;
    dueDate: Date | string;
    providerName: string;
    providerAccountNumber?: string;
    usageAmount?: number;
    usageUnit?: string;
    meterReadingPrevious?: number;
    meterReadingCurrent?: number;
    allocationMethod?: AllocationMethod;
    billStatus?: 'pending' | 'paid' | 'overdue' | 'disputed';
    billUrl?: string;
    notes?: string;
    roomId?: string | null;
  }>
) {
  try {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramCount = 0;

    const fieldMap: Array<[keyof typeof updates, string]> = [
      ['amount', 'amount'],
      ['billingPeriodStart', 'billing_period_start'],
      ['billingPeriodEnd', 'billing_period_end'],
      ['dueDate', 'due_date'],
      ['providerName', 'provider_name'],
      ['providerAccountNumber', 'provider_account_number'],
      ['usageAmount', 'usage_amount'],
      ['usageUnit', 'usage_unit'],
      ['meterReadingPrevious', 'meter_reading_previous'],
      ['meterReadingCurrent', 'meter_reading_current'],
      ['allocationMethod', 'allocation_method'],
      ['billStatus', 'bill_status'],
      ['billUrl', 'bill_url'],
      ['notes', 'notes'],
      ['roomId', 'room_id'],
    ];

    for (const [key, column] of fieldMap) {
      if (updates[key] !== undefined) {
        paramCount++;
        setClauses.push(`${column} = $${paramCount}`);
        values.push(updates[key] === '' ? null : updates[key]);
      }
    }

    if (setClauses.length === 0) {
      throw new Error('No fields to update');
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    paramCount++;
    values.push(id);

    const query = `
      UPDATE utility_bills
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Utility bill not found');
    }

    const updated = await fetchUtilityBillWithNames(id);
    const bill = updated || mapRow(result.rows[0]);
    await syncUtilityBillToExpensesBoard(bill);
    return bill;
  } catch (error) {
    console.error('Error updating utility bill:', error);
    throw error;
  }
}

export async function deleteRoomUtilityBill(id: string) {
  try {
    // Child allocation rows cascade via parent_bill_id SET NULL — delete children first
    await pool.query('DELETE FROM utility_bills WHERE parent_bill_id = $1', [id]);
    const result = await pool.query(
      'DELETE FROM utility_bills WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      throw new Error('Utility bill not found');
    }
    return { success: true };
  } catch (error) {
    console.error('Error deleting utility bill:', error);
    throw error;
  }
}
