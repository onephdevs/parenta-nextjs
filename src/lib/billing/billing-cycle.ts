/**
 * Lease billing cycle helpers.
 * Cycle start day comes from move-in / assignment start_date (1–31),
 * not a hardcoded company-wide due day.
 */

export function billingCycleStartDayFromDate(
  moveInOrStart: Date | string | null | undefined
): number | null {
  if (!moveInOrStart) return null;
  const d = moveInOrStart instanceof Date ? moveInOrStart : new Date(moveInOrStart);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getUTCDate();
  return Math.min(31, Math.max(1, day));
}

/** Prefer stored assignment field; fall back to deriving from start date; else legacy default. */
export function resolveRentDueDay(options: {
  billingCycleStartDay?: number | null;
  startDate?: Date | string | null;
  /** Configurable legacy fallback for clients that still use a fixed day */
  fallbackDay?: number;
}): number {
  if (
    options.billingCycleStartDay != null &&
    options.billingCycleStartDay >= 1 &&
    options.billingCycleStartDay <= 31
  ) {
    return options.billingCycleStartDay;
  }
  const derived = billingCycleStartDayFromDate(options.startDate ?? null);
  if (derived != null) return derived;
  return options.fallbackDay ?? 5;
}
