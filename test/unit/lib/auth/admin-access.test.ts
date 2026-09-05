import { describe, expect, it } from 'vitest';

import {
  canAccessAdminPortal,
  canViewFinanceReports,
  normalizeOfficeRole,
} from '@/lib/auth/admin-access';
import { homePathForRole } from '@/lib/auth/home-path';

describe('office roles', () => {
  it('treats caretaker as admin', () => {
    expect(normalizeOfficeRole('caretaker')).toBe('admin');
    expect(canAccessAdminPortal('caretaker')).toBe(true);
    expect(canViewFinanceReports('caretaker')).toBe(true);
  });

  it('blocks tenants from the admin portal', () => {
    expect(canAccessAdminPortal('tenant')).toBe(false);
    expect(canViewFinanceReports('staff')).toBe(false);
  });

  it('sends each role to the matching home path', () => {
    expect(homePathForRole('tenant')).toBe('/tenant');
    expect(homePathForRole('staff')).toBe('/staff');
    expect(homePathForRole('caretaker')).toBe('/admin');
    expect(homePathForRole(null)).toBe('/');
  });
});
