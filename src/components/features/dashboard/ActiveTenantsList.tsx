'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Users, Search, ArrowRight } from 'lucide-react';
import {
  getPastDueStatus,
  pastDueAmountClass,
  pastDueBadgeClass,
} from '@/lib/past-due-status';

interface ActiveTenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  roomNumber?: string;
  buildingName?: string;
  buildingId?: string;
  balance: number;
  pastDueAmount: number;
  overdueCount: number;
  daysPastDue: number;
  daysUntilDue?: number | null;
  leaseStart?: string;
  leaseEnd?: string;
}

export default function ActiveTenantsList() {
  const [tenants, setTenants] = useState<ActiveTenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    async function fetchActiveTenants() {
      try {
        setIsLoading(true);
        const qs = debouncedSearch
          ? `?q=${encodeURIComponent(debouncedSearch)}`
          : '';
        const response = await fetch(`/api/admin/dashboard/active-tenants${qs}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        const data = await response.json();

        if (!cancelled) {
          if (data.success) {
            setTenants(data.data.tenants || []);
          } else {
            console.error('API returned error:', data.error);
            setTenants([]);
          }
        }
      } catch (error) {
        console.error('Error fetching active tenants:', error);
        if (!cancelled) setTenants([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchActiveTenants();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  };

  const uniqueTenants = useMemo(() => {
    const seen = new Set<string>();
    return tenants.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [tenants]);

  return (
    <div className="flex max-h-[min(40rem,calc(100vh-14rem))] min-h-[28rem] min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center text-lg font-bold text-gray-900">
          <Users className="mr-2 h-5 w-5 shrink-0 text-purple-600" />
          Active tenants
        </h3>
        <div className="relative w-full min-w-0 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenant or room…"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        ) : uniqueTenants.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm">
              {debouncedSearch ? 'No tenants match your search' : 'No active tenants found'}
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="w-[36%] py-2 pr-2 font-medium">Tenant</th>
                  <th className="w-[22%] py-2 pr-2 font-medium">Room</th>
                  <th className="w-[22%] py-2 pr-2 text-right font-medium">Balance</th>
                  <th className="w-[20%] py-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {uniqueTenants.map((tenant) => {
                  const status = getPastDueStatus({
                    balance: tenant.balance,
                    daysPastDue: tenant.daysPastDue,
                    daysUntilDue: tenant.daysUntilDue,
                  });
                  const roomLabel = tenant.roomNumber
                    ? tenant.buildingName
                      ? `${tenant.roomNumber}`
                      : tenant.roomNumber
                    : '—';

                  return (
                    <tr key={tenant.id} className="hover:bg-gray-50/80">
                      <td className="max-w-0 py-3 pr-2">
                        <Link
                          href={`/admin/tenants/${tenant.id}`}
                          className="block truncate font-medium text-gray-900 hover:text-blue-600"
                          title={`${tenant.firstName} ${tenant.lastName}`}
                        >
                          {tenant.firstName} {tenant.lastName}
                        </Link>
                      </td>
                      <td className="max-w-0 py-3 pr-2 text-gray-600">
                        <span className="block truncate" title={tenant.buildingName || undefined}>
                          {roomLabel}
                        </span>
                      </td>
                      <td
                        className={`py-3 pr-2 text-right tabular-nums ${pastDueAmountClass(status)}`}
                      >
                        {formatCurrency(tenant.balance)}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-xs font-medium ${pastDueBadgeClass(status)}`}
                        >
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 flex shrink-0 justify-end border-t border-gray-100 pt-3">
        <Link
          href="/admin/tenants"
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          View all tenants <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
