/** Roles that can use the /admin portal (owner vs limited caretaker). */
export function canAccessAdminPortal(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'caretaker';
}

/** Full finance / cash-flow / expense reports — owner/admin only. */
export function canViewFinanceReports(role: string | null | undefined): boolean {
  return role === 'admin';
}
