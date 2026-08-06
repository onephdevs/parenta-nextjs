'use client';

import React from 'react';
import { Package, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react';
import { ListSummaryCard } from '@/components/ui/ListSummaryCard';

interface AssetStatsCardsProps {
  stats: {
    totalAssets: number;
    totalValue: number;
    assignedAssets: number;
    availableAssets: number;
    maintenanceAssets: number;
    rentalRevenue: number;
    depreciationLoss: number;
  };
}

export function AssetStatsCards({ stats }: AssetStatsCardsProps) {
  const formatCurrency = (amount: number) => {
    const n = Number(amount);
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number.isFinite(n) ? n : 0);
  };

  const pct = (part: number, whole: number) => {
    if (!whole || !Number.isFinite(whole) || !Number.isFinite(part)) return '0.0';
    return ((part / whole) * 100).toFixed(1);
  };

  return (
    <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <ListSummaryCard
        title="Total Assets"
        value={(stats.totalAssets || 0).toLocaleString()}
        footer="all tracked assets"
        icon={<Package className="h-8 w-8 text-blue-600" />}
      />
      <ListSummaryCard
        title="Total Value"
        value={formatCurrency(stats.totalValue)}
        footer="current inventory value"
        icon={<DollarSign className="h-8 w-8 text-green-600" />}
      />
      <ListSummaryCard
        title="Available"
        value={(stats.availableAssets || 0).toLocaleString()}
        footer={`${pct(stats.availableAssets, stats.totalAssets)}% available`}
        icon={<CheckCircle className="h-8 w-8 text-emerald-600" />}
      />
      <ListSummaryCard
        title="Maintenance"
        value={(stats.maintenanceAssets || 0).toLocaleString()}
        footer={stats.maintenanceAssets > 0 ? 'needs attention' : 'all good'}
        icon={<AlertTriangle className="h-8 w-8 text-yellow-600" />}
      />
    </div>
  );
}
