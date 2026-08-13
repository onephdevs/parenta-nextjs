'use client';

import { useMemo, useState } from 'react';
import Pagination from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import type { TenantProfileAssignment, TenantProfileData } from './types';
import { deriveLeaseRowStatus, formatDateRange } from './utils';

const PAGE_SIZE = 10;

interface LeaseTabProps {
  tenant: TenantProfileData;
  onViewLease: (assignment: TenantProfileAssignment) => void;
}

export function LeaseTab({ tenant, onViewLease }: LeaseTabProps) {
  const [page, setPage] = useState(1);
  const leases = tenant.assignmentHistory.length
    ? tenant.assignmentHistory
    : tenant.currentAssignment
      ? [tenant.currentAssignment]
      : [];

  const totalPages = Math.max(1, Math.ceil(leases.length / PAGE_SIZE));
  const rows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return leases.slice(start, start + PAGE_SIZE);
  }, [leases, page]);

  return (
    <section className="overflow-hidden">
      <div className="mb-4">
        <h3 className="text-base font-bold text-gray-900">Lease History</h3>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Unit / Property</th>
                <th className="px-5 py-3.5 font-semibold">Duration</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold">Lease Template</th>
                <th className="px-5 py-3.5 font-semibold">Rent</th>
                <th className="px-5 py-3.5 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-500">
                    No lease history yet.
                  </td>
                </tr>
              ) : (
                rows.map((lease) => {
                  const status = deriveLeaseRowStatus(lease);
                  return (
                    <tr key={lease.id} className="hover:bg-gray-50/60">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900">
                          {lease.roomNumber.match(/^(unit|room)\b/i)
                            ? lease.roomNumber
                            : `Unit ${lease.roomNumber}`}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">{lease.buildingName}</p>
                      </td>
                      <td className="px-5 py-4 text-gray-700">
                        {formatDateRange(lease.startDate, lease.endDate)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-5 py-4 text-gray-700">
                        {lease.leasePackageTemplateName || '—'}
                      </td>
                      <td className="px-5 py-4 font-semibold tabular-nums text-gray-900">
                        {formatCurrency(lease.monthlyRate)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => onViewLease(lease)}
                          className="text-sm font-semibold text-indigo-600 hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={leases.length}
          itemsPerPage={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>
    </section>
  );
}
