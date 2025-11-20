import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import DashboardClient from '@/components/features/dashboard/DashboardClient';

export const metadata = {
  title: 'Financial Dashboard | Parenta',
  description: 'Financial performance and key metrics overview',
};

async function getDashboardData() {
  try {
    // In a server component, we can call the service directly
    // Or fetch from the API endpoint
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3030'}/api/dashboard/metrics`, {
      cache: 'no-store', // Always fetch fresh data
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch dashboard data');
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    return null;
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/auth/admin/signin');
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-gray-200 pb-5">
          <h1 className="text-3xl font-bold text-gray-900">
            Financial Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Real-time overview of your property management performance
          </p>
        </div>

        {/* Dashboard Content */}
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent />
        </Suspense>
      </div>
    </AdminLayout>
  );
}

async function DashboardContent() {
  const data = await getDashboardData();

  if (!data) {
    return (
      <div className="rounded-md bg-yellow-50 p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Unable to load dashboard data
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>Please try refreshing the page or contact support if the problem persists.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <DashboardClient initialData={data} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Metrics cards skeleton */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-64 bg-gray-100 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tables skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                  {[...Array(5)].map((_, j) => (
                    <div key={j} className="h-4 bg-gray-100 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

