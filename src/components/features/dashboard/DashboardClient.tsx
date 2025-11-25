'use client';

import { useState, useEffect } from 'react';
import MetricsOverview from './MetricsOverview';
import RevenueChart from './RevenueChart';
import InvoiceStatusChart from './InvoiceStatusChart';
import RecentPaymentsTimeline from './RecentPaymentsTimeline';
import OccupancyWidget from './OccupancyWidget';
import UpcomingDueDates from './UpcomingDueDates';
import TopTenantsList from './TopTenantsList';

interface DashboardClientProps {
  initialData: any;
}

export default function DashboardClient({ initialData }: DashboardClientProps) {
  const [data, setData] = useState(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/dashboard/metrics', {
        credentials: 'include',
      });
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={refreshData}
          disabled={isRefreshing}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <svg
            className={`-ml-1 mr-2 h-5 w-5 text-gray-900 ${isRefreshing ? 'animate-spin' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
              clipRule="evenodd"
            />
          </svg>
          {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Metrics Overview Cards */}
      <MetricsOverview
        revenue={data.revenue}
        outstanding={data.outstanding}
        occupancy={data.occupancy}
      />

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RevenueChart data={data.monthlyRevenueTrend} />
        <InvoiceStatusChart data={data.invoiceBreakdown} />
      </div>

      {/* Occupancy Widget (Full Width) */}
      <OccupancyWidget data={data.occupancy} />

      {/* Lists Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentPaymentsTimeline payments={data.recentPayments} />
        <UpcomingDueDates dueDates={data.upcomingDueDates} />
      </div>

      {/* Top Tenants */}
      <TopTenantsList tenants={data.topTenants} />
    </div>
  );
}

