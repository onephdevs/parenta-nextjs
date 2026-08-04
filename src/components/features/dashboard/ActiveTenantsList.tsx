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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-bold text-gray-900 flex items-center">
          <Users className="h-5 w-5 mr-2 text-purple-600" />
          Active tenants
        </h3>
        <div className="relative w-full sm:max-w-xs">
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

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : uniqueTenants.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <Users className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">
            {debouncedSearch ? 'No tenants match your search' : 'No active tenants found'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-2 py-2 font-medium">Tenant</th>
                <th className="px-2 py-2 font-medium">Room</th>
                <th className="px-2 py-2 font-medium text-right">Balance</th>
                <th className="px-2 py-2 font-medium text-right">Status</th>
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
                    <td className="px-2 py-3">
                      <Link
                        href={`/admin/tenants/${tenant.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {tenant.firstName} {tenant.lastName}
                      </Link>
                    </td>
                    <td className="px-2 py-3 text-gray-600">
                      <span title={tenant.buildingName || undefined}>{roomLabel}</span>
                    </td>
                    <td className={`px-2 py-3 text-right tabular-nums ${pastDueAmountClass(status)}`}>
                      {formatCurrency(tenant.balance)}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${pastDueBadgeClass(status)}`}
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

      <div className="mt-4 flex justify-end border-t border-gray-100 pt-3">
        <Link
          href="/admin/tenants"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center"
        >
          View all tenants <ArrowRight className="h-4 w-4 ml-1" />
        </Link>
      </div>
    </div>
  );
}
