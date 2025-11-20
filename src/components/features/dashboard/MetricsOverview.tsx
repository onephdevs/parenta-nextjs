'use client';

interface MetricsOverviewProps {
  revenue: any;
  outstanding: any;
  occupancy: any;
}

export default function MetricsOverview({ revenue, outstanding, occupancy }: MetricsOverviewProps) {
  const metrics = [
    {
      name: 'Monthly Revenue',
      value: `₱${revenue?.monthly?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}`,
      change: revenue?.monthlyGrowth || 0,
      changeType: (revenue?.monthlyGrowth || 0) >= 0 ? 'increase' : 'decrease',
      subtitle: revenue?.currentMonth || '',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: 'Outstanding Invoices',
      value: `₱${outstanding?.total?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}`,
      count: outstanding?.count || 0,
      subtitle: `${outstanding?.count || 0} invoices`,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      alert: (outstanding?.overdue || 0) > 0 ? {
        value: `₱${outstanding?.overdue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        label: 'overdue'
      } : null,
    },
    {
      name: 'Occupancy Rate',
      value: `${occupancy?.occupancyRate?.toFixed(1) || '0.0'}%`,
      subtitle: `${occupancy?.occupiedRooms || 0} / ${occupancy?.totalRooms || 0} rooms`,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'Yearly Revenue',
      value: `₱${revenue?.yearly?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}`,
      change: revenue?.yearlyGrowth || 0,
      changeType: (revenue?.yearlyGrowth || 0) >= 0 ? 'increase' : 'decrease',
      subtitle: `${revenue?.currentYear || new Date().getFullYear()}`,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.name}
          className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-md bg-indigo-500 p-3 text-white">
                  {metric.icon}
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {metric.name}
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {metric.value}
                    </div>
                    {metric.change !== undefined && (
                      <div
                        className={`ml-2 flex items-baseline text-sm font-semibold ${
                          metric.changeType === 'increase'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {metric.changeType === 'increase' ? (
                          <svg className="self-center flex-shrink-0 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="self-center flex-shrink-0 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span className="ml-1">{Math.abs(metric.change).toFixed(1)}%</span>
                      </div>
                    )}
                  </dd>
                  <dd className="mt-1 text-sm text-gray-500">
                    {metric.subtitle}
                  </dd>
                  {metric.alert && (
                    <dd className="mt-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {metric.alert.value} {metric.alert.label}
                      </span>
                    </dd>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

