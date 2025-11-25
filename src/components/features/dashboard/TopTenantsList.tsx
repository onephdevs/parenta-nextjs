'use client';

import Link from 'next/link';

interface TopTenantsListProps {
  tenants: any[];
}

export default function TopTenantsList({ tenants }: TopTenantsListProps) {
  if (!tenants || tenants.length === 0) {
    return (
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Top Tenants by Payment History
          </h3>
          <p className="text-sm text-gray-900">No tenant data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Top Tenants by Payment History
          </h3>
          <Link
            href="/admin/tenants"
            className="text-sm text-indigo-600 hover:text-indigo-900"
          >
            View all tenants
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Total Paid
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Payments
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Avg Payment
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-900 uppercase tracking-wider">
                  On-Time Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tenants.map((tenant, index) => (
                <tr key={tenant.tenantId} className="hover:bg-gray-50">
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      {index === 0 && (
                        <svg className="h-5 w-5 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      )}
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {tenant.tenantName}
                    </div>
                    <div className="text-xs text-gray-900">
                      Last payment: {new Date(tenant.lastPaymentDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    ₱{tenant.totalPaid?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {tenant.paymentCount}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    ₱{tenant.averagePayment?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-right">
                    <span
                      className={`inline-flex px-2 text-xs font-semibold rounded-full ${
                        tenant.onTimePaymentRate >= 90
                          ? 'bg-green-100 text-green-800'
                          : tenant.onTimePaymentRate >= 70
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {tenant.onTimePaymentRate?.toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

