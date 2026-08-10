/**
 * Default move-out inspection checklist categories / helpers.
 * Deductions are always manual — never auto-calculated from a formula.
 */

export const INSPECTION_FINDING_STATUSES = [
  'pending',
  'pass',
  'fail',
  'na',
] as const;

export type InspectionFindingStatus =
  (typeof INSPECTION_FINDING_STATUSES)[number];

export const INSPECTION_FINDING_LABELS: Record<
  InspectionFindingStatus,
  string
> = {
  pending: 'Pending',
  pass: 'Pass',
  fail: 'Fail / deduct',
  na: 'N/A',
};

export const INSPECTION_CATEGORIES = [
  'structure',
  'fixtures',
  'kitchen',
  'bathroom',
  'appliances',
  'electrical',
  'keys',
  'cleanliness',
  'financial',
  'other',
  'general',
] as const;

export type InspectionCategory = (typeof INSPECTION_CATEGORIES)[number];

export interface InspectionChecklistItemInput {
  itemKey: string;
  label: string;
  category: string;
  sortOrder: number;
  findingStatus?: InspectionFindingStatus;
  deductionAmount?: number;
  notes?: string | null;
}

/** Sum of manually entered item deductions (helper — not an auto-refund formula). */
export function sumItemizedDeductions(
  items: Array<{ deductionAmount?: number | null }>
): number {
  const total = items.reduce(
    (sum, item) => sum + Math.max(0, Number(item.deductionAmount) || 0),
    0
  );
  return Math.round(total * 100) / 100;
}

/**
 * Suggested return amount helper only:
 * held − itemizedDeductions (clamped ≥ 0). User may override.
 */
export function suggestDepositReturn(
  heldAmount: number,
  itemizedDeductions: number
): number {
  const held = Math.max(0, Number(heldAmount) || 0);
  const deductions = Math.max(0, Number(itemizedDeductions) || 0);
  return Math.round(Math.max(0, held - deductions) * 100) / 100;
}
