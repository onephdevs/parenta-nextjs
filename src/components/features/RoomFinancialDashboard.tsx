'use client';

interface FinancialSummary {
  total_payments: number;
  overdue_amount: number;
  pending_amount: number;
  current_monthly_rate: number;
  current_assignment_start: string | null;
  deposit_received: number;
}

interface OccupancyMetrics {
  total_assignments: number;
  total_occupied_days: number;
  avg_assignment_length: number;
  occupancy_rate_percent: number;
}

interface RoomFinancialDashboardProps {
  financialSummary: FinancialSummary;
  occupancyMetrics: OccupancyMetrics;
  roomId: string;
}

export default function RoomFinancialDashboard({
  financialSummary,
  occupancyMetrics,
  roomId
}: RoomFinancialDashboardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const formatDays = (days: number) => {
    if (days < 30) return `${Math.round(days)} days`;
    if (days < 365) return `${Math.round(days / 30.44)} months`;
    return `${Math.round(days / 365.25)} years`;
  };

  return (
    <div className="space-y-6">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Payments */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-900">Total Payments (12mo)</dt>
              <dd className="text-2xl font-semibold text-gray-900">
                {formatCurrency(financialSummary.total_payments)}
              </dd>
            </div>
          </div>
        </div>

        {/* Current Monthly Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-900">Current Monthly Rate</dt>
              <dd className="text-2xl font-semibold text-gray-900">
                {formatCurrency(financialSummary.current_monthly_rate)}
              </dd>
            </div>
          </div>
        </div>

        {/* Overdue Amount */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                financialSummary.overdue_amount > 0 ? 'bg-red-100' : 'bg-gray-100'
              }`}>
                <svg className={`w-5 h-5 ${
                  financialSummary.overdue_amount > 0 ? 'text-red-600' : 'text-gray-400'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-900">Overdue Amount</dt>
              <dd className={`text-2xl font-semibold ${
                financialSummary.overdue_amount > 0 ? 'text-red-600' : 'text-gray-900'
              }`}>
                {formatCurrency(financialSummary.overdue_amount)}
              </dd>
            </div>
          </div>
        </div>

        {/* Pending Amount */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-900">Pending Payments</dt>
              <dd className="text-2xl font-semibold text-gray-900">
                {formatCurrency(financialSummary.pending_amount)}
              </dd>
            </div>
          </div>
        </div>
      </div>

      {/* Occupancy Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Occupancy Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {occupancyMetrics.total_assignments}
            </div>
            <div className="text-sm text-gray-900 mt-1">Total Assignments</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {Math.round(occupancyMetrics.occupancy_rate_percent)}%
            </div>
            <div className="text-sm text-gray-900 mt-1">Occupancy Rate</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {formatDays(occupancyMetrics.avg_assignment_length)}
            </div>
            <div className="text-sm text-gray-900 mt-1">Avg Stay Length</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-indigo-600">
              {formatDays(occupancyMetrics.total_occupied_days)}
            </div>
            <div className="text-sm text-gray-900 mt-1">Total Occupied</div>
          </div>
        </div>
      </div>

      {/* Financial Details */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Details</h3>
        <div className="space-y-4">
          {financialSummary.deposit_received > 0 && (
            <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">Security Deposit</div>
                <div className="text-sm text-gray-900">Amount received from current tenant</div>
              </div>
              <div className="text-lg font-semibold text-green-600">
                {formatCurrency(financialSummary.deposit_received)}
              </div>
            </div>
          )}

          {financialSummary.current_assignment_start && (
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">Current Assignment Start</div>
                <div className="text-sm text-gray-900">Move-in date for current tenant</div>
              </div>
              <div className="text-lg font-semibold text-blue-600">
                {new Date(financialSummary.current_assignment_start).toLocaleDateString()}
              </div>
            </div>
          )}

          {(financialSummary.overdue_amount > 0 || financialSummary.pending_amount > 0) && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-900">Payment Status Summary:</span>
                <div className="space-x-4">
                  {financialSummary.pending_amount > 0 && (
                    <span className="text-yellow-600">
                      {formatCurrency(financialSummary.pending_amount)} pending
                    </span>
                  )}
                  {financialSummary.overdue_amount > 0 && (
                    <span className="text-red-600">
                      {formatCurrency(financialSummary.overdue_amount)} overdue
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => window.location.href = `/admin/financial/payments?roomId=${roomId}`}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            View Payment History
          </button>
          
          <button
            onClick={() => window.location.href = `/admin/financial/invoices/new?roomId=${roomId}`}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Invoice
          </button>
          
          <button
            onClick={() => window.location.href = `/admin/financial/reports?roomId=${roomId}`}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Financial Report
          </button>
        </div>
      </div>
    </div>
  );
} 