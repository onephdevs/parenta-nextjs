'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  Home,
  CreditCard,
  FileText,
  User,
  Menu,
  X,
  ChevronDown,
  Moon,
  Sun,
  LogOut,
  Settings,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { NotificationBell } from '@/components/features/notifications/NotificationBell';
import { useTenantPortalGate } from '@/hooks/useTenantPortalGate';
import { useTenantTheme } from '@/hooks/useTenantTheme';
import {
  useTenantData,
  fetchTenantProfile,
  fetchTenantBalance,
  fetchTenantPayments,
  fetchTenantDocuments,
} from '@/hooks/useTenantPortalData';
import TenantCompleteProfileGate from '@/components/features/tenant/TenantCompleteProfileGate';

interface NavChild {
  label: string;
  href: string;
  badge?: string;
}

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: typeof Home;
  children?: NavChild[];
}

const NAV: NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/tenant',
    icon: Home,
  },
  {
    id: 'payments',
    label: 'Payments',
    href: '/tenant/payments',
    icon: CreditCard,
    children: [
      { label: 'Overview & balance', href: '/tenant/payments?tab=overview' },
      { label: 'Pay online', href: '/tenant/payments?tab=pay' },
      { label: 'Upload receipt', href: '/tenant/payments?tab=upload' },
      { label: 'History', href: '/tenant/payments?tab=history' },
      {
        label: 'Statements',
        href: '/tenant/payments?tab=statements',
        badge: 'PDF / Excel',
      },
    ],
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    href: '/tenant/maintenance',
    icon: Wrench,
  },
  {
    id: 'documents',
    label: 'Documents',
    href: '/tenant/documents',
    icon: FileText,
  },
  {
    id: 'profile',
    label: 'Profile',
    href: '/tenant/profile',
    icon: User,
    children: [
      { label: 'Personal info', href: '/tenant/profile?section=personal' },
      { label: 'Occupants', href: '/tenant/profile?section=occupants' },
      { label: 'Emergency contact', href: '/tenant/profile?section=emergency' },
      { label: 'Account & password', href: '/tenant/profile?section=account' },
    ],
  },
];

function pathMatches(pathname: string, href: string) {
  const base = href.split('?')[0];
  if (base === '/tenant') return pathname === '/tenant';
  return pathname === base || pathname.startsWith(`${base}/`);
}

function childIsActive(pathname: string, search: string, href: string) {
  const [path, query = ''] = href.split('?');
  if (pathname !== path && !pathname.startsWith(`${path}/`)) return false;
  if (!query) return true;
  const wanted = new URLSearchParams(query);
  const current = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  for (const [key, value] of wanted.entries()) {
    if (current.get(key) !== value) return false;
  }
  return true;
}

function defaultExpandedFor(activeParentId: string): Record<string, boolean> {
  const next: Record<string, boolean> = {};
  for (const item of NAV) {
    if (item.children?.length) {
      // Only the active parent with children is open
      next[item.id] = item.id === activeParentId;
    }
  }
  return next;
}

export function TenantPortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? '';
  const [mobileOpen, setMobileOpen] = useState(false);
  const { canAccess, isPreview, exitPreview } = useTenantPortalGate();
  const { load } = useTenantData();
  const theme = useTenantTheme();

  useEffect(() => {
    if (!canAccess) return;
    void load('profile', fetchTenantProfile).catch(() => undefined);
    void load('balance', fetchTenantBalance).catch(() => undefined);
    void load('payments', fetchTenantPayments).catch(() => undefined);
    void load('documents', fetchTenantDocuments).catch(() => undefined);
  }, [canAccess, load]);

  const activeParentId = useMemo(() => {
    if (pathname.startsWith('/tenant/payments') || pathname.startsWith('/tenant/reports')) {
      return 'payments';
    }
    if (pathname.startsWith('/tenant/maintenance')) return 'maintenance';
    if (pathname.startsWith('/tenant/documents')) return 'documents';
    if (pathname.startsWith('/tenant/profile')) return 'profile';
    return 'home';
  }, [pathname]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    defaultExpandedFor(activeParentId)
  );

  // Keep only the current section's submenu open when the route changes
  useEffect(() => {
    setExpanded(defaultExpandedFor(activeParentId));
  }, [activeParentId]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSignOut = () => {
    void signOut({
      callbackUrl: '/auth/signin',
      redirect: true,
    });
  };

  const BrandBlock = (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <BrandLogo variant="mark" height={36} priority className="shrink-0" />
      <div className="min-w-0">
        <p className={cn('truncate text-sm font-semibold', theme.shellHeader)}>Alfonso</p>
        <p className={cn('text-[11px]', theme.shellMuted)}>Tenant portal</p>
      </div>
    </div>
  );

  const ThemeToggle = (
    <button
      type="button"
      onClick={theme.toggleMode}
      aria-label={theme.mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={theme.mode === 'dark' ? 'Light theme' : 'Dark theme'}
      className={theme.shellIconButton}
    >
      {theme.mode === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );

  const MenuFooter = (
    <div className={cn('mt-auto space-y-1 border-t px-3 py-3', theme.shellBorder)}>
      <div className="flex items-center justify-between gap-2 px-1 py-1">
        <span className={cn('text-xs font-medium', theme.shellMuted)}>
          {theme.mode === 'dark' ? 'Dark theme' : 'Light theme'}
        </span>
        {ThemeToggle}
      </div>
      <Link
        href="/tenant/profile?section=account"
        onClick={() => setMobileOpen(false)}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
          theme.navInactive
        )}
      >
        <Settings className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        Manage account
      </Link>
      {isPreview ? (
        <button
          type="button"
          onClick={() => {
            setMobileOpen(false);
            void exitPreview();
          }}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
            theme.navInactive
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          Exit preview
        </button>
      ) : (
        <button
          type="button"
          onClick={handleSignOut}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
            theme.navInactive
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          Sign out
        </button>
      )}
    </div>
  );

  const NavBody = (
    <>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = activeParentId === item.id;
          const isExpanded = Boolean(expanded[item.id]);
          const hasChildren = Boolean(item.children?.length);

          return (
            <div key={item.id} className="space-y-0.5">
              <div className="flex items-center gap-1">
                <Link
                  href={hasChildren ? item.children![0].href : item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                    isActive ? theme.navActive : theme.navInactive
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  {item.label}
                </Link>
                {hasChildren && (
                  <button
                    type="button"
                    aria-label={`Toggle ${item.label}`}
                    onClick={() => toggleExpand(item.id)}
                    className={theme.navToggle}
                  >
                    <ChevronDown
                      className={cn('h-4 w-4 transition', isExpanded ? 'rotate-0' : '-rotate-90')}
                    />
                  </button>
                )}
              </div>

              {hasChildren && isExpanded && (
                <ul className={cn('ml-4 space-y-0.5 border-l pl-3', theme.shellNavBorder)}>
                  {item.children!.map((child) => {
                    const childActive = childIsActive(pathname, search, child.href);
                    return (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            'flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition',
                            childActive ? theme.navChildActive : theme.navChildInactive
                          )}
                        >
                          <span>{child.label}</span>
                          {child.badge && (
                            <span className={cn('shrink-0', theme.shellBadge)}>{child.badge}</span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
      {MenuFooter}
    </>
  );

  return (
    <div className={cn('flex min-h-screen', theme.page)}>
      <TenantCompleteProfileGate />
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r md:flex',
          theme.shell,
          theme.shellBorder
        )}
      >
        <div className={cn('flex items-center gap-2 border-b px-4 py-4', theme.shellBorder)}>
          {BrandBlock}
          <NotificationBell variant="tenant" />
        </div>
        {NavBody}
      </aside>

      {/* Mobile top bar */}
      <div
        className={cn(
          'fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b px-4 py-3 backdrop-blur md:hidden',
          theme.shell,
          theme.shellBorder,
          theme.mode === 'dark' ? 'bg-black/95' : 'bg-white/95'
        )}
      >
        <div className="flex items-center gap-2.5">
          <BrandLogo variant="mark" height={28} className="shrink-0" />
          <span className={cn('text-sm font-semibold', theme.shellHeader)}>Alfonso</span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell variant="tenant" />
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className={theme.shellIconButton}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className={cn('absolute inset-0', theme.shellOverlay)}
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className={cn('absolute inset-y-0 left-0 flex w-72 flex-col shadow-xl', theme.shell)}
          >
            <div
              className={cn(
                'flex items-center justify-between border-b px-4 py-3',
                theme.shellBorder
              )}
            >
              <span className={cn('text-sm font-semibold', theme.shellHeader)}>Menu</span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setMobileOpen(false)}
                className={theme.shellIconButton}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {NavBody}
          </aside>
        </div>
      )}

      <div className={cn('flex min-w-0 flex-1 flex-col pt-14 md:pt-0', theme.main)}>
        {children}
      </div>
    </div>
  );
}

export function isTenantPaymentsPath(pathname: string) {
  return pathMatches(pathname, '/tenant/payments') || pathMatches(pathname, '/tenant/reports');
}
