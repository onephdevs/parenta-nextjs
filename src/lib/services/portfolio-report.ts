/**
 * Portfolio-level rollup report.
 * Levels: unit → property → portfolio-wide.
 */

import pool from '@/lib/db';
import {
  assertOccupancyReconciles,
  buildOccupancyReconciliation,
  estimateLostRent,
  type OccupancyReconciliation,
} from '@/lib/occupancy/reconcile';
import { previewLifetimeCollection } from '@/lib/services/collection-lifetime';
import {
  PAYMENT_IS_REVENUE_UNIT,
  ROOM_IS_REVENUE,
} from '@/lib/sql/revenue-unit-filter';

export interface PortfolioUnitRow {
  roomId: string;
  roomNumber: string;
  buildingId: string;
  buildingName: string;
  roomStatus: string;
  occupancyBucket: 'occupied' | 'vacant' | 'unassigned';
  monthlyRate: number;
  tenantName: string | null;
  daysVacant: number | null;
  estimatedLostRent: number | null;
  ownerAbsorbedUtility: number;
}

export interface PortfolioPropertyRow {
  buildingId: string;
  buildingName: string;
  occupancy: OccupancyReconciliation;
  periodCollection: number;
  vacantUnits: number;
  estimatedLostRent: number;
  ownerAbsorbedUtility: number;
  units: PortfolioUnitRow[];
}

export interface PortfolioReportData {
  level: 'portfolio';
  startDate: string;
  endDate: string;
  occupancy: OccupancyReconciliation;
  periodCollection: number;
  lifetime: {
    previousTotal: number;
    currentPeriodCollection: number;
    overallCollection: number;
    alreadyCommitted: boolean;
  };
  vacancy: {
    vacantUnits: number;
    totalEstimatedLostRent: number;
    ownerAbsorbedUtility: number;
  };
  properties: PortfolioPropertyRow[];
  generatedAt: string;
}

function num(v: unknown): number {
  return Math.round((Number(v) || 0) * 100) / 100;
}

export async function generatePortfolioReport(params: {
  startDate: string;
  endDate: string;
  buildingId?: string | null;
}): Promise<PortfolioReportData> {
  const { startDate, endDate, buildingId = null } = params;

  const buildingFilter = buildingId ? 'AND b.id = $3' : '';
  const roomBuildingFilter = buildingId ? 'AND r.building_id = $3' : '';
  const baseParams: unknown[] = buildingId
    ? [startDate, endDate, buildingId]
    : [startDate, endDate];

  const unitsResult = await pool.query(
    `
    SELECT
      r.id AS room_id,
      r.room_number,
      r.room_status,
      r.monthly_rate,
      b.id AS building_id,
      b.name AS building_name,
      CASE
        WHEN LOWER(COALESCE(r.room_status, '')) = 'occupied' THEN 'occupied'
        WHEN LOWER(COALESCE(r.room_status, '')) = 'vacant' THEN 'vacant'
        ELSE 'unassigned'
      END AS occupancy_bucket,
      (
        SELECT t.first_name || ' ' || t.last_name
        FROM tenant_room_assignments tra
        JOIN tenants t ON t.id = tra.tenant_id
        WHERE tra.room_id = r.id
          AND tra.assignment_status = 'active'
          AND (tra.end_date IS NULL OR tra.end_date >= CURRENT_DATE)
        ORDER BY tra.start_date DESC
        LIMIT 1
      ) AS tenant_name,
      CASE
        WHEN LOWER(COALESCE(r.room_status, '')) = 'vacant' THEN
          GREATEST(
            0,
            (
              CURRENT_DATE - COALESCE(
                (
                  SELECT MAX(tra2.end_date)
                  FROM tenant_room_assignments tra2
                  WHERE tra2.room_id = r.id
                    AND tra2.end_date IS NOT NULL
                ),
                r.updated_at::date
              )
            )
          )
        ELSE NULL
      END AS days_vacant,
      COALESCE((
        SELECT SUM(ub.amount)
        FROM utility_bills ub
        WHERE ub.room_id = r.id
          AND ub.cost_bearer = 'OWNER'
          AND ub.billing_period_start <= $2::date
          AND ub.billing_period_end >= $1::date
          AND COALESCE(ub.bill_status, 'pending') IS DISTINCT FROM 'cancelled'
      ), 0) AS owner_absorbed_utility
    FROM rooms r
    JOIN buildings b ON b.id = r.building_id AND COALESCE(b.is_active, true) = true
    WHERE COALESCE(r.is_active, true) = true
      AND ${ROOM_IS_REVENUE}
      ${roomBuildingFilter}
    ORDER BY b.name, r.room_number
    `,
    baseParams
  );

  const collectionByBuilding = await pool.query(
    `
    SELECT
      b.id AS building_id,
      COALESCE(SUM(p.amount), 0) AS period_collection
    FROM payments p
    JOIN tenant_room_assignments tra ON tra.tenant_id = p.tenant_id
    JOIN rooms r ON r.id = tra.room_id
    JOIN buildings b ON b.id = r.building_id
    WHERE p.payment_date BETWEEN $1 AND $2
      AND p.payment_status IN ('paid', 'completed', 'confirmed')
      AND ${PAYMENT_IS_REVENUE_UNIT}
      AND ${ROOM_IS_REVENUE}
      ${buildingFilter}
    GROUP BY b.id
    `,
    baseParams
  );
  const collectionMap = new Map<string, number>();
  for (const row of collectionByBuilding.rows) {
    collectionMap.set(String(row.building_id), num(row.period_collection));
  }

  const byBuilding = new Map<string, PortfolioPropertyRow>();

  for (const row of unitsResult.rows) {
    const bid = String(row.building_id);
    if (!byBuilding.has(bid)) {
      byBuilding.set(bid, {
        buildingId: bid,
        buildingName: String(row.building_name),
        occupancy: buildOccupancyReconciliation({
          totalUnits: 0,
          occupied: 0,
          vacant: 0,
        }),
        periodCollection: collectionMap.get(bid) || 0,
        vacantUnits: 0,
        estimatedLostRent: 0,
        ownerAbsorbedUtility: 0,
        units: [],
      });
    }
    const prop = byBuilding.get(bid)!;
    const bucket = String(row.occupancy_bucket) as
      | 'occupied'
      | 'vacant'
      | 'unassigned';
    const monthlyRate = num(row.monthly_rate);
    const daysVacant =
      row.days_vacant != null ? parseInt(String(row.days_vacant), 10) : null;
    const lost =
      daysVacant != null ? estimateLostRent(daysVacant, monthlyRate) : null;
    const ownerAbsorbed = num(row.owner_absorbed_utility);

    prop.units.push({
      roomId: String(row.room_id),
      roomNumber: String(row.room_number),
      buildingId: bid,
      buildingName: String(row.building_name),
      roomStatus: String(row.room_status || ''),
      occupancyBucket: bucket,
      monthlyRate,
      tenantName: row.tenant_name ? String(row.tenant_name).trim() : null,
      daysVacant,
      estimatedLostRent: lost,
      ownerAbsorbedUtility: ownerAbsorbed,
    });
  }

  for (const prop of byBuilding.values()) {
    const totalUnits = prop.units.length;
    const occupied = prop.units.filter((u) => u.occupancyBucket === 'occupied')
      .length;
    const vacant = prop.units.filter((u) => u.occupancyBucket === 'vacant')
      .length;
    prop.occupancy = buildOccupancyReconciliation({
      totalUnits,
      occupied,
      vacant,
    });
    assertOccupancyReconciles(prop.occupancy, prop.buildingName);
    prop.vacantUnits = vacant;
    prop.estimatedLostRent = num(
      prop.units.reduce((s, u) => s + (u.estimatedLostRent || 0), 0)
    );
    prop.ownerAbsorbedUtility = num(
      prop.units.reduce((s, u) => s + u.ownerAbsorbedUtility, 0)
    );
  }

  const properties = Array.from(byBuilding.values()).sort((a, b) =>
    a.buildingName.localeCompare(b.buildingName)
  );

  const portfolioOcc = buildOccupancyReconciliation({
    totalUnits: properties.reduce((s, p) => s + p.occupancy.totalUnits, 0),
    occupied: properties.reduce((s, p) => s + p.occupancy.occupied, 0),
    vacant: properties.reduce((s, p) => s + p.occupancy.vacant, 0),
  });
  assertOccupancyReconciles(portfolioOcc, 'portfolio');

  const periodCollection = num(
    properties.reduce((s, p) => s + p.periodCollection, 0)
  );
  const lifetime = await previewLifetimeCollection({
    startDate,
    endDate,
    buildingId,
  });

  return {
    level: 'portfolio',
    startDate,
    endDate,
    occupancy: portfolioOcc,
    periodCollection,
    lifetime: {
      previousTotal: lifetime.previousTotal,
      currentPeriodCollection: lifetime.currentPeriodCollection,
      overallCollection: lifetime.overallCollection,
      alreadyCommitted: lifetime.alreadyCommitted,
    },
    vacancy: {
      vacantUnits: portfolioOcc.vacant,
      totalEstimatedLostRent: num(
        properties.reduce((s, p) => s + p.estimatedLostRent, 0)
      ),
      ownerAbsorbedUtility: num(
        properties.reduce((s, p) => s + p.ownerAbsorbedUtility, 0)
      ),
    },
    properties,
    generatedAt: new Date().toISOString(),
  };
}
