'use client';

import { useState } from 'react';
import { Session } from 'next-auth';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AdminSidebar from './AdminSidebar';
import GlobalSearchModal from '@/components/features/search/GlobalSearchModal';
import { Bell, Search, Settings, Menu, X, ChevronRight } from 'lucide-react';

interface AdminLayoutClientProps {
  children: React.ReactNode;
  session: Session;
}

export default function AdminLayoutClient({ children, session }: AdminLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const pathname = usePathname();

  // Generate breadcrumbs from pathname
  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs = paths.map((path, index) => {
      const href = '/' + paths.slice(0, index + 1).join('/');
      const label = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');
      return { href, label };
    });
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div 
        className={`hidden lg:flex lg:flex-shrink-0 transition-all duration-300 ${
          sidebarOpen ? 'lg:w-64' : 'lg:w-0'
        }`}
      >
        <div className={`flex flex-col w-64 ${sidebarOpen ? '' : 'hidden'}`}>
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
          <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl lg:hidden transform transition-transform duration-300 ease-in-out">
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
              <span className="text-lg font-bold text-gray-900">Menu</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-gray-900 hover:text-gray-900 hover:bg-gray-100 rounded-md"
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
        {/* Top Navigation Bar */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm z-10">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            {/* Left Section: Menu + Breadcrumbs */}
            <div className="flex items-center space-x-4 flex-1">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-gray-900 hover:text-gray-900 hover:bg-gray-100 rounded-md lg:hidden"
              >
                <Menu className="w-6 h-6" />
              </button>

              {/* Desktop Sidebar Toggle */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden lg:block p-2 text-gray-900 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {sidebarOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  )}
                </svg>
              </button>

              {/* Breadcrumbs */}
              <nav className="hidden md:flex items-center space-x-2 text-sm">
                {breadcrumbs.map((breadcrumb, index) => (
                  <div key={breadcrumb.href} className="flex items-center">
                    {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />}
                    <Link
                      href={breadcrumb.href}
                      className={`${
                        index === breadcrumbs.length - 1
                          ? 'text-gray-900 font-medium'
                          : 'text-gray-900 hover:text-gray-900'
                      }`}
                    >
                      {breadcrumb.label}
                    </Link>
                  </div>
                ))}
              </nav>
            </div>

            {/* Right Section: Search, Notifications, Profile */}
            <div className="flex items-center space-x-3">
              {/* Search Button */}
              <button 
                onClick={() => setSearchModalOpen(true)}
                className="hidden md:flex p-2 text-gray-900 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                title="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Notifications */}
              <Link
                href="/admin/notifications"
                className="p-2 text-gray-900 hover:text-gray-900 hover:bg-gray-100 rounded-md relative"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              </Link>

              {/* Settings */}
              <Link
                href="/admin/settings"
                className="hidden md:flex p-2 text-gray-900 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                <Settings className="w-5 h-5" />
              </Link>

              {/* User Profile */}
              <div className="flex items-center space-x-3 pl-3 border-l border-gray-200">
                <div className="hidden lg:block text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {session.user.firstName} {session.user.lastName}
                  </p>
                  <p className="text-xs text-gray-900 capitalize">{session.user.role}</p>
                </div>
                <Link
                  href="/admin/profile"
                  className="flex-shrink-0"
                >
                  <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold hover:bg-blue-700 transition-colors cursor-pointer">
                    {session.user.firstName?.charAt(0)}{session.user.lastName?.charAt(0)}
                  </div>
                </Link>
              </div>

              {/* Sign Out */}
              <button
                onClick={() => signOut({ callbackUrl: '/auth/signin?role=admin' })}
                className="hidden sm:flex items-center px-3 py-2 text-sm font-medium text-gray-900 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="Sign out"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="ml-2 hidden xl:inline">Sign Out</span>
              </button>
            </div>
          </div>

          {/* Mobile Breadcrumbs */}
          <div className="md:hidden px-4 pb-3 border-t border-gray-100">
            <nav className="flex items-center space-x-2 text-sm mt-3">
              {breadcrumbs.map((breadcrumb, index) => (
                <div key={breadcrumb.href} className="flex items-center">
                  {index > 0 && <ChevronRight className="w-3 h-3 text-gray-400 mx-1" />}
                  <Link
                    href={breadcrumb.href}
                    className={`${
                      index === breadcrumbs.length - 1
                        ? 'text-gray-900 font-medium'
                        : 'text-gray-900'
                    } truncate`}
                  >
                    {breadcrumb.label}
                  </Link>
                </div>
              ))}
            </nav>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </div>
  );
}

