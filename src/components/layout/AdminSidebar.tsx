'use client';

import React, { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/ui/BrandLogo';

interface MenuItem {
  name: string;
  href?: string;
  icon?: React.ReactElement;
  children?: MenuItem[];
}

type NavEntry = MenuItem | { type: 'divider'; id: string };

function isDivider(entry: NavEntry): entry is { type: 'divider'; id: string } {
  return 'type' in entry && entry.type === 'divider';
}

const NAV_BG = '#000000';
const NAV_ACCENT = '#FFFFFF';
const LATO = 'var(--font-lato), Lato, sans-serif';

interface AdminSidebarProps {
  /** When true, show icon-only rail so navigation stays usable. */
  collapsed?: boolean;
}

export default function AdminSidebar({ collapsed = false }: AdminSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const isCaretaker = session?.user?.role === 'caretaker';

  const displayName =
    [session?.user?.firstName, session?.user?.lastName].filter(Boolean).join(' ') ||
    session?.user?.email ||
    (isCaretaker ? 'Caretaker' : 'Admin');

  const isActive = (href: string) => {
    // Exact match for dashboard root so /admin does not light up on every admin page
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const caretakerBlockedHref = (href?: string) => {
    if (!href || !isCaretaker) return false;
    const blockedPrefixes = [
      '/admin/reports',
      '/admin/financial/reports',
      '/admin/financial/expenses',
      '/admin/financial/dashboard',
      '/admin/financial/advanced-analytics',
      '/admin/financial/late-fees',
      '/admin/bills-expenses/reports',
      '/admin/analytics',
      '/admin/export',
      '/admin/users',
      '/admin/tools',
    ];
    return blockedPrefixes.some(
      (p) => href === p || href.startsWith(`${p}/`) || href.startsWith(`${p}?`)
    );
  };

  const filterMenuForRole = (entries: NavEntry[]): NavEntry[] => {
    if (!isCaretaker) return entries;
    const filtered: NavEntry[] = [];
    for (const entry of entries) {
      if (isDivider(entry)) {
        filtered.push(entry);
        continue;
      }
      if (entry.name === 'Reports' || entry.name === 'Bills & Expenses' || entry.name === 'Users') {
        continue;
      }
      if (caretakerBlockedHref(entry.href)) continue;
      const children = entry.children?.filter((c) => !caretakerBlockedHref(c.href));
      filtered.push({ ...entry, ...(children ? { children } : {}) });
    }
    return filtered.filter((e, i, arr) => {
      if (!isDivider(e)) return true;
      const prev = arr[i - 1];
      const next = arr[i + 1];
      if (!prev || !next) return false;
      return !isDivider(prev) && !isDivider(next);
    });
  };

  const menuItems: NavEntry[] = filterMenuForRole([
    {
      name: 'Dashboard',
      href: '/admin',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'Tasks',
      href: '/admin/tasks',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    { type: 'divider', id: 'after-overview' },
    {
      name: 'Properties',
      href: '/admin/properties',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      name: 'Tenants',
      href: '/admin/tenants',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      name: 'People',
      href: '/admin/people',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    { type: 'divider', id: 'after-people' },
    {
      name: 'Leasing',
      href: '/admin/leasing',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      children: [
        {
          name: 'Lease Templates',
          href: '/admin/lease-templates',
        },
      ],
    },
    {
      name: 'Documents',
      href: '/admin/documents',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      children: [
        {
          name: 'Lease Designer',
          href: '/admin/documents/lease-designer',
        },
        {
          name: 'Templates',
          href: '/admin/documents/templates',
        },
      ],
    },
    {
      name: 'Payments',
      href: '/admin/financial/payments',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      children: [
        {
          name: 'Invoices',
          href: '/admin/financial/invoices',
        },
        {
          name: 'Financial Dashboard',
          href: '/admin/financial/dashboard',
        },
        {
          name: 'Tenant pay details',
          href: '/admin/settings?tab=payments',
        },
        {
          name: 'Reports & Analytics',
          href: '/admin/financial/reports',
        },
      ],
    },
    { type: 'divider', id: 'after-contracts' },
    {
      name: 'Bills & Expenses',
      href: '/admin/bills-expenses/utility-bills',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      children: [
        {
          name: 'Utility Bills',
          href: '/admin/bills-expenses/utility-bills',
        },
        {
          name: 'Unit groups',
          href: '/admin/bills-expenses/unit-groups',
        },
        {
          name: 'Expenses',
          href: '/admin/financial/expenses',
        },
        {
          name: 'Reports',
          href: '/admin/bills-expenses/reports',
        },
      ],
    },
    {
      name: 'Utilities',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      children: [
        {
          name: 'Meter Readings',
          href: '/admin/utilities/readings',
        },
        {
          name: 'Cost Allocation',
          href: '/admin/utilities/cost-allocation',
        },
      ],
    },
    {
      name: 'Assets',
      href: '/admin/assets',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      name: 'Reports',
      href: '/admin/reports',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    { type: 'divider', id: 'after-ops' },
    {
      name: 'Maintenance',
      href: '/admin/maintenance',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 18v-6a9 9 0 0118 0v6"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"
          />
        </svg>
      ),
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    {
      name: 'Activity',
      href: '/admin/activity',
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ]);

  // Expand only the section that owns the current route; everything else stays collapsed
  useEffect(() => {
    const activeParents = menuItems
      .filter((entry): entry is MenuItem => !isDivider(entry))
      .filter(
        (item) =>
          (item.href && isActive(item.href)) ||
          item.children?.some((child) => child.href && isActive(child.href))
      )
      .map((item) => item.name);
    setExpandedSections(activeParents);
    // menuItems / isActive are driven by pathname
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isCaretaker]);

  const toggleSection = (sectionName: string) => {
    setExpandedSections((prev) => (prev.includes(sectionName) ? [] : [sectionName]));
  };

  const parentRowClass = (highlighted: boolean) =>
    `flex w-full items-center rounded-lg text-sm transition-colors ${
      collapsed
        ? `justify-center px-0 py-2.5 ${
            highlighted
              ? 'bg-white/10 font-semibold text-white'
              : 'font-medium text-white/70 hover:bg-white/[0.06] hover:text-white'
          }`
        : `gap-3 px-2.5 py-1.5 ${
            highlighted
              ? 'bg-white/10 font-semibold text-white'
              : 'font-medium text-white/70 hover:bg-white/[0.06] hover:text-white'
          }`
    }`;

  const renderChildLink = (child: MenuItem) => {
    const childActive = child.href ? isActive(child.href) : false;
    return (
      <li key={child.name}>
        <Link
          href={child.href!}
          className={`block rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
            childActive
              ? 'bg-white/10 font-semibold'
              : 'font-normal text-white/55 hover:bg-white/[0.06] hover:text-white'
          }`}
          style={childActive ? { color: NAV_ACCENT } : undefined}
        >
          {child.name}
        </Link>
      </li>
    );
  };

  const renderMenuItem = (item: MenuItem) => {
    const hasChildren = Boolean(item.children && item.children.length > 0);
    const isExpanded = !collapsed && expandedSections.includes(item.name);
    // A child that duplicates the parent href should not steal the parent highlight.
    const childIsActive = Boolean(
      item.children?.some((child) => {
        if (!child.href || !isActive(child.href)) return false;
        if (item.href && child.href === item.href) return false;
        return true;
      })
    );
    const active = item.href ? isActive(item.href) : false;
    // Parent highlight only when this page is active and no distinct child owns the route
    const parentHighlight = hasChildren ? active && !childIsActive : active;
    const sectionAccent = parentHighlight || childIsActive;

    if (hasChildren) {
      return (
        <div key={item.name}>
          {item.href ? (
            <Link
              href={item.href}
              className={parentRowClass(parentHighlight)}
              title={collapsed ? item.name : undefined}
              aria-label={collapsed ? item.name : undefined}
              onClick={() => {
                if (!collapsed) setExpandedSections([item.name]);
              }}
            >
              {item.icon && (
                <span
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center"
                  style={{ color: sectionAccent ? NAV_ACCENT : 'currentColor' }}
                >
                  {item.icon}
                </span>
              )}
              {!collapsed && <span>{item.name}</span>}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => toggleSection(item.name)}
              className={parentRowClass(parentHighlight)}
              aria-expanded={isExpanded}
              title={collapsed ? item.name : undefined}
              aria-label={collapsed ? item.name : undefined}
            >
              {item.icon && (
                <span
                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center"
                  style={{ color: sectionAccent ? NAV_ACCENT : 'currentColor' }}
                >
                  {item.icon}
                </span>
              )}
              {!collapsed && <span>{item.name}</span>}
            </button>
          )}
          {isExpanded && (
            <ul className="mt-0.5 space-y-0.5 pl-8">
              {item.children?.map((child) => renderChildLink(child))}
            </ul>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.name}
        href={item.href!}
        className={parentRowClass(active)}
        title={collapsed ? item.name : undefined}
        aria-label={collapsed ? item.name : undefined}
        onClick={() => setExpandedSections([])}
      >
        {item.icon && (
          <span
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center"
            style={{ color: active ? NAV_ACCENT : 'currentColor' }}
          >
            {item.icon}
          </span>
        )}
        {!collapsed && <span>{item.name}</span>}
      </Link>
    );
  };

  return (
    <div
      className="flex h-full flex-col"
      style={{ backgroundColor: NAV_BG, fontFamily: LATO }}
    >
      {/* Logo */}
      <div
        className={`flex h-16 items-center border-b border-white/10 ${
          collapsed ? 'justify-center px-2' : 'px-4'
        }`}
      >
        <Link
          href="/admin"
          className="flex items-center"
          aria-label="Alfonso Properties"
          title={collapsed ? 'Alfonso Properties' : undefined}
        >
          <BrandLogo
            variant={collapsed ? 'mark' : 'full'}
            height={collapsed ? 28 : 32}
            priority
            className="brightness-0 invert"
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto py-3 ${collapsed ? 'px-1.5' : 'px-3'}`}>
        <div className="space-y-0.5">
          {menuItems.map((entry) =>
            isDivider(entry) ? (
              <div
                key={entry.id}
                role="separator"
                className={`my-3 border-t border-white/10 ${collapsed ? 'mx-1' : 'mx-2'}`}
              />
            ) : (
              renderMenuItem(entry)
            )
          )}
        </div>
      </nav>

      {/* User Profile */}
      <div className={`border-t border-white/10 ${collapsed ? 'p-2' : 'p-4'}`}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <Link
              href="/admin/profile"
              title={displayName}
              aria-label={displayName}
              className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold uppercase text-black"
              style={{ backgroundColor: NAV_ACCENT }}
            >
              {session?.user?.firstName || session?.user?.lastName ? (
                `${session.user.firstName?.charAt(0) || ''}${session.user.lastName?.charAt(0) || ''}`
              ) : (
                <svg className="h-5 w-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="p-1.5 text-white/40 transition-colors hover:text-white"
              title="Sign out"
              aria-label="Sign out"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold uppercase text-black"
                style={{ backgroundColor: NAV_ACCENT }}
              >
                {session?.user?.firstName || session?.user?.lastName ? (
                  `${session.user.firstName?.charAt(0) || ''}${session.user.lastName?.charAt(0) || ''}`
                ) : (
                  <svg className="h-6 w-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{displayName}</p>
              <p className="truncate text-xs text-white/50">{session?.user?.email || ''}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="p-1 text-white/40 transition-colors hover:text-white"
              title="Sign out"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

