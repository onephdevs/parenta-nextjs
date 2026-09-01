/**
 * Move-out inspection checklist + refund worksheet support.
 * Refund return amounts are always manually entered by the operator.
 * Checklist deductions are itemized manually against findings (no auto formula).
 */

import type { PoolClient } from 'pg';
import pool from '@/lib/db';
import {
  type InspectionFindingStatus,
  sumItemizedDeductions,
  suggestDepositReturn,
} from '@/lib/constants/moveout-inspection';
import { completeMoveOut, initiateMoveOut } from '@/lib/services/lease-management-service';

export interface MoveoutInspectionItem {
  id: string;
  moveoutId: string;
  templateId: string | null;
  sortOrder: number;
  itemKey: string;
  label: string;
  category: string;
  findingStatus: InspectionFindingStatus;
  deductionAmount: number;
  notes: string | null;
  photoUrl: string | null;
  inspectedAt: string | null;
}

export interface MoveoutRefundWorksheet {
  moveoutId: string;
  status: string;
  tenantId: string;
  tenantName: string;
  assignmentId: string;
  roomId: string;
  roomNumber: string;
  buildingId: string;
  buildingName: string;
  moveoutDate: string;
  actualMoveoutDate: string | null;
  inspectionScheduledDate: string | null;
  inspectionCompletedDate: string | null;
  inspectionNotes: string | null;
  inspectionPassed: boolean | null;
  held: {
    deposit: number;
    advance: number;
    utilityDeposit: number;
    total: number;
  };
  settlement: {
    depositReturnAmount: number | null;
    depositDeductionAmount: number | null;
    deductionReason: string | null;
    advanceReturnAmount: number | null;
    utilityDepositReturnAmount: number | null;
    settlementCompleted: boolean;
  };
  checklist: MoveoutInspectionItem[];
  itemizedDeductionsTotal: number;
  suggestedDepositReturn: number;
}

function num(v: unknown): number {
  return Math.round((Number(v) || 0) * 100) / 100;
}

function mapItem(row: Record<string, unknown>): MoveoutInspectionItem {
  return {
    id: String(row.id),
    moveoutId: String(row.moveout_id),
    templateId: row.template_id ? String(row.template_id) : null,
    sortOrder: Number(row.sort_order) || 0,
    itemKey: String(row.item_key),
    label: String(row.label),
    category: String(row.category || 'general'),
    findingStatus: String(row.finding_status || 'pending') as InspectionFindingStatus,
    deductionAmount: num(row.deduction_amount),
    notes: row.notes ? String(row.notes) : null,
    photoUrl: row.photo_url ? String(row.photo_url) : null,
    inspectedAt: row.inspected_at ? String(row.inspected_at) : null,
  };
}

async function seedChecklistFromTemplates(
  client: PoolClient,
  moveoutId: string,
  buildingId: string | null
): Promise<void> {
  const existing = await client.query(
    `SELECT 1 FROM moveout_inspection_items WHERE moveout_id = $1 LIMIT 1`,
    [moveoutId]
  );
  if (existing.rows.length > 0) return;

  await client.query(
    `
    WITH building_templates AS (
      SELECT t.*
      FROM moveout_inspection_checklist_templates t
      WHERE t.is_active = true
        AND $2::uuid IS NOT NULL
        AND t.building_id = $2
    ),
    chosen AS (
      SELECT * FROM building_templates
      UNION ALL
      SELECT t.*
      FROM moveout_inspection_checklist_templates t
      WHERE t.is_active = true
        AND t.building_id IS NULL
        AND NOT EXISTS (SELECT 1 FROM building_templates)
    )
    INSERT INTO moveout_inspection_items (
      moveout_id, template_id, sort_order, item_key, label, category, finding_status
    )
    SELECT
      $1,
      c.id,
      c.sort_order,
      c.item_key,
      c.label,
      c.category,
      'pending'
    FROM chosen c
    ORDER BY c.sort_order, c.label
    ON CONFLICT (moveout_id, item_key) DO NOTHING
    `,
    [moveoutId, buildingId]
  );
}

/**
 * Start move-out and seed inspection checklist.
 */
export async function startMoveOutWithChecklist(
  data: {
    tenantId: string;
    roomAssignmentId: string;
    moveoutDate: string;
    noticeDate?: string;
    forwardingAddress?: string;
  },
  createdBy?: string
): Promise<{ moveoutId: string }> {
  const existing = await pool.query(
    `SELECT id FROM moveout_processing
     WHERE room_assignment_id = $1
       AND status NOT IN ('completed', 'cancelled')
     ORDER BY created_at DESC
     LIMIT 1`,
    [data.roomAssignmentId]
  );
  if (existing.rows[0]) {
    await ensureMoveoutChecklist(String(existing.rows[0].id));
    return { moveoutId: String(existing.rows[0].id) };
  }

  const moveout = await initiateMoveOut(
    {
      tenant_id: data.tenantId,
      room_assignment_id: data.roomAssignmentId,
      moveout_date: new Date(data.moveoutDate),
      notice_date: data.noticeDate ? new Date(data.noticeDate) : undefined,
      forwarding_address: data.forwardingAddress,
    },
    createdBy
  );

  await ensureMoveoutChecklist(moveout.id);
  return { moveoutId: moveout.id };
}

/**
 * Ensure checklist exists (for move-outs created before Phase 6).
 */
export async function ensureMoveoutChecklist(moveoutId: string): Promise<void> {
  const client = await pool.connect();
  try {
    const loc = await client.query(
      `SELECT r.building_id
       FROM moveout_processing mp
       JOIN tenant_room_assignments tra ON tra.id = mp.room_assignment_id
       JOIN rooms r ON r.id = tra.room_id
       WHERE mp.id = $1`,
      [moveoutId]
    );
    if (!loc.rows[0]) throw new Error('Move-out not found');
    await seedChecklistFromTemplates(
      client,
      moveoutId,
      loc.rows[0].building_id || null
    );
  } finally {
    client.release();
  }
}

export async function getMoveoutRefundWorksheet(
  moveoutId: string
): Promise<MoveoutRefundWorksheet | null> {
  await ensureMoveoutChecklist(moveoutId);

  const result = await pool.query(
    `
    SELECT
      mp.*,
      t.first_name || ' ' || t.last_name AS tenant_name,
      tra.id AS assignment_id,
      tra.deposit_paid,
      tra.advance_paid,
      tra.utility_deposit_paid,
      r.id AS room_id,
      r.room_number,
      b.id AS building_id,
      b.name AS building_name
    FROM moveout_processing mp
    JOIN tenants t ON t.id = mp.tenant_id
    JOIN tenant_room_assignments tra ON tra.id = mp.room_assignment_id
    JOIN rooms r ON r.id = tra.room_id
    JOIN buildings b ON b.id = r.building_id
    WHERE mp.id = $1
    `,
    [moveoutId]
  );

  if (!result.rows[0]) return null;
  const row = result.rows[0];

  const itemsResult = await pool.query(
    `SELECT * FROM moveout_inspection_items
     WHERE moveout_id = $1
     ORDER BY sort_order, label`,
    [moveoutId]
  );
  const checklist = itemsResult.rows.map(mapItem);
  const itemizedDeductionsTotal = sumItemizedDeductions(checklist);
  const depositHeld = num(row.deposit_paid);

  return {
    moveoutId: String(row.id),
    status: String(row.status || 'initiated'),
    tenantId: String(row.tenant_id),
    tenantName: String(row.tenant_name || '').trim(),
    assignmentId: String(row.assignment_id),
    roomId: String(row.room_id),
    roomNumber: String(row.room_number),
    buildingId: String(row.building_id),
    buildingName: String(row.building_name),
    moveoutDate: String(row.moveout_date).slice(0, 10),
    actualMoveoutDate: row.actual_moveout_date
      ? String(row.actual_moveout_date).slice(0, 10)
      : null,
    inspectionScheduledDate: row.inspection_scheduled_date
      ? String(row.inspection_scheduled_date).slice(0, 10)
      : null,
    inspectionCompletedDate: row.inspection_completed_date
      ? String(row.inspection_completed_date).slice(0, 10)
      : null,
    inspectionNotes: row.inspection_notes
      ? String(row.inspection_notes)
      : null,
    inspectionPassed:
      row.inspection_passed == null ? null : Boolean(row.inspection_passed),
    held: {
      deposit: depositHeld,
      advance: num(row.advance_paid),
      utilityDeposit: num(row.utility_deposit_paid),
      total:
        depositHeld + num(row.advance_paid) + num(row.utility_deposit_paid),
    },
    settlement: {
      depositReturnAmount:
        row.deposit_return_amount != null ? num(row.deposit_return_amount) : null,
      depositDeductionAmount:
        row.deposit_deduction_amount != null
          ? num(row.deposit_deduction_amount)
          : null,
      deductionReason: row.deduction_reason
        ? String(row.deduction_reason)
        : null,
      advanceReturnAmount:
        row.advance_return_amount != null
          ? num(row.advance_return_amount)
          : null,
      utilityDepositReturnAmount:
        row.utility_deposit_return_amount != null
          ? num(row.utility_deposit_return_amount)
          : null,
      settlementCompleted: Boolean(row.settlement_completed),
    },
    checklist,
    itemizedDeductionsTotal,
    suggestedDepositReturn: suggestDepositReturn(
      depositHeld,
      itemizedDeductionsTotal
    ),
  };
}

export async function updateInspectionItem(
  itemId: string,
  updates: {
    findingStatus?: InspectionFindingStatus;
    deductionAmount?: number;
    notes?: string | null;
  }
): Promise<MoveoutInspectionItem> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (updates.findingStatus) {
    fields.push(`finding_status = $${i++}`);
    values.push(updates.findingStatus);
  }
  if (updates.deductionAmount != null) {
    fields.push(`deduction_amount = $${i++}`);
    values.push(Math.max(0, num(updates.deductionAmount)));
  }
  if (updates.notes !== undefined) {
    fields.push(`notes = $${i++}`);
    values.push(updates.notes);
  }

  fields.push(`inspected_at = COALESCE(inspected_at, NOW())`);
  fields.push(`updated_at = NOW()`);
  values.push(itemId);

  const result = await pool.query(
    `UPDATE moveout_inspection_items
     SET ${fields.join(', ')}
     WHERE id = $${i}
     RETURNING *`,
    values
  );
  if (!result.rows[0]) throw new Error('Inspection item not found');
  return mapItem(result.rows[0]);
}

export async function saveInspectionSummary(
  moveoutId: string,
  data: {
    inspectionNotes?: string | null;
    inspectionPassed?: boolean | null;
    inspectionCompletedDate?: string | null;
    markInspectionCompleted?: boolean;
  }
): Promise<void> {
  const status = data.markInspectionCompleted
    ? 'inspection_completed'
    : undefined;

  await pool.query(
    `
    UPDATE moveout_processing
    SET
      inspection_notes = COALESCE($2, inspection_notes),
      inspection_passed = COALESCE($3, inspection_passed),
      inspection_completed_date = COALESCE(
        $4::date,
        CASE WHEN $5 THEN CURRENT_DATE ELSE inspection_completed_date END
      ),
      status = COALESCE($6, status),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    `,
    [
      moveoutId,
      data.inspectionNotes ?? null,
      data.inspectionPassed ?? null,
      data.inspectionCompletedDate || null,
      Boolean(data.markInspectionCompleted),
      status || null,
    ]
  );
}

/**
 * Finalize move-out with manually entered refund amounts.
 * Optionally copies checklist itemized total into deduction_reason text.
 */
export async function finalizeMoveOutSettlement(
  moveoutId: string,
  data: {
    actualMoveoutDate: string;
    depositReturnAmount: number;
    depositDeductionAmount: number;
    deductionReason?: string;
    advanceReturnAmount?: number;
    utilityDepositReturnAmount?: number;
    useChecklistTotalAsDeductionHint?: boolean;
  }
): Promise<{ success: boolean; message: string }> {
  const worksheet = await getMoveoutRefundWorksheet(moveoutId);
  if (!worksheet) {
    return { success: false, message: 'Move-out not found' };
  }
  if (worksheet.settlement.settlementCompleted) {
    return { success: false, message: 'Move-out already settled' };
  }

  const failedItems = worksheet.checklist.filter(
    (i) => i.findingStatus === 'fail' && i.deductionAmount > 0
  );
  const itemizedReason =
    failedItems.length > 0
      ? failedItems
          .map((i) => `${i.label}: ₱${i.deductionAmount.toFixed(2)}`)
          .join('; ')
      : '';

  const deductionReason =
    data.deductionReason?.trim() ||
    (itemizedReason
      ? `Inspection deductions — ${itemizedReason}`
      : undefined);

  // Soft validation only — operator may override suggested numbers
  const depositReturn = Math.max(0, num(data.depositReturnAmount));
  const depositDeduction = Math.max(0, num(data.depositDeductionAmount));

  const result = await completeMoveOut(moveoutId, {
    actual_moveout_date: new Date(data.actualMoveoutDate),
    deposit_return_amount: depositReturn,
    deposit_deduction_amount: depositDeduction,
    deduction_reason: deductionReason,
    advance_return_amount: Math.max(0, num(data.advanceReturnAmount)),
    utility_deposit_return_amount: Math.max(
      0,
      num(data.utilityDepositReturnAmount)
    ),
  });

  if (result.success) {
    // Room vacancy + assignment end already handled inside completeMoveOut
  }

  return result;
}

export { sumItemizedDeductions, suggestDepositReturn };
