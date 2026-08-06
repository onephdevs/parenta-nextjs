'use client';

import Link from 'next/link';

interface UpcomingDueDatesProps {
  dueDates: any[];
}

export default function UpcomingDueDates({ dueDates }: UpcomingDueDatesProps) {
  if (!dueDates || dueDates.length === 0) {
    return (
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Upcoming Due Dates
          </h3>
          <p className="text-sm text-gray-900">No upcoming invoices in the next 30 days</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Upcoming Due Dates
          </h3>
          <Link
            href="/admin/financial/invoices"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            View all
          </Link>
        </div>
        <div className="flow-root">
          <ul className="divide-y divide-gray-200">
            {dueDates.slice(0, 8).map((invoice) => (
              <li key={invoice.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {invoice.tenantName}
                    </p>
                    <p className="text-sm text-gray-900">
                      {invoice.invoiceNumber}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0 text-right">
                    <p className="text-sm font-medium text-gray-900">
                      ₱{invoice.remainingAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-900">
                      Due in {invoice.daysUntilDue} {invoice.daysUntilDue === 1 ? 'day' : 'days'}
                    </p>
                  </div>
                </div>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      invoice.daysUntilDue <= 3
                        ? 'bg-red-100 text-red-800'
                        : invoice.daysUntilDue <= 7
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

