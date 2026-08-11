'use client';

import { useState, useEffect } from 'react';
import { Session } from 'next-auth';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AdminSidebar from './AdminSidebar';
import GlobalSearchModal from '@/components/features/search/GlobalSearchModal';
import { NotificationBell } from '@/components/features/notifications/NotificationBell';
import { AdminBackButton } from '@/components/layout/AdminBackButton';
import { sanitizeReturnTo } from '@/lib/navigation';
import { Search, Settings, Menu, X, ChevronRight } from 'lucide-react';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface AdminLayoutClientProps {
  children: React.ReactNode;
  session: Session;
}

function defaultUuidLabel(parent: string | undefined): string {
  switch (parent) {
    case 'lease-management':
      return 'Lease';
    case 'tenants':
      return 'Tenant';
    case 'buildings':
      return 'Building';
    case 'rooms':
      return 'Room';
    case 'invoices':
      return 'Invoice';
    case 'payments':
      return 'Payment';
    case 'expenses':
      return 'Expense';
    case 'utility-bills':
      return 'Utility bill';
    default:
      return 'Details';
  }
}

export default function AdminLayoutClient({ children, session }: AdminLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [breadcrumbLabelOverrides, setBreadcrumbLabelOverrides] = useState<Record<string, string>>(
    {}
  );
  const pathname = usePathname();
  const [returnTo, setReturnTo] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setReturnTo(sanitizeReturnTo(params.get('returnTo')));
  }, [pathname]);

  // Resolve friendly names for any UUID segments in the path
  useEffect(() => {
    const paths = pathname.split('/').filter(Boolean);
    if (paths[0] !== 'admin') return;

    const uuidIndexes = paths
      .map((segment, index) => (UUID_REGEX.test(segment) ? index : -1))
      .filter((index) => index >= 0);

    if (uuidIndexes.length === 0) return;

    let cancelled = false;

    uuidIndexes.forEach((segmentIndex) => {
      const segment = paths[segmentIndex];
      const parent = paths[segmentIndex - 1];
      const href = '/' + paths.slice(0, segmentIndex + 1).join('/');

      const applyLabel = (label: string) => {
        if (cancelled || !label) return;
        setBreadcrumbLabelOverrides((prev) =>
          prev[href] === label ? prev : { ...prev, [href]: label }
        );
      };

      if (parent === 'buildings') {
        fetch(`/api/buildings/${segment}`, { credentials: 'include' })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.success && data?.data?.name) applyLabel(data.data.name);
          })
          .catch(() => {});
        return;
      }

      if (parent === 'tenants') {
        fetch(`/api/tenants/${segment}`, { credentials: 'include' })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.success && data?.data) {
              const t = data.data;
              const firstName = t.firstName ?? t.first_name;
              const lastName = t.lastName ?? t.last_name;
              applyLabel([firstName, lastName].filter(Boolean).join(' ') || t.email || 'Tenant');
            }
          })
          .catch(() => {});
        return;
      }

      if (parent === 'rooms') {
        fetch(`/api/rooms/${segment}`, { credentials: 'include' })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.success && data?.data) {
              applyLabel(
                data.data.roomNumber
                  ? `Room ${data.data.roomNumber}${
                      data.data.buildingName ? ` · ${data.data.buildingName}` : ''
                    }`
                  : 'Room'
              );
            }
          })
          .catch(() => {});
        return;
      }

      if (parent === 'lease-management') {
        fetch(`/api/leases/${segment}`, { credentials: 'include' })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            const lease = data?.data?.lease;
            if (data?.success && lease) {
              applyLabel(`${lease.buildingName || 'Property'} · ${lease.roomNumber || 'Unit'}`);
            }
          })
          .catch(() => {});
        return;
      }

      if (parent === 'utility-bills') {
        fetch(`/api/utility-bills/room?id=${segment}`, { credentials: 'include' })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            const bill = data?.data;
            if (data?.success && bill) {
              const type = String(bill.utilityType || bill.utility_type || 'Bill');
              const room = bill.roomNumber || bill.room_number;
              applyLabel(
                `${type.charAt(0).toUpperCase() + type.slice(1)}${room ? ` · Room ${room}` : ''}`
              );
            }
          })
          .catch(() => {});
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);
    return paths.map((path, index) => {
      const href = '/' + paths.slice(0, index + 1).join('/');
      const parent = paths[index - 1];
      const isUuid = UUID_REGEX.test(path);
      const override = breadcrumbLabelOverrides[href];
      const label =
        override ??
        (isUuid
          ? defaultUuidLabel(parent)
          : path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' '));
      return { href, label, isCurrent: index === paths.length - 1 };
    });
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div
        className={`relative z-[60] hidden lg:flex lg:flex-shrink-0 transition-all duration-300 ${
          sidebarOpen ? 'lg:w-64' : 'lg:w-0'
        }`}
      >
        <div className={`flex w-64 flex-col ${sidebarOpen ? '' : 'hidden'}`}>
          <AdminSidebar />
        </div>
      </div>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-gray-900 bg-opacity-50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 bg-black shadow-xl lg:hidden transform transition-transform duration-300 ease-in-out">
            <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
              <span className="text-lg font-bold text-white">Menu</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-md"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <AdminSidebar />
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="relative z-40 flex-shrink-0 border-b border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <div className="flex min-w-0 flex-1 items-center space-x-2">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-gray-900 hover:bg-gray-100 rounded-md lg:hidden"
              >
                <Menu className="w-6 h-6" />
              </button>

              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden lg:block p-2 text-gray-900 hover:bg-gray-100 rounded-md"
                title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {sidebarOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 5l7 7-7 7M5 5l7 7-7 7"
                    />
                  )}
                </svg>
              </button>

              <AdminBackButton returnTo={returnTo} />

              <nav className="hidden min-w-0 items-center space-x-1 overflow-hidden text-sm md:flex">
                {breadcrumbs.map((breadcrumb, index) => (
                  <div key={breadcrumb.href} className="flex min-w-0 items-center">
                    {index > 0 && (
                      <ChevronRight className="mx-1 h-4 w-4 flex-shrink-0 text-gray-400" />
                    )}
                    {breadcrumb.isCurrent ? (
                      <span className="truncate font-medium text-gray-900">{breadcrumb.label}</span>
                    ) : (
                      <Link
                        href={breadcrumb.href}
                        className="truncate text-gray-600 hover:text-gray-900"
                      >
                        {breadcrumb.label}
                      </Link>
                    )}
                  </div>
                ))}
              </nav>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSearchModalOpen(true)}
                className="hidden md:flex p-2 text-gray-900 hover:bg-gray-100 rounded-md"
                title="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              <NotificationBell />

              <Link
                href="/admin/settings"
                className="hidden md:flex p-2 text-gray-900 hover:bg-gray-100 rounded-md"
              >
                <Settings className="w-5 h-5" />
              </Link>

              <div className="flex items-center space-x-3 border-l border-gray-200 pl-3">
                <div className="hidden text-right lg:block">
                  <p className="text-sm font-medium text-gray-900">
                    {session.user.firstName} {session.user.lastName}
                  </p>
                  <p className="text-xs capitalize text-gray-900">{session.user.role}</p>
                </div>
                <Link href="/admin/profile" className="flex-shrink-0">
                  <div className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-blue-600 font-semibold text-white hover:bg-blue-700">
                    {session.user.firstName?.charAt(0)}
                    {session.user.lastName?.charAt(0)}
                  </div>
                </Link>
              </div>

              <button
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="hidden sm:flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
                title="Sign out"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span className="ml-2 hidden xl:inline">Sign Out</span>
              </button>
            </div>
          </div>

          <div className="border-t border-gray-100 px-4 pb-3 md:hidden">
            <nav className="mt-3 flex items-center space-x-2 text-sm">
              {breadcrumbs.map((breadcrumb, index) => (
                <div key={breadcrumb.href} className="flex items-center">
                  {index > 0 && <ChevronRight className="mx-1 h-3 w-3 text-gray-400" />}
                  {breadcrumb.isCurrent ? (
                    <span className="truncate font-medium text-gray-900">{breadcrumb.label}</span>
                  ) : (
                    <Link href={breadcrumb.href} className="truncate text-gray-600">
                      {breadcrumb.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </header>

        <main data-app-main className="relative flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>

      <GlobalSearchModal isOpen={searchModalOpen} onClose={() => setSearchModalOpen(false)} />
    </div>
  );
}
