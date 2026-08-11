export const STICKY_COLORS = ['lavender', 'sky', 'pink', 'mint', 'peach'] as const;
export type StickyColor = (typeof STICKY_COLORS)[number];

export interface AdminHomeSticky {
  id: string;
  userId: string;
  title: string;
  body: string;
  color: StickyColor;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export function isStickyColor(value: string): value is StickyColor {
  return (STICKY_COLORS as readonly string[]).includes(value);
}
