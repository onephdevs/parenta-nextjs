'use client';

import {
  AlertTriangle,
  Building2,
  DollarSign,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { ListSummaryCard } from '@/components/ui/ListSummaryCard';

interface MetricsOverviewProps {
  revenue: {
    monthly?: number;
    yearly?: number;
    monthlyGrowth?: number;
    yearlyGrowth?: number;
    currentMonth?: string;
    currentYear?: number;
  };
  outstanding: {
    total?: number;
    count?: number;
    overdue?: number;
  };
  occupancy: {
    occupancyRate?: number;
    occupiedRooms?: number;
    totalRooms?: number;
  };
}

function formatMoney(amount?: number) {
  return `₱${(amount ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function MetricsOverview({
  revenue,
  outstanding,
  occupancy,
}: MetricsOverviewProps) {
  const monthlyGrowth = revenue?.monthlyGrowth ?? 0;
  const yearlyGrowth = revenue?.yearlyGrowth ?? 0;
  const overdue = outstanding?.overdue ?? 0;

  return (
    <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <ListSummaryCard
        title="Monthly Revenue"
        value={formatMoney(revenue?.monthly)}
        footer={
          <span>
            {revenue?.currentMonth || 'This month'}
            {monthlyGrowth !== 0 && (
              <span
                className={`ml-2 font-medium ${
                  monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {monthlyGrowth >= 0 ? '+' : ''}
                {monthlyGrowth.toFixed(1)}%
              </span>
            )}
          </span>
        }
        icon={<DollarSign className="h-8 w-8 text-green-600" />}
      />
      <ListSummaryCard
        title="Outstanding"
        value={formatMoney(outstanding?.total)}
        footer={
          <span>
            {outstanding?.count || 0} invoices
            {overdue > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 font-medium text-red-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                {formatMoney(overdue)} overdue
              </span>
            )}
          </span>
        }
        icon={<FileText className="h-8 w-8 text-yellow-600" />}
      />
      <ListSummaryCard
        title="Occupancy Rate"
        value={`${(occupancy?.occupancyRate ?? 0).toFixed(1)}%`}
        footer={`${occupancy?.occupiedRooms || 0} / ${occupancy?.totalRooms || 0} rooms`}
        icon={<Building2 className="h-8 w-8 text-blue-600" />}
      />
      <ListSummaryCard
        title="Yearly Revenue"
        value={formatMoney(revenue?.yearly)}
        footer={
          <span>
            {revenue?.currentYear || new Date().getFullYear()}
            {yearlyGrowth !== 0 && (
              <span
                className={`ml-2 font-medium ${
                  yearlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {yearlyGrowth >= 0 ? '+' : ''}
                {yearlyGrowth.toFixed(1)}%
              </span>
            )}
          </span>
        }
        icon={<TrendingUp className="h-8 w-8 text-slate-600" />}
      />
    </div>
  );
}
