/** Caretaker is the same office role as admin (legacy accounts). */
export function normalizeOfficeRole(role: string | null | undefined): string {
  return role === 'caretaker' ? 'admin' : String(role || '');
}

/** Roles that can use the /admin portal. */
export function canAccessAdminPortal(role: string | null | undefined): boolean {
  return normalizeOfficeRole(role) === 'admin';
}

/** Office admin — full finance / cash-flow / expense reports. */
export function canViewFinanceReports(role: string | null | undefined): boolean {
  return normalizeOfficeRole(role) === 'admin';
}
