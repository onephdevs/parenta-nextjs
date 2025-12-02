/**
 * Additional report functions to append to reports-service.ts
 * These functions were added separately due to file size
 */

import pool from '@/lib/db';

/**
 * Generate Deposit Received Report
 */
export async function generateDepositReport(
  startDate: string,
  endDate: string,
  periodType: 'monthly' | 'semi-annual' | 'annual' = 'monthly'
): Promise<DepositReportData> {
  const client = await pool.connect();
  
  try {
    // Get deposit transactions
    const depositsQuery = `
      SELECT 
        dl.id,
        dl.tenant_id,
        dl.amount,
        dl.transaction_type,
        dl.transaction_date,
        dl.description,
        t.first_name,
        t.last_name,
        tra.room_id,
        r.building_id,
        b.name as building_name
      FROM deposit_ledger dl
      LEFT JOIN tenants t ON dl.tenant_id = t.id
      LEFT JOIN tenant_room_assignments tra ON t.id = tra.tenant_id AND tra.assignment_status = 'active'
      LEFT JOIN rooms r ON tra.room_id = r.id
      LEFT JOIN buildings b ON r.building_id = b.id
      WHERE dl.transaction_date BETWEEN $1 AND $2
      ORDER BY dl.transaction_date ASC
    `;
    
    const depositsResult = await client.query(depositsQuery, [startDate, endDate]);
    const transactions = depositsResult.rows;
    
    // Calculate summary
    const totalDepositsReceived = transactions
      .filter((t: any) => t.transaction_type === 'deposit')
      .reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0);
    
    const totalRefundsIssued = transactions
      .filter((t: any) => t.transaction_type === 'refund')
      .reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0);
    
    const netDepositBalance = totalDepositsReceived - totalRefundsIssued;
    const totalTransactions = transactions.length;
    const tenantCount = new Set(transactions.map((t: any) => t.tenant_id).filter(Boolean)).size;
    
    // Group by period
    const periodMap = new Map<string, {
      depositsReceived: number;
      refundsIssued: number;
      tenantIds: Set<string>;
    }>();
    
    transactions.forEach((transaction: any) => {
      const date = new Date(transaction.transaction_date);
      let periodKey: string;
      
      switch (periodType) {
        case 'semi-annual':
          const half = date.getMonth() < 6 ? 'H1' : 'H2';
          periodKey = `${half} ${date.getFullYear()}`;
          break;
        case 'annual':
          periodKey = date.getFullYear().toString();
          break;
        default:
          periodKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
      
      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, {
          depositsReceived: 0,
          refundsIssued: 0,
          tenantIds: new Set(),
        });
      }
      
      const period = periodMap.get(periodKey)!;
      if (transaction.transaction_type === 'deposit') {
        period.depositsReceived += parseFloat(transaction.amount || 0);
      } else if (transaction.transaction_type === 'refund') {
        period.refundsIssued += parseFloat(transaction.amount || 0);
      }
      
      if (transaction.tenant_id) {
        period.tenantIds.add(transaction.tenant_id);
      }
    });
    
    const byPeriod = Array.from(periodMap.entries())
      .map(([period, data]) => ({
        period,
        depositsReceived: data.depositsReceived,
        refundsIssued: data.refundsIssued,
        netAmount: data.depositsReceived - data.refundsIssued,
        tenantCount: data.tenantIds.size,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
    
    // Group by building
    const buildingMap = new Map<string, {
      buildingName: string;
      depositsReceived: number;
      refundsIssued: number;
    }>();
    
    transactions.forEach((transaction: any) => {
      if (!transaction.building_id) return;
      
      const buildingKey = transaction.building_id;
      if (!buildingMap.has(buildingKey)) {
        buildingMap.set(buildingKey, {
          buildingName: transaction.building_name || 'Unknown',
          depositsReceived: 0,
          refundsIssued: 0,
        });
      }
      
      const building = buildingMap.get(buildingKey)!;
      if (transaction.transaction_type === 'deposit') {
        building.depositsReceived += parseFloat(transaction.amount || 0);
      } else if (transaction.transaction_type === 'refund') {
        building.refundsIssued += parseFloat(transaction.amount || 0);
      }
    });
    
    const byBuilding = Array.from(buildingMap.entries())
      .map(([buildingId, data]) => ({
        buildingId,
        buildingName: data.buildingName,
        depositsReceived: data.depositsReceived,
        refundsIssued: data.refundsIssued,
        netAmount: data.depositsReceived - data.refundsIssued,
      }))
      .sort((a, b) => b.depositsReceived - a.depositsReceived);
    
    // Group by tenant
    const tenantMap = new Map<string, {
      tenantName: string;
      depositsReceived: number;
      refundsIssued: number;
    }>();
    
    transactions.forEach((transaction: any) => {
      if (!transaction.tenant_id) return;
      
      const tenantKey = transaction.tenant_id;
      if (!tenantMap.has(tenantKey)) {
        tenantMap.set(tenantKey, {
          tenantName: transaction.first_name && transaction.last_name
            ? `${transaction.first_name} ${transaction.last_name}`
            : 'Unknown',
          depositsReceived: 0,
          refundsIssued: 0,
        });
      }
      
      const tenant = tenantMap.get(tenantKey)!;
      if (transaction.transaction_type === 'deposit') {
        tenant.depositsReceived += parseFloat(transaction.amount || 0);
      } else if (transaction.transaction_type === 'refund') {
        tenant.refundsIssued += parseFloat(transaction.amount || 0);
      }
    });
    
    const byTenant = Array.from(tenantMap.entries())
      .map(([tenantId, data]) => ({
        tenantId,
        tenantName: data.tenantName,
        depositsReceived: data.depositsReceived,
        refundsIssued: data.refundsIssued,
        netAmount: data.depositsReceived - data.refundsIssued,
      }))
      .sort((a, b) => b.depositsReceived - a.depositsReceived)
      .slice(0, 50);
    
    return {
      summary: {
        totalDepositsReceived,
        totalRefundsIssued,
        netDepositBalance,
        totalTransactions,
        tenantCount,
        period: `${startDate} to ${endDate}`,
      },
      byPeriod,
      byBuilding,
      byTenant,
    };
  } finally {
    client.release();
  }
}

/**
 * Generate Vacant Rooms Report
 */
export async function generateVacantRoomsReport(
  filters?: { buildingId?: string }
): Promise<VacantRoomsReportData> {
  const client = await pool.connect();
  
  try {
    let query = `
      SELECT 
        r.id,
        r.room_number,
        r.floor_number,
        r.room_type,
        r.monthly_rate,
        r.room_status,
        b.id as building_id,
        b.name as building_name,
        b.address_line1,
        b.city,
        CASE 
          WHEN tra.end_date IS NOT NULL THEN EXTRACT(DAY FROM CURRENT_DATE - tra.end_date)
          ELSE NULL
        END as days_vacant,
        t.first_name || ' ' || t.last_name as last_tenant_name
      FROM rooms r
      INNER JOIN buildings b ON r.building_id = b.id
      LEFT JOIN tenant_room_assignments tra ON r.id = tra.room_id 
        AND tra.assignment_status = 'active'
      LEFT JOIN tenants t ON tra.tenant_id = t.id
      WHERE r.room_status = 'vacant' AND r.is_active = true
    `;
    
    const params: any[] = [];
    if (filters?.buildingId) {
      query += ` AND b.id = $1`;
      params.push(filters.buildingId);
    }
    
    query += ` ORDER BY b.name, r.room_number`;
    
    const result = await client.query(query, params);
    
    const rooms = result.rows.map(row => ({
      id: row.id,
      roomNumber: row.room_number,
      buildingName: row.building_name,
      buildingId: row.building_id,
      floorNumber: row.floor_number,
      roomType: row.room_type,
      monthlyRate: parseFloat(row.monthly_rate || 0),
      daysVacant: row.days_vacant ? parseInt(row.days_vacant) : undefined,
      lastTenantName: row.last_tenant_name || undefined,
      maintenanceStatus: row.room_status,
    }));
    
    const totalRoomsQuery = `
      SELECT COUNT(*) as total
      FROM rooms
      WHERE is_active = true
      ${filters?.buildingId ? 'AND building_id = $1' : ''}
    `;
    
    const totalRoomsResult = await client.query(totalRoomsQuery, filters?.buildingId ? [filters.buildingId] : []);
    const totalRooms = parseInt(totalRoomsResult.rows[0].total || 0);
    
    const totalVacant = rooms.length;
    const vacancyRate = totalRooms > 0 ? (totalVacant / totalRooms) * 100 : 0;
    const averageMonthlyRate = rooms.length > 0
      ? rooms.reduce((sum, r) => sum + r.monthlyRate, 0) / rooms.length
      : 0;
    const totalPotentialRevenue = rooms.reduce((sum, r) => sum + r.monthlyRate, 0);
    
    return {
      summary: {
        totalVacant,
        totalRooms,
        vacancyRate,
        averageMonthlyRate,
        totalPotentialRevenue,
      },
      rooms,
    };
  } finally {
    client.release();
  }
}
