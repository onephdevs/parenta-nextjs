import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { Wrench, Home, ClipboardList, ArrowRight } from 'lucide-react';
import { LogoutButton } from '@/components/features/LogoutButton';

export default async function StaffHomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Staff portal accepts staff role; admins can also open it for convenience
  if (session.user.role !== 'staff' && session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  const links = [
    {
      title: 'Maintenance Queue',
      description: 'View and update maintenance requests',
      href: '/admin/maintenance',
      icon: Wrench,
    },
    {
      title: 'Rooms',
      description: 'Check room status and occupancy',
      href: '/admin/rooms',
      icon: Home,
    },
    {
      title: 'Activity Logs',
      description: 'Recent operational activity',
      href: '/admin/activity-logs',
      icon: ClipboardList,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Staff Portal</h1>
            <p className="text-sm text-gray-600">
              Signed in as {session.user.firstName || session.user.email} ({session.user.role})
            </p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900">Operations</h2>
          <p className="mt-1 text-gray-600">
            Quick access to day-to-day property tasks. Full admin tools remain under the admin portal.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:border-purple-300 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="rounded-md bg-purple-100 p-2 text-purple-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-purple-600" />
                </div>
                <h3 className="font-medium text-gray-900">{item.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{item.description}</p>
              </Link>
            );
          })}
        </div>

        {session.user.role === 'admin' && (
          <p className="mt-8 text-sm text-gray-500">
            You are signed in as admin —{' '}
            <Link href="/admin" className="text-purple-600 hover:underline">
              open Admin Dashboard
            </Link>
            .
          </p>
        )}
      </main>
    </div>
  );
}
