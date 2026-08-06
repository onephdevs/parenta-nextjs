'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  FileText,
  Plus,
  Search,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import { ListSummaryCard } from '@/components/ui/ListSummaryCard';
import Pagination from '@/components/ui/Pagination';
import { PageHeader } from '@/components/layout/PageHeader';
import { LeaseStatusBadge } from '@/components/domain/StatusBadges';
import {
  formatLeaseTermShort,
  type LeaseListItem,
  type LeaseStats,
  type LeaseUiStatus,
} from '@/lib/leases-shared';

const PAGE_SIZE = 20;

type OpsTab = 'leases' | 'alerts' | 'renewals' | 'moveouts';

interface BuildingOption {
  id: string;
  name: string;
}

interface LeasePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function LeaseManagement() {
  const [activeTab, setActiveTab] = useState<OpsTab>('leases');
  const [loading, setLoading] = useState(false);
  const [leases, setLeases] = useState<LeaseListItem[]>([]);
  const [stats, setStats] = useState<LeaseStats | null>(null);
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<LeaseUiStatus | 'all'>('all');
  const [buildingId, setBuildingId] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<LeasePagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [alerts, setAlerts] = useState<any[]>([]);
  const [renewals, setRenewals] = useState<any[]>([]);
  const [moveouts, setMoveouts] = useState<any[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, buildingId]);

  const fetchLeases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (status !== 'all') params.set('status', status);
      if (buildingId) params.set('buildingId', buildingId);
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));
      params.set('includeStats', 'true');

      const response = await fetch(`/api/leases?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setLeases(data.data || []);
        if (data.stats) setStats(data.stats);
        if (data.pagination) {
          setPagination({
            page: Number(data.pagination.page) || page,
            limit: Number(data.pagination.limit) || PAGE_SIZE,
            total: Number(data.pagination.total) || 0,
            totalPages: Math.max(1, Number(data.pagination.totalPages) || 1),
          });
        }
      }
    } catch (error) {
      console.error('Error fetching leases:', error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, buildingId, page]);

  const fetchBuildings = useCallback(async () => {
    try {
      const response = await fetch('/api/buildings?limit=100', { credentials: 'include' });
      const data = await response.json();
      const list = data.data?.buildings || data.buildings || data.data || [];
      if (Array.isArray(list)) {
        setBuildings(
          list.map((b: { id: string; name: string }) => ({
            id: b.id,
            name: b.name,
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/lease/alerts', { credentials: 'include' });
      const data = await response.json();
      if (data.success) setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRenewals = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/lease/renewals', { credentials: 'include' });
      const data = await response.json();
      if (data.success) setRenewals(data.renewals || []);
    } catch (error) {
      console.error('Error fetching renewals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMoveouts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/lease/moveouts', { credentials: 'include' });
      const data = await response.json();
      if (data.success) setMoveouts(data.moveouts || []);
    } catch (error) {
      console.error('Error fetching move-outs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAlerts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/lease/alerts/generate', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        await fetchAlerts();
      }
    } catch (error) {
      console.error('Error generating alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  useEffect(() => {
    if (activeTab === 'leases') fetchLeases();
    if (activeTab === 'alerts') fetchAlerts();
    if (activeTab === 'renewals') fetchRenewals();
    if (activeTab === 'moveouts') fetchMoveouts();
  }, [activeTab, fetchLeases]);

  const tabClass = (tab: OpsTab) =>
    `px-4 py-2 font-medium border-b-2 transition-colors ${
      activeTab === tab
        ? 'border-gray-900 text-gray-900'
        : 'border-transparent text-gray-600 hover:text-gray-900'
    }`;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Leases"
        description="Tenant room assignments, renewals, and move-outs"
        actions={
          <div className="flex flex-wrap gap-2">
            {activeTab === 'alerts' && (
              <Button variant="outline" onClick={handleGenerateAlerts} isLoading={loading}>
                Generate Alerts
              </Button>
            )}
            <Link href="/admin/tenants/new?returnTo=/admin/lease-management">
              <Button leftIcon={<Plus className="h-4 w-4" />}>New lease</Button>
            </Link>
          </div>
        }
      />

      {stats && activeTab === 'leases' && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <ListSummaryCard
            title="Active"
            value={stats.active}
            footer="active leases"
            icon={<CheckCircle2 className="h-8 w-8 text-green-600" />}
          />
          <ListSummaryCard
            title="Expiring soon"
            value={stats.expiringSoon}
            footer="leases ending soon"
            icon={<AlertCircle className="h-8 w-8 text-yellow-600" />}
          />
          <ListSummaryCard
            title="Draft"
            value={stats.draft}
            footer="draft leases"
            icon={<FileText className="h-8 w-8 text-gray-500" />}
          />
          <ListSummaryCard
            title="Terminated"
            value={stats.terminated}
            footer="terminated leases"
            icon={<XCircle className="h-8 w-8 text-red-600" />}
          />
        </div>
      )}

      <div className="border-b border-gray-200">
        <div className="flex flex-wrap gap-1">
          <button type="button" onClick={() => setActiveTab('leases')} className={tabClass('leases')}>
            All leases
          </button>
          <button type="button" onClick={() => setActiveTab('alerts')} className={tabClass('alerts')}>
            Expiration alerts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('renewals')}
            className={tabClass('renewals')}
          >
            Renewals
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('moveouts')}
            className={tabClass('moveouts')}
          >
            Move-outs
          </button>
        </div>
      </div>

      {activeTab === 'leases' && (
        <>
          <Card className="mb-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField label="Search" htmlFor="lease-search">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="lease-search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tenant, unit..."
                    className="pl-10"
                  />
                </div>
              </FormField>
              <FormField label="Status" htmlFor="lease-status">
                <Select
                  id="lease-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as LeaseUiStatus | 'all')}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="expiring_soon">Expiring soon</option>
                  <option value="draft">Draft</option>
                  <option value="terminated">Terminated</option>
                </Select>
              </FormField>
              <FormField label="Building" htmlFor="lease-building">
                <Select
                  id="lease-building"
                  value={buildingId}
                  onChange={(e) => setBuildingId(e.target.value)}
                >
                  <option value="">All Buildings</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
          </Card>

          {loading ? (
            <div className="overflow-hidden rounded-lg bg-white p-8 text-center shadow text-gray-900">
              Loading...
            </div>
          ) : leases.length === 0 ? (
            <div className="overflow-hidden rounded-lg bg-white p-8 text-center shadow text-gray-900">
              <p className="mb-2 text-lg font-medium">No leases found</p>
              <p className="mb-4 text-sm text-gray-600">
                Create a tenant with a room assignment to start a lease.
              </p>
              <Link href="/admin/tenants/new?returnTo=/admin/lease-management">
                <Button leftIcon={<Plus className="h-4 w-4" />}>New lease</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg bg-white shadow">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                        Unit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                        Tenant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                        Term
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                        Rent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {leases.map((lease) => {
                      const tenantLabel =
                        `${lease.tenantFirstName} ${lease.tenantLastName}`.trim();
                      const withOccupants =
                        lease.occupantCount > 0
                          ? `${tenantLabel} +${lease.occupantCount}`
                          : tenantLabel || '—';
                      return (
                        <tr key={lease.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {lease.buildingName}
                            </div>
                            <div className="text-sm text-gray-600">Room {lease.roomNumber}</div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {withOccupants}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {formatLeaseTermShort(lease.startDate, lease.endDate)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                            ₱{Number(lease.monthlyRate || 0).toLocaleString()}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <LeaseStatusBadge status={lease.uiStatus} />
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                            <Link
                              href={`/admin/lease-management/${lease.id}`}
                              className="inline-flex text-gray-500 hover:text-gray-900"
                              title="View"
                            >
                              <Eye className="h-5 w-5" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={Math.min(page, pagination.totalPages)}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                itemsPerPage={PAGE_SIZE}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      {activeTab !== 'leases' &&
        (loading ? (
          <div className="overflow-hidden rounded-lg bg-white p-8 text-center shadow text-gray-900">
            Loading...
          </div>
        ) : (
          <>
            {activeTab === 'alerts' && (
              <div className="overflow-hidden rounded-lg bg-white shadow">
                {alerts.length === 0 ? (
                  <div className="p-8 text-center text-gray-900">
                    <p className="mb-2 text-lg font-medium">No pending alerts</p>
                    <p className="text-sm text-gray-600">
                      Expiration alerts will appear here when leases are nearing end.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                            Unit
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                            Tenant
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                            Lease Ends
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                            Days Left
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                            Alert
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {alerts.map((alert) => (
                          <tr key={alert.id} className="hover:bg-gray-50">
                            <td className="whitespace-nowrap px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">
                                {alert.building_name}
                              </div>
                              <div className="text-sm text-gray-600">
                                Room {alert.room_number}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              {alert.tenant_name}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              {new Date(alert.lease_end_date).toLocaleDateString()}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-red-600">
                              {alert.days_until_expiry}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4">
                              <span className="inline-flex rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                                {alert.alert_type}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'renewals' && (
              <div className="overflow-hidden rounded-lg bg-white shadow">
                {renewals.length === 0 ? (
                  <div className="p-8 text-center text-gray-900">
                    <p className="mb-2 text-lg font-medium">No renewal requests</p>
                    <p className="text-sm text-gray-600">
                      Renewal requests will show up here when submitted.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                            Unit
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                            Tenant
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                            Current → Proposed
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                            Rent
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {renewals.map((renewal) => (
                          <tr key={renewal.id} className="hover:bg-gray-50">
                            <td className="whitespace-nowrap px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">
                                {renewal.building_name}
                              </div>
                              <div className="text-sm text-gray-600">
                                Room {renewal.room_number}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              {renewal.tenant_name}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              {new Date(renewal.current_lease_end_date).toLocaleDateString()}
                              {' → '}
                              {new Date(renewal.proposed_lease_end_date).toLocaleDateString()}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              ₱{Number(renewal.current_monthly_rent || 0).toLocaleString()}
                              {' → '}
                              ₱{Number(renewal.proposed_monthly_rent || 0).toLocaleString()}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4">
                              <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-800">
                                {renewal.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'moveouts' && (
              <div className="overflow-hidden rounded-lg bg-white shadow">
                {moveouts.length === 0 ? (
                  <div className="p-8 text-center text-gray-900">
                    <p className="mb-2 text-lg font-medium">No move-out records</p>
                    <p className="text-sm text-gray-600">
                      Move-out processing records will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                            Unit
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                            Tenant
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                            Move-out Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {moveouts.map((moveout) => (
                          <tr key={moveout.id} className="hover:bg-gray-50">
                            <td className="whitespace-nowrap px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">
                                {moveout.building_name}
                              </div>
                              <div className="text-sm text-gray-600">
                                Room {moveout.room_number}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              {moveout.tenant_name}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              {new Date(moveout.moveout_date).toLocaleDateString()}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4">
                              <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium capitalize text-blue-800">
                                {moveout.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        ))}
    </div>
  );
}
