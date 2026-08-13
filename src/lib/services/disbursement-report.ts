/**
 * Disbursement / cash-flow waterfall report (apartment records).
 *
 * Total Collection (cash, incl. deposits; excl. cheques)
 * − Expenses (operating)
 * − Cash allowance (e.g. Ima)
 * = Cash for deposit
 * + Cheque payments (e.g. hardware)
 * = Grand Total
 */

import pool from '@/lib/db';
import { PAYMENT_IS_REVENUE_UNIT } from '@/lib/sql/revenue-unit-filter';
import {
  previewLifetimeCollection,
  type LifetimePreview,
} from '@/lib/services/collection-lifetime';

export interface DisbursementWaterfall {
  totalCollection: number;
  expenses: number;
  /** Collection − expenses (before Ima / owner draw) */
  afterExpenses: number;
  /** Owner draw such as Ima Cash Allowance */
  imaCashAllowance: number;
  /** Collection − expenses − Ima (= Excel “CASH For Deposit”) */
  cashForDeposit: number;
  chequePayments: number;
  grandTotal: number;
}

export interface DisbursementReportData {
  startDate: string;
  endDate: string;
  buildingId: string | null;
  waterfall: DisbursementWaterfall;
  lifetime: LifetimePreview;
  breakdown: {
    collectionByMethod: Array<{ method: string; amount: number; count: number }>;
    expensesByCategory: Array<{ category: string; amount: number; count: number }>;
    depositCash: Array<{ id: string; date: string; amount: number; tenantName: string }>;
    cheques: Array<{ id: string; date: string; amount: number; tenantName: string }>;
  };
  generatedAt: string;
}

function num(v: unknown): number {
  return Math.round((Number(v) || 0) * 100) / 100;
}

export async function generateDisbursementReport(params: {
  startDate: string;
  endDate: string;
  buildingId?: string | null;
}): Promise<DisbursementReportData> {
  const { startDate, endDate, buildingId = null } = params;
  const client = await pool.connect();

  try {
    const buildingFilterPayments = buildingId
      ? `AND EXISTS (
           SELECT 1 FROM tenant_room_assignments tra
           JOIN rooms r ON r.id = tra.room_id
           WHERE tra.tenant_id = p.tenant_id
             AND r.building_id = $3
         )`
      : '';
    const buildingFilterExpenses = buildingId ? `AND e.building_id = $3` : '';
    const paramsBase: unknown[] = buildingId
      ? [startDate, endDate, buildingId]
      : [startDate, endDate];

    // Total Collection: all paid non-cheque payments (rent, advance, utility, deposit)
    const collectionResult = await client.query(
      `
      SELECT COALESCE(SUM(p.amount), 0) AS total
      FROM payments p
      WHERE p.payment_date BETWEEN $1 AND $2
        AND p.payment_status IN ('paid', 'completed', 'confirmed')
        AND LOWER(COALESCE(p.payment_method, 'cash')) NOT IN ('cheque', 'check')
        AND ${PAYMENT_IS_REVENUE_UNIT}
        ${buildingFilterPayments}
      `,
      paramsBase
    );

    const expensesResult = await client.query(
      `
      SELECT COALESCE(SUM(e.amount), 0) AS total
      FROM expenses e
      WHERE e.expense_date BETWEEN $1 AND $2
        AND COALESCE(e.expense_status, 'pending') IS DISTINCT FROM 'cancelled'
        AND COALESCE(e.category, 'other') NOT IN ('cash_allowance', 'owner_draw')
        ${buildingFilterExpenses}
      `,
      paramsBase
    );

    const cashAllowanceResult = await client.query(
      `
      SELECT COALESCE(SUM(e.amount), 0) AS total
      FROM expenses e
      WHERE e.expense_date BETWEEN $1 AND $2
        AND COALESCE(e.expense_status, 'pending') IS DISTINCT FROM 'cancelled'
        AND COALESCE(e.category, 'other') IN ('cash_allowance', 'owner_draw')
        ${buildingFilterExpenses}
      `,
      paramsBase
    );

    const chequeResult = await client.query(
      `
      SELECT COALESCE(SUM(p.amount), 0) AS total
      FROM payments p
      WHERE p.payment_date BETWEEN $1 AND $2
        AND p.payment_status IN ('paid', 'completed', 'confirmed')
        AND LOWER(COALESCE(p.payment_method, '')) IN ('cheque', 'check')
        AND ${PAYMENT_IS_REVENUE_UNIT}
        ${buildingFilterPayments}
      `,
      paramsBase
    );

    const totalCollection = num(collectionResult.rows[0]?.total);
    const expenses = num(expensesResult.rows[0]?.total);
    const imaCashAllowance = num(cashAllowanceResult.rows[0]?.total);
    const afterExpenses = num(totalCollection - expenses);
    const cashForDeposit = num(afterExpenses - imaCashAllowance);
    const chequePayments = num(chequeResult.rows[0]?.total);
    const grandTotal = num(cashForDeposit + chequePayments);

    const byMethod = await client.query(
      `
      SELECT
        LOWER(COALESCE(p.payment_method, 'other')) AS method,
        COALESCE(SUM(p.amount), 0) AS amount,
        COUNT(*)::int AS count
      FROM payments p
      WHERE p.payment_date BETWEEN $1 AND $2
        AND p.payment_status IN ('paid', 'completed', 'confirmed')
        AND ${PAYMENT_IS_REVENUE_UNIT}
        ${buildingFilterPayments}
      GROUP BY 1
      ORDER BY amount DESC
      `,
      paramsBase
    );

    const byCategory = await client.query(
      `
      SELECT
        COALESCE(e.category, 'other') AS category,
        COALESCE(SUM(e.amount), 0) AS amount,
        COUNT(*)::int AS count
      FROM expenses e
      WHERE e.expense_date BETWEEN $1 AND $2
        AND COALESCE(e.expense_status, 'pending') IS DISTINCT FROM 'cancelled'
        ${buildingFilterExpenses}
      GROUP BY 1
      ORDER BY amount DESC
      `,
      paramsBase
    );

    const depositRows = await client.query(
      `
      SELECT
        p.id,
        p.payment_date::text AS date,
        p.amount,
        COALESCE(t.first_name || ' ' || t.last_name, 'Unknown') AS tenant_name
      FROM payments p
      LEFT JOIN tenants t ON t.id = p.tenant_id
      WHERE p.payment_date BETWEEN $1 AND $2
        AND p.payment_status IN ('paid', 'completed', 'confirmed')
        AND p.payment_type = 'deposit'
        AND LOWER(COALESCE(p.payment_method, 'cash')) = 'cash'
        ${buildingFilterPayments}
      ORDER BY p.payment_date DESC
      LIMIT 100
      `,
      paramsBase
    );

    const chequeRows = await client.query(
      `
      SELECT
        p.id,
        p.payment_date::text AS date,
        p.amount,
        COALESCE(t.first_name || ' ' || t.last_name, 'Unknown') AS tenant_name
      FROM payments p
      LEFT JOIN tenants t ON t.id = p.tenant_id
      WHERE p.payment_date BETWEEN $1 AND $2
        AND p.payment_status IN ('paid', 'completed', 'confirmed')
        AND LOWER(COALESCE(p.payment_method, '')) IN ('cheque', 'check')
        ${buildingFilterPayments}
      ORDER BY p.payment_date DESC
      LIMIT 100
      `,
      paramsBase
    );

    return {
      startDate,
      endDate,
      buildingId,
      waterfall: {
        totalCollection,
        expenses,
        afterExpenses,
        imaCashAllowance,
        cashForDeposit,
        chequePayments,
        grandTotal,
      },
      lifetime: await previewLifetimeCollection({
        startDate,
        endDate,
        buildingId,
      }),
      breakdown: {
        collectionByMethod: byMethod.rows.map((r) => ({
          method: String(r.method),
          amount: num(r.amount),
          count: Number(r.count) || 0,
        })),
        expensesByCategory: byCategory.rows.map((r) => ({
          category: String(r.category),
          amount: num(r.amount),
          count: Number(r.count) || 0,
        })),
        depositCash: depositRows.rows.map((r) => ({
          id: String(r.id),
          date: String(r.date).slice(0, 10),
          amount: num(r.amount),
          tenantName: String(r.tenant_name),
        })),
        cheques: chequeRows.rows.map((r) => ({
          id: String(r.id),
          date: String(r.date).slice(0, 10),
          amount: num(r.amount),
          tenantName: String(r.tenant_name),
        })),
      },
      generatedAt: new Date().toISOString(),
    };
  } finally {
    client.release();
  }
}
