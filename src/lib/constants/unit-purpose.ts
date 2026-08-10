/** Unit purpose — same rooms schema; ADMIN units are non-revenue. */

export const UNIT_PURPOSES = ['residential', 'store', 'admin'] as const;
export type UnitPurpose = (typeof UNIT_PURPOSES)[number];

export const UNIT_PURPOSE_LABELS: Record<UnitPurpose, string> = {
  residential: 'Residential (rent)',
  store: 'Store / commercial (rent)',
  admin: 'Admin / owner (utilities only, no rent)',
};

export function unitPurposeFromRoom(input: {
  roomType?: string | null;
  isRevenueUnit?: boolean | null;
}): UnitPurpose {
  if (input.isRevenueUnit === false) return 'admin';
  const type = String(input.roomType || '').toLowerCase();
  if (type === 'store' || type === 'commercial' || type === 'shop') return 'store';
  return 'residential';
}

export function applyUnitPurpose(
  purpose: UnitPurpose,
  currentRoomType?: string | null
): { roomType: string; isRevenueUnit: boolean; monthlyRateHint?: number } {
  if (purpose === 'admin') {
    return {
      roomType: 'admin',
      isRevenueUnit: false,
      monthlyRateHint: 0,
    };
  }
  if (purpose === 'store') {
    return { roomType: 'store', isRevenueUnit: true };
  }
  const type = String(currentRoomType || '').toLowerCase();
  if (type === 'admin' || type === 'store' || type === 'commercial' || type === 'shop') {
    return { roomType: 'studio', isRevenueUnit: true };
  }
  return {
    roomType: currentRoomType || 'studio',
    isRevenueUnit: true,
  };
}
