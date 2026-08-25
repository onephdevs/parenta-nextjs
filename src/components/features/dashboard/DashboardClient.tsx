'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FilterBar } from '@/components/ui/FilterBar';
import { FormField } from '@/components/forms/FormField';
import { Select } from '@/components/ui/Select';
import MetricsOverview from './MetricsOverview';
import RevenueChart from './RevenueChart';
import InvoiceStatusChart from './InvoiceStatusChart';
import RecentPaymentsTimeline from './RecentPaymentsTimeline';
import OccupancyWidget from './OccupancyWidget';
import UpcomingDueDates from './UpcomingDueDates';

interface DashboardClientProps {
  initialData: any;
}

export default function DashboardClient({ initialData }: DashboardClientProps) {
  const [data, setData] = useState(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [range, setRange] = useState('month');

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
      <FilterBar
        columns={4}
        collapsible
        activeCount={range !== 'month' ? 1 : 0}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600">
              {range === 'year' ? 'Showing yearly performance' : 'Showing this month'}
            </p>
            <Button
              variant="outline"
              onClick={refreshData}
              isLoading={isRefreshing}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          </div>
        }
      >
        <FormField label="Period" htmlFor="dashboard-range">
          <Select
            id="dashboard-range"
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            <option value="month">This month</option>
            <option value="year">This year</option>
          </Select>
        </FormField>
      </FilterBar>

      <MetricsOverview
        revenue={data.revenue}
        outstanding={data.outstanding}
        occupancy={data.occupancy}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RevenueChart data={data.monthlyRevenueTrend} />
        <InvoiceStatusChart data={data.invoiceBreakdown} />
      </div>

      <OccupancyWidget data={data.occupancy} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentPaymentsTimeline payments={data.recentPayments} />
        <UpcomingDueDates dueDates={data.upcomingDueDates} />
      </div>
    </div>
  );
}
