'use client';

interface UtilityTrend {
  utility_type: string;
  month: string;
  bill_count: number;
  total_amount: number;
  average_amount: number;
  total_usage: number;
  average_usage: number;
}

interface UtilityTrendsChartProps {
  trends: UtilityTrend[];
}

export default function UtilityTrendsChart({ trends }: UtilityTrendsChartProps) {
  if (!trends.length) {
    return null;
  }

  // Group trends by utility type
  const groupedTrends = trends.reduce((acc, trend) => {
    if (!acc[trend.utility_type]) {
      acc[trend.utility_type] = [];
    }
    acc[trend.utility_type].push(trend);
    return acc;
  }, {} as Record<string, UtilityTrend[]>);

  // Get unique months for x-axis
  const uniqueMonths = [...new Set(trends.map(t => t.month))].sort();

  // Utility type colors
  const utilityColors = {
    electricity: '#3B82F6', // blue
    water: '#06B6D4', // cyan
    gas: '#F59E0B', // amber
    internet: '#8B5CF6', // violet
    cable: '#EF4444', // red
    waste: '#10B981', // emerald
    other: '#6B7280', // gray
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatMonth = (monthStr: string) => {
    return new Date(monthStr).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  // Calculate totals for summary
  const totalsByMonth = uniqueMonths.map(month => {
    const monthTrends = trends.filter(t => t.month === month);
    return {
      month,
      total_amount: monthTrends.reduce((sum, t) => sum + t.total_amount, 0),
      total_bills: monthTrends.reduce((sum, t) => sum + t.bill_count, 0),
    };
  });

  const maxAmount = Math.max(...totalsByMonth.map(t => t.total_amount));

  return (
    <div className="bg-white rounded-lg shadow border p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Utility Spending Trends</h3>
        <p className="text-sm text-gray-600">
          Monthly utility costs and consumption patterns over the past 12 months
        </p>
      </div>

      {/* Chart */}
      <div className="mb-6">
        <div className="relative h-64 bg-gray-50 rounded-lg p-4">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 py-4">
            <span>{formatCurrency(maxAmount)}</span>
            <span>{formatCurrency(maxAmount * 0.75)}</span>
            <span>{formatCurrency(maxAmount * 0.5)}</span>
            <span>{formatCurrency(maxAmount * 0.25)}</span>
            <span>$0</span>
          </div>

          {/* Chart area */}
          <div className="ml-12 mr-4 h-full relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-full border-t border-gray-200"></div>
              ))}
            </div>

            {/* Bars */}
            <div className="absolute inset-0 flex items-end justify-between">
              {totalsByMonth.map((monthData) => {
                const height = maxAmount > 0 ? (monthData.total_amount / maxAmount) * 100 : 0;
                
                return (
                  <div key={monthData.month} className="flex flex-col items-center w-12">
                    {/* Bar */}
                    <div
                      className="w-8 bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600 relative group"
                      style={{ height: `${height}%` }}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                        {formatCurrency(monthData.total_amount)}
                        <br />
                        {monthData.total_bills} bills
                      </div>
                    </div>
                    
                    {/* Month label */}
                    <div className="text-xs text-gray-600 mt-2 transform -rotate-45 origin-left">
                      {formatMonth(monthData.month)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Utility Types Legend and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Legend */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Utility Types</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(groupedTrends).map(([utilityType, typeTrends]) => {
              const totalAmount = typeTrends.reduce((sum, t) => sum + t.total_amount, 0);
              const totalBills = typeTrends.reduce((sum, t) => sum + t.bill_count, 0);

              const getUtilityIcon = (type: string) => {
                const icons = {
                  electricity: '⚡',
                  water: '💧',
                  gas: '🔥',
                  internet: '🌐',
                  cable: '📺',
                  waste: '🗑️',
                  other: '📋',
                };
                return icons[type as keyof typeof icons] || '📋';
              };

              return (
                <div
                  key={utilityType}
                  className="flex items-center p-2 bg-gray-50 rounded"
                >
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: utilityColors[utilityType as keyof typeof utilityColors] || '#6B7280' }}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <span className="mr-1">{getUtilityIcon(utilityType)}</span>
                      <span className="text-xs font-medium text-gray-900 capitalize truncate">
                        {utilityType}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatCurrency(totalAmount)} • {totalBills} bills
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary Stats */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Period Summary</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Spending:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(trends.reduce((sum, t) => sum + t.total_amount, 0))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Bills:</span>
              <span className="text-sm font-medium text-gray-900">
                {trends.reduce((sum, t) => sum + t.bill_count, 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Average per Month:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(totalsByMonth.reduce((sum, t) => sum + t.total_amount, 0) / totalsByMonth.length)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Peak Month:</span>
              <span className="text-sm font-medium text-gray-900">
                {(() => {
                  const peakMonth = totalsByMonth.reduce((max, month) => 
                    month.total_amount > max.total_amount ? month : max
                  );
                  return formatMonth(peakMonth.month);
                })()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Trends Analysis */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">📈 Insights</h4>
        <div className="text-sm text-blue-800">
          {(() => {
            if (totalsByMonth.length < 2) return 'Not enough data for trend analysis.';
            
            const latestMonth = totalsByMonth[0];
            const previousMonth = totalsByMonth[1];
            const change = latestMonth.total_amount - previousMonth.total_amount;
            const percentChange = previousMonth.total_amount > 0 ? (change / previousMonth.total_amount) * 100 : 0;
            
            if (Math.abs(percentChange) < 5) {
              return `Utility costs remained stable this month (${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%).`;
            } else if (percentChange > 0) {
              return `Utility costs increased by ${percentChange.toFixed(1)}% this month (${formatCurrency(change)}).`;
            } else {
              return `Utility costs decreased by ${Math.abs(percentChange).toFixed(1)}% this month (${formatCurrency(Math.abs(change))} savings).`;
            }
          })()}
        </div>
      </div>
    </div>
  );
} 