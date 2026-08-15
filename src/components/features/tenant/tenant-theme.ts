'use client';

/**
 * Shared visual tokens for the tenant portal.
 * Payments overview is the source of truth for spacing/hierarchy.
 */

export type TenantThemeMode = 'dark' | 'light';

export interface TenantThemeTokens {
  /** Page / main surface */
  page: string;
  pagePad: string;
  main: string;

  /** Shell chrome */
  shell: string;
  shellBorder: string;
  shellHeader: string;
  shellMuted: string;
  shellIconButton: string;
  shellOverlay: string;
  shellBadge: string;
  shellNavBorder: string;

  /** Cards, metric tiles, list panels */
  card: string;
  cardPad: string;
  panel: string;
  /** White inset for forms that still use gray-900 text */
  formPanel: string;

  /** Typography */
  title: string;
  sectionTitle: string;
  label: string;
  value: string;
  muted: string;
  subtle: string;
  body: string;
  listLabel: string;
  listValue: string;
  listTotalLabel: string;
  listTotalValue: string;
  divider: string;

  /** Pill tabs */
  tabBase: string;
  tabActive: string;
  tabInactive: string;

  /** Buttons */
  primaryButton: string;
  outlineButton: string;

  /** Sidebar / nav */
  navActive: string;
  navInactive: string;
  navChildActive: string;
  navChildInactive: string;
  navToggle: string;

  /** Skeleton pulse */
  bone: string;

  /** Semantic metric icons */
  iconMoney: string;
  iconInfo: string;
  iconDanger: string;
  iconSuccess: string;
  iconPending: string;

  /** Inputs on themed surfaces */
  input: string;
}

const dark: TenantThemeTokens = {
  page: 'bg-black text-zinc-100',
  pagePad: 'mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6',
  main: 'bg-black',

  shell: 'bg-black text-zinc-100',
  shellBorder: 'border-zinc-800',
  shellHeader: 'text-white',
  shellMuted: 'text-zinc-500',
  shellIconButton: 'rounded-lg p-2 text-zinc-300 hover:bg-zinc-800 hover:text-white',
  shellOverlay: 'bg-black/60',
  shellBadge: 'rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-300',
  shellNavBorder: 'border-zinc-800',

  card: 'overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow',
  cardPad: 'rounded-lg border border-zinc-800 bg-zinc-900 p-5 shadow',
  panel: 'rounded-lg border border-zinc-800 bg-zinc-900 shadow',
  formPanel: 'rounded-lg border border-zinc-800 bg-white text-gray-900 shadow',

  title: 'text-2xl font-semibold tracking-tight text-zinc-50',
  sectionTitle: 'text-base font-semibold text-zinc-50',
  label: 'truncate text-sm font-medium text-zinc-400',
  value: 'text-lg font-medium text-zinc-50',
  muted: 'text-sm text-zinc-400',
  subtle: 'text-xs text-zinc-500',
  body: 'text-sm text-zinc-300',
  listLabel: 'text-zinc-400',
  listValue: 'font-medium text-zinc-100',
  listTotalLabel: 'font-medium text-zinc-300',
  listTotalValue: 'text-base font-semibold text-zinc-50',
  divider: 'border-zinc-800',

  tabBase:
    'whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
  tabActive: 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300',
  tabInactive:
    'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200',

  primaryButton:
    'bg-emerald-500 text-white hover:bg-emerald-400 active:bg-emerald-600 focus-visible:ring-emerald-500 border-0',
  outlineButton:
    'border border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800 hover:text-white',

  navActive: 'bg-zinc-800 text-white ring-1 ring-emerald-500/40',
  navInactive: 'text-zinc-300 hover:bg-zinc-800/60 hover:text-white',
  navChildActive: 'text-emerald-300',
  navChildInactive: 'text-zinc-500 hover:text-zinc-200',
  navToggle: 'rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200',

  bone: 'animate-pulse rounded-md bg-zinc-800',

  iconMoney: 'text-emerald-400',
  iconInfo: 'text-sky-400',
  iconDanger: 'text-red-400',
  iconSuccess: 'text-emerald-400',
  iconPending: 'text-amber-400',

  input: 'border-zinc-700 bg-zinc-950 text-zinc-100',
};

const light: TenantThemeTokens = {
  page: 'bg-zinc-50 text-zinc-900',
  pagePad: 'mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6',
  main: 'bg-zinc-50',

  shell: 'bg-white text-zinc-900',
  shellBorder: 'border-zinc-200',
  shellHeader: 'text-zinc-900',
  shellMuted: 'text-zinc-500',
  shellIconButton: 'rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
  shellOverlay: 'bg-zinc-900/40',
  shellBadge: 'rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600',
  shellNavBorder: 'border-zinc-200',

  card: 'overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm',
  cardPad: 'rounded-lg border border-zinc-200 bg-white p-5 shadow-sm',
  panel: 'rounded-lg border border-zinc-200 bg-white shadow-sm',
  formPanel: 'rounded-lg border border-zinc-200 bg-white text-gray-900 shadow-sm',

  title: 'text-2xl font-semibold tracking-tight text-zinc-900',
  sectionTitle: 'text-base font-semibold text-zinc-900',
  label: 'truncate text-sm font-medium text-zinc-500',
  value: 'text-lg font-medium text-zinc-900',
  muted: 'text-sm text-zinc-500',
  subtle: 'text-xs text-zinc-500',
  body: 'text-sm text-zinc-600',
  listLabel: 'text-zinc-500',
  listValue: 'font-medium text-zinc-900',
  listTotalLabel: 'font-medium text-zinc-700',
  listTotalValue: 'text-base font-semibold text-zinc-900',
  divider: 'border-zinc-200',

  tabBase:
    'whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
  tabActive: 'border-emerald-600/50 bg-emerald-50 text-emerald-800',
  tabInactive:
    'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-800',

  primaryButton:
    'bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700 focus-visible:ring-emerald-600 border-0',
  outlineButton:
    'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900',

  navActive: 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200',
  navInactive: 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
  navChildActive: 'text-emerald-700 font-medium',
  navChildInactive: 'text-zinc-500 hover:text-zinc-800',
  navToggle: 'rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700',

  bone: 'animate-pulse rounded-md bg-zinc-200',

  iconMoney: 'text-emerald-600',
  iconInfo: 'text-sky-600',
  iconDanger: 'text-red-600',
  iconSuccess: 'text-emerald-600',
  iconPending: 'text-amber-600',

  input: 'border-zinc-300 bg-white text-zinc-900',
};

export const tenantThemePalettes = { dark, light } as const;

/** @deprecated Prefer useTenantTheme() — kept for non-React callers / default light */
export const tenantTheme = light;

export function getTenantTheme(mode: TenantThemeMode): TenantThemeTokens {
  return tenantThemePalettes[mode];
}

export function tenantTabClass(tokens: TenantThemeTokens, active: boolean) {
  return `${tokens.tabBase} ${active ? tokens.tabActive : tokens.tabInactive}`;
}
