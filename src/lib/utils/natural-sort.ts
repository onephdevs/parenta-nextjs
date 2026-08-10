/**
 * Natural / alphanumeric sort helpers for unit labels like "Unit 1", "Unit 10", "2A".
 */

const COLLATOR = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

/** Compare two strings with numeric awareness (1 < 2 < 10). */
export function compareNatural(a: string | null | undefined, b: string | null | undefined): number {
  return COLLATOR.compare(String(a || ''), String(b || ''));
}

/**
 * Sort key preferring room number, then display name.
 * Use for tenant pickers and property-grouped lists.
 */
export function compareByRoomThenName(
  a: {
    currentRoomNumber?: string | null;
    roomNumber?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  },
  b: {
    currentRoomNumber?: string | null;
    roomNumber?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  }
): number {
  const roomA = a.currentRoomNumber || a.roomNumber || '';
  const roomB = b.currentRoomNumber || b.roomNumber || '';
  if (roomA || roomB) {
    const byRoom = compareNatural(roomA, roomB);
    if (byRoom !== 0) return byRoom;
  }
  const nameA = `${a.lastName || ''} ${a.firstName || ''}`.trim();
  const nameB = `${b.lastName || ''} ${b.firstName || ''}`.trim();
  return compareNatural(nameA, nameB);
}
