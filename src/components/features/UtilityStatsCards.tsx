'use client';

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

  const getStatusColor = (value: number, type: 'overdue' | 'disputed' | 'pending' | 'paid') => {
    switch (type) {
      case 'overdue':
        return value > 0 ? 'text-red-600' : 'text-green-600';
      case 'disputed':
        return value > 0 ? 'text-orange-600' : 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'paid':
        return 'text-green-600';
      default:
        return 'text-gray-900';
    }
  };

  const statCards = [
    {
      title: 'Total Bills',
      value: stats.total_bills.toLocaleString(),
      subtext: `Across ${stats.buildings_count} buildings`,
      icon: '📊',
      color: 'text-blue-600',
    },
    {
      title: 'Total Amount',
      value: formatCurrency(stats.total_amount),
      subtext: `Avg: ${formatCurrency(stats.average_bill_amount)}`,
      icon: '💰',
      color: 'text-green-600',
    },
    {
      title: 'Pending Bills',
      value: stats.pending_bills.toLocaleString(),
      subtext: formatCurrency(stats.pending_amount),
      icon: '⏳',
      color: getStatusColor(stats.pending_bills, 'pending'),
    },
    {
      title: 'Overdue Bills',
      value: stats.overdue_bills.toLocaleString(),
      subtext: formatCurrency(stats.overdue_amount),
      icon: '⚠️',
      color: getStatusColor(stats.overdue_bills, 'overdue'),
    },
    {
      title: 'Paid Bills',
      value: stats.paid_bills.toLocaleString(),
      subtext: formatCurrency(stats.paid_amount),
      icon: '✅',
      color: getStatusColor(stats.paid_bills, 'paid'),
    },
    {
      title: 'Disputed Bills',
      value: stats.disputed_bills.toLocaleString(),
      subtext: stats.disputed_bills > 0 ? 'Needs attention' : 'All clear',
      icon: '🚫',
      color: getStatusColor(stats.disputed_bills, 'disputed'),
    },
    {
      title: 'Utility Types',
      value: stats.utility_types_count.toLocaleString(),
      subtext: `${stats.providers_count} providers`,
      icon: '⚡',
      color: 'text-purple-600',
    },
    {
      title: 'Payment Rate',
      value: `${stats.total_bills > 0 ? Math.round((stats.paid_bills / stats.total_bills) * 100) : 0}%`,
      subtext: `${stats.paid_bills}/${stats.total_bills} paid`,
      icon: '📈',
      color: stats.total_bills > 0 && (stats.paid_bills / stats.total_bills) > 0.8 ? 'text-green-600' : 'text-yellow-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((card, index) => (
        <div key={index} className="bg-white rounded-lg shadow border p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 mb-1">{card.title}</p>
              <p className={`text-2xl font-bold ${card.color} mb-1`}>
                {card.value}
              </p>
              <p className="text-xs text-gray-900">{card.subtext}</p>
            </div>
            <div className="text-2xl ml-4">
              {card.icon}
            </div>
          </div>
          
          {/* Progress bar for payment rate */}
          {card.title === 'Payment Rate' && stats.total_bills > 0 && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    (stats.paid_bills / stats.total_bills) > 0.8 
                      ? 'bg-green-500' 
                      : (stats.paid_bills / stats.total_bills) > 0.6 
                        ? 'bg-yellow-500' 
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${(stats.paid_bills / stats.total_bills) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Status indicator for overdue bills */}
          {card.title === 'Overdue Bills' && (
            <div className="mt-3">
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                stats.overdue_bills === 0 
                  ? 'bg-green-100 text-green-800' 
                  : stats.overdue_bills < 5 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-red-100 text-red-800'
              }`}>
                {stats.overdue_bills === 0 
                  ? 'All up to date' 
                  : stats.overdue_bills < 5 
                    ? 'Few overdue' 
                    : 'Many overdue'
                }
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
} 