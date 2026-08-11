export const WIDGETS_STORAGE_KEY = 'parenta.adminHome.widgets.v1';
export const PINNED_LINKS_STORAGE_KEY = 'parenta.adminHome.pinnedLinks.v1';

export interface HomeWidgetVisibility {
  quickLinks: boolean;
  recents: boolean;
  stickies: boolean;
  ledger: boolean;
}

export const DEFAULT_WIDGETS: HomeWidgetVisibility = {
  quickLinks: true,
  recents: true,
  stickies: true,
  ledger: true,
};

export interface PinnedQuickLink {
  id: string;
  title: string;
  href: string;
}

export function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function relativeTime(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function formatHomeClock(now: Date): string {
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
  const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${weekday}, ${date} ${time}`;
}
