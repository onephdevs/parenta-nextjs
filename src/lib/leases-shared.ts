export type LeaseUiStatus = 'active' | 'expiring_soon' | 'draft' | 'terminated';

export interface LeaseListItem {
  id: string;
  tenantId: string;
  roomId: string;
  buildingId: string;
  buildingName: string;
  roomNumber: string;
  tenantFirstName: string;
  tenantLastName: string;
  tenantEmail: string;
  startDate: string | null;
  endDate: string | null;
  monthlyRate: number;
  depositPaid: number;
  assignmentStatus: string;
  uiStatus: LeaseUiStatus;
  occupantCount: number;
  createdAt: string;
}

export interface LeaseStats {
  active: number;
  expiringSoon: number;
  draft: number;
  terminated: number;
}

export interface LeaseDetail extends LeaseListItem {
  advancePaid: number;
  utilityDepositPaid: number;
  notes: string | null;
  tenantPhone: string | null;
  tenantStatus: string | null;
  securityDeposit: number | null;
  agreementDocumentId: string | null;
  agreementDocumentUrl: string | null;
  agreementDocumentName: string | null;
  rentDueDay: number;
  leasePackageTemplateId: string | null;
  leasePackageTemplateName?: string | null;
  leasePackageTermMonths?: number | null;
  leasePackageDepositMonths?: number | null;
  leasePackageAdvanceMonths?: number | null;
  leasePackageGracePeriodDays?: number | null;
  leasePackagePenaltyType?: 'percentage' | 'flat_fee' | null;
  leasePackagePenaltyFee?: number | null;
}

export function formatLeaseTerm(startDate: string | null, endDate: string | null): string {
  if (!startDate && !endDate) return '—';
  const start = startDate ? formatDateOnlyLabel(startDate) : '?';
  if (!endDate) return `${start} – Open-ended`;
  return `${start} – ${formatDateOnlyLabel(endDate)}`;
}

function formatDateOnlyLabel(isoDate: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(isoDate)
    ? new Date(`${isoDate}T12:00:00`)
    : new Date(isoDate);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatLeaseTermShort(startDate: string | null, endDate: string | null): string {
  if (!startDate && !endDate) return '—';
  if (!startDate || !endDate) {
    return formatLeaseTerm(startDate, endDate);
  }
  const s = /^\d{4}-\d{2}-\d{2}$/.test(startDate)
    ? new Date(`${startDate}T12:00:00`)
    : new Date(startDate);
  const e = /^\d{4}-\d{2}-\d{2}$/.test(endDate)
    ? new Date(`${endDate}T12:00:00`)
    : new Date(endDate);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return '—';
  const sameYear = s.getFullYear() === e.getFullYear();
  const startLabel = s.toLocaleDateString('en-US', {
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const endLabel = e.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  return `${startLabel}–${endLabel}`;
}

export function ordinalDay(day: number): string {
  const j = day % 10;
  const k = day % 100;
  if (j === 1 && k !== 11) return `${day}st`;
  if (j === 2 && k !== 12) return `${day}nd`;
  if (j === 3 && k !== 13) return `${day}rd`;
  return `${day}th`;
}
