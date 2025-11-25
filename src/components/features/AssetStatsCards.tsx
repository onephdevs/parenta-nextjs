'use client';

import React from 'react';
import { Package, DollarSign, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

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
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const cards = [
    {
      title: 'Total Assets',
      value: stats.totalAssets.toLocaleString(),
      icon: Package,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'Total Value',
      value: formatCurrency(stats.totalValue),
      icon: DollarSign,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      title: 'Available Assets',
      value: stats.availableAssets.toLocaleString(),
      icon: CheckCircle,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      subtitle: `${((stats.availableAssets / stats.totalAssets) * 100).toFixed(1)}% available`
    },
    {
      title: 'Assigned Assets',
      value: stats.assignedAssets.toLocaleString(),
      icon: Package,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      subtitle: `${((stats.assignedAssets / stats.totalAssets) * 100).toFixed(1)}% assigned`
    },
    {
      title: 'Maintenance Required',
      value: stats.maintenanceAssets.toLocaleString(),
      icon: AlertTriangle,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
      subtitle: stats.maintenanceAssets > 0 ? 'Needs attention' : 'All good'
    },
    {
      title: 'Monthly Rental Revenue',
      value: formatCurrency(stats.rentalRevenue),
      icon: TrendingUp,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      subtitle: 'Potential income'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card, index) => {
        const IconComponent = card.icon;
        
        return (
          <div key={index} className={`${card.bgColor} rounded-lg p-6 border border-gray-200`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {card.title}
                </p>
                <p className={`text-2xl font-bold ${card.textColor}`}>
                  {card.value}
                </p>
                {card.subtitle && (
                  <p className="text-sm text-gray-900 mt-1">
                    {card.subtitle}
                  </p>
                )}
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <IconComponent className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
} 