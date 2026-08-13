/** Client-safe lease package types and labels (no DB imports). */

export type LeasePackagePenaltyType = 'percentage' | 'flat_fee';

export interface LeasePackageTemplate {
  id: string;
  name: string;
  /** null = no fixed term */
  termMonths: number | null;
  /** null = deposit not required */
  depositMonths: number | null;
  advanceMonths: number;
  /** null = no grace period configured */
  gracePeriodDays: number | null;
  /** null = penalties not configured */
  penaltyType: LeasePackagePenaltyType | null;
  /** null when penalties are not configured */
  penaltyFee: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeasePackageTemplateInput {
  name: string;
  termMonths: number | null;
  depositMonths: number | null;
  advanceMonths: number;
  gracePeriodDays: number | null;
  penaltyType: LeasePackagePenaltyType | null;
  penaltyFee: number | null;
  isActive?: boolean;
}

export function formatTermLabel(termMonths: number | null): string {
  if (termMonths == null) return 'No fixed term';
  return `${termMonths} Month${termMonths === 1 ? '' : 's'}`;
}

export function formatDepositLabel(depositMonths: number | null): string {
  if (depositMonths == null) return 'Not required';
  return `${depositMonths} month${depositMonths === 1 ? '' : 's'}`;
}

export function formatAdvanceLabel(advanceMonths: number): string {
  return `${advanceMonths} month${advanceMonths === 1 ? '' : 's'}`;
}

export function formatGraceLabel(days: number | null | undefined): string {
  if (days == null) return 'Not set';
  return `${days} day${days === 1 ? '' : 's'}`;
}

export function formatPenaltyTypeLabel(
  type: LeasePackagePenaltyType | null | undefined
): string {
  if (!type) return 'None';
  return type === 'flat_fee' ? 'Flat Fee' : 'Percentage';
}

export function formatPenaltyFeeLabel(
  type: LeasePackagePenaltyType | null | undefined,
  fee: number | null | undefined
): string {
  if (!type || fee == null) return '—';
  if (type === 'percentage') return `${fee}%`;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(fee || 0);
}
