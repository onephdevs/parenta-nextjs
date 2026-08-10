import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import DashboardClient from '@/components/features/dashboard/DashboardClient';
import { getAllDashboardMetrics } from '@/lib/services/dashboard-service';

export const metadata = {
  title: 'Financial Dashboard | Alfonso Property Management System',
  description: 'Financial performance and key metrics overview',
};

async function getDashboardData() {
  try {
    const data = await getAllDashboardMetrics();
    return data;
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    return null;
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Financial Dashboard"
        description="Real-time overview of your property management performance"
      />

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

async function DashboardContent() {
  const data = await getDashboardData();

  if (!data) {
    return (
      <div className="overflow-hidden rounded-lg border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
        <h3 className="text-sm font-medium text-yellow-800">Unable to load dashboard data</h3>
        <p className="mt-2 text-sm text-yellow-700">
          Please try refreshing the page or contact support if the problem persists.
        </p>
      </div>
    );
  }

  return <DashboardClient initialData={data} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="mb-4 h-4 w-1/2 rounded bg-gray-200" />
              <div className="h-8 w-3/4 rounded bg-gray-200" />
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="h-3 w-1/3 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="animate-pulse overflow-hidden rounded-lg bg-white shadow">
            <div className="p-6">
              <div className="mb-4 h-6 w-1/3 rounded bg-gray-200" />
              <div className="h-64 rounded bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
