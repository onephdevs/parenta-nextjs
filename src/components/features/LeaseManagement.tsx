'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/StatCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { LeaseStatusBadge } from '@/components/domain/StatusBadges';
import {
  formatLeaseTermShort,
  type LeaseListItem,
  type LeaseStats,
  type LeaseUiStatus,
} from '@/lib/leases-shared';

type OpsTab = 'leases' | 'alerts' | 'renewals' | 'moveouts';

interface BuildingOption {
  id: string;
  name: string;
}

export default function LeaseManagement() {
  const [activeTab, setActiveTab] = useState<OpsTab>('leases');
  const [loading, setLoading] = useState(false);
  const [leases, setLeases] = useState<LeaseListItem[]>([]);
  const [stats, setStats] = useState<LeaseStats | null>(null);
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<LeaseUiStatus | 'all'>('all');
  const [buildingId, setBuildingId] = useState('');
  const [alerts, setAlerts] = useState<any[]>([]);
  const [renewals, setRenewals] = useState<any[]>([]);
  const [moveouts, setMoveouts] = useState<any[]>([]);

  const fetchLeases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (status !== 'all') params.set('status', status);
      if (buildingId) params.set('buildingId', buildingId);
      params.set('includeStats', 'true');

      const response = await fetch(`/api/leases?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setLeases(data.data || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching leases:', error);
    } finally {
      setLoading(false);
    }
  }, [search, status, buildingId]);

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
        ? 'border-purple-500 text-purple-600'
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
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard title="Active" value={stats.active} tone="green" />
          <StatCard title="Expiring soon" value={stats.expiringSoon} tone="yellow" />
          <StatCard title="Draft" value={stats.draft} tone="default" />
          <StatCard title="Terminated" value={stats.terminated} tone="red" />
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') fetchLeases();
                }}
                placeholder="Search by tenant or unit"
                className="pl-9"
              />
            </div>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as LeaseUiStatus | 'all')}
              className="sm:w-48"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="expiring_soon">Expiring soon</option>
              <option value="draft">Draft</option>
              <option value="terminated">Terminated</option>
            </Select>
            <Select
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
              className="sm:w-56"
            >
              <option value="">All properties</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
            <Button variant="outline" onClick={fetchLeases} isDisabled={loading}>
              Apply
            </Button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-gray-500">Loading leases...</div>
          ) : leases.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-8 w-8" />}
              title="No leases found"
              description="Create a tenant with a room assignment to start a lease."
              action={
                <Link href="/admin/tenants/new?returnTo=/admin/lease-management">
                  <Button leftIcon={<Plus className="h-4 w-4" />}>New lease</Button>
                </Link>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit</TableHead>
                    <TableHead>Tenant(s)</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Rent</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leases.map((lease) => {
                    const tenantLabel = `${lease.tenantFirstName} ${lease.tenantLastName}`.trim();
                    const withOccupants =
                      lease.occupantCount > 0
                        ? `${tenantLabel} +${lease.occupantCount}`
                        : tenantLabel || '—';
                    return (
                      <TableRow key={lease.id} className="hover:bg-gray-50">
                        <TableCell>
                          <Link
                            href={`/admin/lease-management/${lease.id}`}
                            className="font-medium text-gray-900 hover:text-purple-700"
                          >
                            {lease.buildingName} · {lease.roomNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="text-gray-700">{withOccupants}</TableCell>
                        <TableCell className="text-gray-700">
                          {formatLeaseTermShort(lease.startDate, lease.endDate)}
                        </TableCell>
                        <TableCell className="text-gray-900">
                          ₱{Number(lease.monthlyRate || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <LeaseStatusBadge status={lease.uiStatus} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {activeTab !== 'leases' &&
        (loading ? (
          <div className="py-12 text-center text-sm text-gray-500">Loading...</div>
        ) : (
          <>
            {activeTab === 'alerts' && (
              <div className="space-y-4">
                {alerts.length === 0 ? (
                  <p className="text-gray-600">No pending alerts</p>
                ) : (
                  alerts.map((alert) => (
                    <div key={alert.id} className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">{alert.tenant_name}</h3>
                          <p className="text-sm text-gray-600">
                            {alert.building_name} - Room {alert.room_number}
                          </p>
                          <p className="mt-2 text-sm text-gray-800">
                            <strong>Lease ends:</strong>{' '}
                            {new Date(alert.lease_end_date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-800">
                            <strong>Days until expiry:</strong>{' '}
                            <span className="font-bold text-red-600">{alert.days_until_expiry}</span>
                          </p>
                        </div>
                        <span className="rounded bg-yellow-200 px-3 py-1 text-sm text-yellow-800">
                          {alert.alert_type}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'renewals' && (
              <div className="space-y-4">
                {renewals.length === 0 ? (
                  <p className="text-gray-600">No renewal requests</p>
                ) : (
                  renewals.map((renewal) => (
                    <div key={renewal.id} className="rounded-lg border border-gray-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">{renewal.tenant_name}</h3>
                          <p className="text-sm text-gray-600">
                            {renewal.building_name} - Room {renewal.room_number}
                          </p>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-800">
                            <div>
                              <strong>Current rent:</strong> ₱{renewal.current_monthly_rent}
                            </div>
                            <div>
                              <strong>Proposed rent:</strong> ₱{renewal.proposed_monthly_rent}
                            </div>
                            <div>
                              <strong>Current end:</strong>{' '}
                              {new Date(renewal.current_lease_end_date).toLocaleDateString()}
                            </div>
                            <div>
                              <strong>Proposed end:</strong>{' '}
                              {new Date(renewal.proposed_lease_end_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <span className="rounded bg-gray-100 px-3 py-1 text-sm capitalize text-gray-800">
                          {renewal.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'moveouts' && (
              <div className="space-y-4">
                {moveouts.length === 0 ? (
                  <p className="text-gray-600">No move-out processing records</p>
                ) : (
                  moveouts.map((moveout) => (
                    <div key={moveout.id} className="rounded-lg border border-gray-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">{moveout.tenant_name}</h3>
                          <p className="text-sm text-gray-600">
                            {moveout.building_name} - Room {moveout.room_number}
                          </p>
                          <p className="mt-2 text-sm text-gray-800">
                            <strong>Move-out date:</strong>{' '}
                            {new Date(moveout.moveout_date).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="rounded bg-blue-100 px-3 py-1 text-sm capitalize text-blue-800">
                          {moveout.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        ))}
    </div>
  );
}
