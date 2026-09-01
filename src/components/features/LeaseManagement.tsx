'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Plus,
  XCircle,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { FilterBar } from '@/components/ui/FilterBar';
import { SearchInput } from '@/components/ui/SearchInput';
import { Spinner } from '@/components/ui/Spinner';
import { FormField } from '@/components/forms/FormField';
import { ListSummaryCard } from '@/components/ui/ListSummaryCard';
import Pagination from '@/components/ui/Pagination';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  TableCard,
  WorkItemRow,
} from '@/components/ui';
import AddTenantButton from '@/components/features/tenants/AddTenantButton';
import NewLeaseModal from '@/components/features/leasing/NewLeaseModal';
import StartMoveOutModal from '@/components/features/leasing/StartMoveOutModal';
import {
  type LeaseListItem,
  type LeaseStats,
  type LeaseUiStatus,
} from '@/lib/leases-shared';
import { formatShortDate } from '@/lib/utils';
import type { WorkItemTone } from '@/components/ui/WorkItemRow';

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

function leaseStatusTone(status: string): WorkItemTone {
  const key = (status || '').toLowerCase();
  if (key === 'active') return 'success';
  if (key === 'expiring_soon') return 'warning';
  if (key === 'notice_given') return 'warning';
  if (key === 'terminated') return 'danger';
  return 'neutral';
}

function leaseStatusLabel(status: string): string {
  const key = (status || '').toLowerCase();
  if (key === 'expiring_soon') return 'Expiring soon';
  if (key === 'notice_given') return 'Notice given';
  if (key === 'pending') return 'Draft';
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Lease';
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
  const [newLeaseOpen, setNewLeaseOpen] = useState(false);
  const [startMoveOutOpen, setStartMoveOutOpen] = useState(false);

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
        title="Leasing"
        description="Tenant room assignments, renewals, and move-outs"
        actions={
          <div className="flex flex-wrap gap-2">
            {activeTab === 'alerts' && (
              <Button variant="outline" onClick={handleGenerateAlerts} isLoading={loading}>
                Generate Alerts
              </Button>
            )}
            {activeTab === 'moveouts' && (
              <Button
                type="button"
                variant="outline"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setStartMoveOutOpen(true)}
              >
                Start move-out
              </Button>
            )}
            <AddTenantButton label="New tenant" variant="outline" />
            <Button
              type="button"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setNewLeaseOpen(true)}
            >
              New lease
            </Button>
          </div>
        }
      />

      {stats && activeTab === 'leases' && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
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
            title="Notice given"
            value={stats.noticeGiven}
            footer="ended on paper, still occupying"
            icon={<AlertCircle className="h-8 w-8 text-amber-600" />}
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
          <FilterBar
            columns={3}
            collapsible
            activeCount={[status !== 'all' ? status : '', buildingId].filter(Boolean).length}
            search={
              <SearchInput
                id="lease-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tenant, unit..."
                aria-label="Search leases"
              />
            }
            footer={
              <p className="text-sm text-gray-600">
                Showing {leases.length} of {pagination?.total ?? leases.length} leases
              </p>
            }
          >
            <FormField label="Status" htmlFor="lease-status">
              <Select
                id="lease-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as LeaseUiStatus | 'all')}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expiring_soon">Expiring soon</option>
                <option value="notice_given">Notice given</option>
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
          </FilterBar>

          <TableCard
            title="Leases"
            description="Open a lease from the View button."
          >
            {loading ? (
              <div className="flex justify-center p-8">
                <Spinner label="Loading leases" />
              </div>
            ) : (
              <>
                {leases.length === 0 ? (
                  <EmptyState
                    title="No leases found"
                    description="Create a tenant with a room assignment to start a lease."
                  />
                ) : (
                  leases.map((lease) => {
                    const tenantLabel =
                      `${lease.tenantFirstName} ${lease.tenantLastName}`.trim();
                    const withOccupants =
                      lease.occupantCount > 0
                        ? `${tenantLabel} +${lease.occupantCount}`
                        : tenantLabel || 'Lease';
                    const statusTone = leaseStatusTone(lease.uiStatus);
                    const statusLabel = leaseStatusLabel(lease.uiStatus);
                    return (
                      <WorkItemRow
                        key={lease.id}
                        href={`/admin/leasing/${lease.id}`}
                        title={withOccupants}
                        subtitle={`${lease.buildingName} · Room ${lease.roomNumber}`}
                        badges={[{ key: 'status', label: statusLabel, tone: statusTone }]}
                        date={formatShortDate(lease.endDate || lease.startDate)}
                        metaLabel={statusLabel}
                        metaDetail={`₱${Number(lease.monthlyRate || 0).toLocaleString()}`}
                        metaTone={
                          statusTone === 'danger'
                            ? 'danger'
                            : statusTone === 'warning'
                              ? 'warning'
                              : statusTone === 'success'
                                ? 'muted'
                                : 'default'
                        }
                        dotTone={statusTone}
                        trailingIcon={
                          statusTone === 'success' ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : statusTone === 'warning' || statusTone === 'danger' ? (
                            <AlertCircle className="h-4 w-4 text-rose-500" />
                          ) : null
                        }
                      />
                    );
                  })
                )}
                {leases.length > 0 ? (
                  <Pagination
                    currentPage={Math.min(page, pagination.totalPages)}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.total}
                    itemsPerPage={PAGE_SIZE}
                    onPageChange={setPage}
                  />
                ) : null}
              </>
            )}
          </TableCard>
        </>
      )}

      {activeTab !== 'leases' &&
        (loading ? (
          <TableCard>
            <div className="flex justify-center p-8">
              <Spinner label="Loading" />
            </div>
          </TableCard>
        ) : (
          <>
            {activeTab === 'alerts' && (
              <TableCard
                title="Expiration alerts"
                description="Leases that are nearing their end date."
              >
                {alerts.length === 0 ? (
                  <EmptyState
                    title="No expiration alerts"
                    description="Expiration alerts will appear here when leases are nearing end."
                  />
                ) : (
                  alerts.map((alert) => (
                    <WorkItemRow
                      key={alert.id}
                      title={alert.tenant_name || 'Lease'}
                      subtitle={`${alert.building_name} · Room ${alert.room_number}`}
                      badges={[
                        {
                          key: 'alert',
                          label: String(alert.alert_type || 'Alert').replace(/_/g, ' '),
                          tone: 'warning',
                        },
                      ]}
                      date={formatShortDate(alert.lease_end_date)}
                      metaLabel={`${alert.days_until_expiry} days left`}
                      metaTone="danger"
                      dotTone="warning"
                      trailingIcon={<AlertCircle className="h-4 w-4 text-rose-500" />}
                    />
                  ))
                )}
              </TableCard>
            )}

            {activeTab === 'renewals' && (
              <TableCard
                title="Renewals"
                description="Submitted renewal requests."
              >
                {renewals.length === 0 ? (
                  <EmptyState
                    title="No renewals"
                    description="Renewal requests will show up here when submitted."
                  />
                ) : (
                  renewals.map((renewal) => (
                    <WorkItemRow
                      key={renewal.id}
                      title={renewal.tenant_name || 'Renewal'}
                      subtitle={`${renewal.building_name} · Room ${renewal.room_number}`}
                      badges={[
                        {
                          key: 'status',
                          label: String(renewal.status || 'Pending').replace(/_/g, ' '),
                          tone: 'info',
                        },
                      ]}
                      date={formatShortDate(renewal.proposed_lease_end_date)}
                      metaLabel={`₱${Number(renewal.proposed_monthly_rent || 0).toLocaleString()}`}
                      metaDetail={`from ₱${Number(renewal.current_monthly_rent || 0).toLocaleString()}`}
                      dotTone="info"
                    />
                  ))
                )}
              </TableCard>
            )}

            {activeTab === 'moveouts' && (
              <TableCard
                title="Move-outs"
                description="Open a record from the View button for inspection and refund."
              >
                {moveouts.length === 0 ? (
                  <EmptyState
                    title="No move-outs"
                    description="Start a move-out to open the inspection worksheet. The unit stays occupied until you finalize."
                    action={
                      <Button type="button" onClick={() => setStartMoveOutOpen(true)}>
                        Start move-out
                      </Button>
                    }
                  />
                ) : (
                  moveouts.map((moveout) => (
                    <WorkItemRow
                      key={moveout.id}
                      href={`/admin/leasing/moveouts/${moveout.id}`}
                      title={moveout.tenant_name || 'Move-out'}
                      subtitle={`${moveout.building_name} · Room ${moveout.room_number}`}
                      badges={[
                        {
                          key: 'status',
                          label: String(moveout.status || 'Open').replace(/_/g, ' '),
                          tone: 'info',
                        },
                      ]}
                      date={formatShortDate(moveout.moveout_date)}
                      metaLabel={String(moveout.status || 'Open').replace(/_/g, ' ')}
                      dotTone="info"
                    />
                  ))
                )}
              </TableCard>
            )}
          </>
        ))}

      <StartMoveOutModal
        isOpen={startMoveOutOpen}
        onClose={() => setStartMoveOutOpen(false)}
      />
      <NewLeaseModal
        isOpen={newLeaseOpen}
        onClose={() => setNewLeaseOpen(false)}
        onCreated={() => {
          setNewLeaseOpen(false);
          void fetchLeases();
        }}
      />
    </div>
  );
}
