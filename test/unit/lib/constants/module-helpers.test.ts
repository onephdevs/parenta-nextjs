import { describe, expect, it } from 'vitest';

import {
  formatMaintenanceTicketNumber,
  maintenanceTicketQueue,
} from '@/lib/constants/maintenance';
import { isDepositType } from '@/lib/constants/deposits';
import { contactDisplayName, inferContactUtilityTypes } from '@/lib/constants/contacts';
import { LANDING_FEATURED_LIMIT } from '@/lib/landing-featured';
import { PAYMENT_IS_REVENUE_UNIT, ROOM_IS_REVENUE } from '@/lib/sql/revenue-unit-filter';

describe('module constants and SQL filters', () => {
  it('formats a short maintenance ticket id and queue', () => {
    expect(formatMaintenanceTicketNumber('aaaaaaaa-bbbb-cccc-dddd-eeeeee')).toMatch(/^#T-/);
    expect(maintenanceTicketQueue('completed')).toBe('resolved');
    expect(maintenanceTicketQueue('open')).toBe('open');
  });

  it('recognizes deposit types and vendor display names', () => {
    expect(isDepositType('SECURITY')).toBe(true);
    expect(contactDisplayName({ firstName: 'Meralco', lastName: '-' })).toBe('Meralco');
    expect(inferContactUtilityTypes({ firstName: 'Meralco', lastName: '-', notes: '' })).toEqual([
      'electricity',
    ]);
  });

  it('caps landing featured properties at 2', () => {
    expect(LANDING_FEATURED_LIMIT).toBe(2);
  });

  it('excludes non-revenue units from collection SQL', () => {
    expect(ROOM_IS_REVENUE).toMatch(/is_revenue_unit/);
    expect(PAYMENT_IS_REVENUE_UNIT).toMatch(/FOR UPDATE|tenant_room_assignments|is_revenue_unit/);
  });
});
