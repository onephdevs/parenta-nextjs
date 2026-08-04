/** Shared lease date helpers (start + N months → end). */

export const LEASE_DURATION_PRESETS = [1, 3, 6, 12, 18, 24] as const;

export function todayLocalISO(): string {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** End date = start + N months − 1 day (e.g. Aug 17 + 6 mo → Feb 16). */
export function computeLeaseEndDate(startIso: string, months: number): string {
  if (!startIso || months <= 0) return '';
  const [year, month, day] = startIso.split('-').map(Number);
  if (!year || !month || !day) return '';

  const end = new Date(year, month - 1, day);
  end.setMonth(end.getMonth() + months);
  end.setDate(end.getDate() - 1);

  const yy = end.getFullYear();
  const mm = String(end.getMonth() + 1).padStart(2, '0');
  const dd = String(end.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function getEffectiveLeaseMonths(
  leaseDurationMonths: number,
  customLeaseMonths?: number | null
): number {
  if (leaseDurationMonths === -1) return 0; // open-ended
  if (leaseDurationMonths === 0) return Number(customLeaseMonths) || 0;
  return Number(leaseDurationMonths) || 0;
}
