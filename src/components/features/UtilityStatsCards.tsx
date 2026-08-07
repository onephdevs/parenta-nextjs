'use client';

import {
  AlertTriangle,
  Ban,
  BarChart3,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';

interface UtilityStats {
  total_bills: number;
  pending_bills: number;
  paid_bills: number;
  overdue_bills: number;
  disputed_bills: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  overdue_amount: number;
  average_bill_amount: number;
  buildings_count: number;
  utility_types_count: number;
  providers_count: number;
}

interface UtilityStatsCardsProps {
  stats: UtilityStats;
}

export default function UtilityStatsCards({ stats }: UtilityStatsCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const paymentRate =
    stats.total_bills > 0 ? Math.round((stats.paid_bills / stats.total_bills) * 100) : 0;

  const overdueLabel =
    stats.overdue_bills === 0
      ? `${formatCurrency(stats.overdue_amount)} · all up to date`
      : stats.overdue_bills < 5
        ? `${formatCurrency(stats.overdue_amount)} · few overdue`
        : `${formatCurrency(stats.overdue_amount)} · many overdue`;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Bills"
        value={stats.total_bills.toLocaleString()}
        subtitle={`Across ${stats.buildings_count} buildings`}
        icon={<BarChart3 className="h-5 w-5" />}
        tone="blue"
      />
      <StatCard
        title="Total Amount"
        value={formatCurrency(stats.total_amount)}
        subtitle={`Avg: ${formatCurrency(stats.average_bill_amount)}`}
        icon={<DollarSign className="h-5 w-5" />}
        tone="green"
      />
      <StatCard
        title="Pending Bills"
        value={stats.pending_bills.toLocaleString()}
        subtitle={formatCurrency(stats.pending_amount)}
        icon={<Clock className="h-5 w-5" />}
        tone="yellow"
      />
      <StatCard
        title="Overdue Bills"
        value={stats.overdue_bills.toLocaleString()}
        subtitle={overdueLabel}
        icon={<AlertTriangle className="h-5 w-5" />}
        tone={stats.overdue_bills > 0 ? 'red' : 'green'}
      />
      <StatCard
        title="Paid Bills"
        value={stats.paid_bills.toLocaleString()}
        subtitle={formatCurrency(stats.paid_amount)}
        icon={<CheckCircle2 className="h-5 w-5" />}
        tone="green"
      />
      <StatCard
        title="Disputed Bills"
        value={stats.disputed_bills.toLocaleString()}
        subtitle={stats.disputed_bills > 0 ? 'Needs attention' : 'All clear'}
        icon={<Ban className="h-5 w-5" />}
        tone={stats.disputed_bills > 0 ? 'yellow' : 'default'}
      />
      <StatCard
        title="Utility Types"
        value={stats.utility_types_count.toLocaleString()}
        subtitle={`${stats.providers_count} providers`}
        icon={<Zap className="h-5 w-5" />}
        tone="purple"
      />
      <StatCard
        title="Payment Rate"
        value={`${paymentRate}%`}
        subtitle={`${stats.paid_bills}/${stats.total_bills} paid`}
        icon={<TrendingUp className="h-5 w-5" />}
        tone={paymentRate > 80 ? 'green' : 'yellow'}
      />
    </div>
  );
}
