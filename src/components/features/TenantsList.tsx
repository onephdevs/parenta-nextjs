'use client';

import { useState, useMemo, useEffect, Fragment } from 'react';
import Link from 'next/link';
import { Tenant, Building } from '@/types/database';
import TenantCard from './TenantCard';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  Avatar,
  EmptyState,
  FilterBar,
  IconButton,
  Pagination,
  SearchInput,
  Select,
} from '@/components/ui';
import { FormField } from '@/components/forms/FormField';
import AddTenantButton from '@/components/features/tenants/AddTenantButton';
import { cn } from '@/lib/utils';
import { getImageUrl } from '@/lib/format/image-url';
import { compareByRoomThenName, compareNatural } from '@/lib/utils/natural-sort';
import { getPastDueStatus } from '@/lib/past-due-status';
import {
  getAllTenantTags,
  getPaymentGroupKey,
  getPaymentStatusTag,
  tenantMatchesSignalFilter,
  PAYMENT_GROUP_META,
  SIGNAL_FILTER_OPTIONS,
  type TenantTagInput,
} from '@/lib/services/tenant-list-tags';
import {
  AlertTriangle,
  ArrowDownAZ,
  ArrowUpAZ,
  Building2,
  Calendar,
  CheckCircle2,
  Circle,
  Clock3,
  Droplets,
  FileSignature,
  LayoutGrid,
  List,
  PhilippinePeso,
  Receipt,
  ShieldAlert,
  Wrench,
  Zap,
} from 'lucide-react';

const PAGE_SIZE = 40;
const UNASSIGNED_KEY = '__unassigned__';

interface TenantsListProps {
  tenants: Tenant[];
  buildings: Building[];
}

type GroupBy = 'property' | 'payment';

function tagInput(tenant: Tenant): TenantTagInput {
  return {
    tenantStatus: tenant.tenantStatus,
    currentBuildingId: tenant.currentBuildingId,
    insights: tenant.insights,
  };
}

function unitLabel(roomNumber?: string | null): string | null {
  const n = roomNumber?.trim();
  if (!n) return null;
  if (/^unit\b/i.test(n)) return n;
  return `Unit ${n}`;
}

function propertyUnitLabel(tenant: Tenant): string | null {
  const room = unitLabel(tenant.currentRoomNumber);
  const building = tenant.currentBuildingName?.trim();
  if (room && building) return `${room} · ${building}`;
  if (room) return room;
  if (building) return building;
  return null;
}

function shortId(tenant: Tenant): string {
  const room = tenant.currentRoomNumber?.replace(/^unit\s*/i, '').trim();
  if (room) return room.length <= 8 ? room.toUpperCase() : room.slice(0, 8).toUpperCase();
  return tenant.id.slice(0, 6).toUpperCase();
}

function formatDueDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

function groupTenantsByProperty(tenants: Tenant[]) {
  const groups = new Map<string, { key: string; title: string; tone: string; dotClass: string; tenants: Tenant[] }>();

  for (const tenant of tenants) {
    const key = tenant.currentBuildingId || UNASSIGNED_KEY;
    const title = tenant.currentBuildingName?.trim() || 'Unassigned';
    const existing = groups.get(key);
    if (existing) {
      existing.tenants.push(tenant);
    } else {
      groups.set(key, {
        key,
        title,
        tone: 'text-gray-900',
        dotClass: 'fill-slate-400 text-slate-400',
        tenants: [tenant],
      });
    }
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      tenants: [...group.tenants].sort(compareByRoomThenName),
    }))
    .sort((a, b) => {
      if (a.key === UNASSIGNED_KEY) return 1;
      if (b.key === UNASSIGNED_KEY) return -1;
      return a.title.localeCompare(b.title);
    });
}

function groupTenantsByPayment(tenants: Tenant[]) {
  const buckets = new Map<string, Tenant[]>();
  for (const tenant of tenants) {
    const key = getPaymentGroupKey(tagInput(tenant));
    const list = buckets.get(key) || [];
    list.push(tenant);
    buckets.set(key, list);
  }

  return PAYMENT_GROUP_META.filter((g) => (buckets.get(g.key) || []).length > 0).map((g) => ({
    key: g.key,
    title: g.title,
    tone: g.tone,
    dotClass: g.dotClass,
    tenants: [...(buckets.get(g.key) || [])].sort(compareByRoomThenName),
  }));
}

function PaymentStatusIcon({ tenant }: { tenant: Tenant }) {
  const status = getPaymentStatusTag(tagInput(tenant));
  if (tenant.insights?.hasPaymentConfirmation) {
    return <ShieldAlert className="h-4 w-4 text-indigo-500" aria-label="Payment confirmation" />;
  }
  if (status.key === 'escalated' || status.key === 'overdue') {
    return <AlertTriangle className="h-4 w-4 text-rose-500" aria-label={status.label} />;
  }
  if (status.key === 'due_today' || status.key === 'due_soon') {
    return <Clock3 className="h-4 w-4 text-amber-500" aria-label={status.label} />;
  }
  return <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-label={status.label} />;
}

function StatusDot({ tenant }: { tenant: Tenant }) {
  if (tenant.insights?.hasPaymentConfirmation) {
    return <Circle className="h-3.5 w-3.5 fill-indigo-500 text-indigo-500" />;
  }
  const status = getPaymentStatusTag(tagInput(tenant));
  const map: Record<string, string> = {
    escalated: 'fill-red-700 text-red-700',
    overdue: 'fill-rose-500 text-rose-500',
    due_today: 'fill-orange-500 text-orange-500',
    due_soon: 'fill-amber-400 text-amber-400',
    paid_up: 'fill-emerald-500 text-emerald-500',
  };
  return <Circle className={cn('h-3.5 w-3.5', map[status.key] || map.paid_up)} />;
}

function TenantWorkItemRow({
  tenant,
  formatCurrency,
}: {
  tenant: Tenant;
  formatCurrency: (n: number) => string;
}) {
  const fullName = `${tenant.firstName} ${tenant.lastName}`.trim() || 'Unnamed tenant';
  const unit = unitLabel(tenant.currentRoomNumber);
  const badges = getAllTenantTags(tagInput(tenant));
  const dueLabel = formatDueDate(tenant.insights?.nextDueDate);
  const paymentStatus = getPaymentStatusTag(tagInput(tenant));
  const pastDue = getPastDueStatus({
    balance: tenant.insights?.balance || 0,
    daysPastDue: tenant.insights?.daysPastDue || 0,
    daysUntilDue: tenant.insights?.daysUntilDue,
  });

  const visibleBadges = badges.slice(0, 5);
  const moreCount = Math.max(0, badges.length - visibleBadges.length);

  return (
    <Link
      href={`/admin/tenants/${tenant.id}`}
      className="group flex items-center gap-3 border-b border-gray-100 px-3 py-2.5 transition-colors hover:bg-slate-50/80"
    >
      <StatusDot tenant={tenant} />

      <span className="w-14 shrink-0 font-mono text-[11px] text-gray-400 tabular-nums">
        {shortId(tenant)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-medium text-gray-900 group-hover:text-gray-950">
            {fullName}
          </span>
          {unit && (
            <span className="truncate text-xs text-gray-500">{unit}</span>
          )}
        </div>
      </div>

      <div className="hidden min-w-0 items-center gap-1.5 sm:flex">
        <Avatar
          name={fullName}
          src={tenant.profilePictureUrl ? getImageUrl(tenant.profilePictureUrl) : null}
          size="sm"
          className="h-6 w-6 text-[10px]"
        />
      </div>

      <div className="hidden min-w-0 flex-[1.4] flex-wrap items-center justify-end gap-1.5 md:flex">
        {visibleBadges.map((b) => (
          <span
            key={b.key}
            className={cn(
              'inline-flex max-w-[10.5rem] items-center gap-1.5 rounded-md border border-gray-200/80 bg-white px-1.5 py-0.5 text-[11px] font-medium',
              b.textClass,
              b.kind === 'payment_status' && 'border-transparent bg-gray-50'
            )}
            title={b.label}
          >
            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', b.dotClass)} />
            <span className="truncate">{b.label}</span>
          </span>
        ))}
        {moreCount > 0 && (
          <span className="text-[11px] font-medium text-gray-500">
            {moreCount} more
          </span>
        )}
        {badges.length === 0 && (
          <span className="text-[11px] text-gray-400">—</span>
        )}
      </div>

      <div className="hidden w-24 shrink-0 items-center justify-end gap-1 text-xs text-gray-600 lg:flex">
        {dueLabel ? (
          <>
            <Calendar className="h-3.5 w-3.5 text-gray-400" />
            <span className="tabular-nums">{dueLabel}</span>
          </>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </div>

      <div className="hidden w-28 shrink-0 flex-col items-end sm:flex">
        {paymentStatus.key !== 'paid_up' ? (
          <>
            <span
              className={cn(
                'text-[11px] font-semibold',
                pastDue.tone === 'danger'
                  ? 'text-rose-600'
                  : pastDue.tone === 'warning'
                    ? 'text-amber-600'
                    : 'text-gray-600'
              )}
            >
              {paymentStatus.label}
            </span>
            {(tenant.insights?.balance || 0) > 0 && (
              <span className="text-[10px] tabular-nums text-gray-500">
                {formatCurrency(tenant.insights!.balance)}
              </span>
            )}
          </>
        ) : (
          <span className="text-[11px] text-gray-400">Paid up</span>
        )}
      </div>

      <div className="flex w-6 shrink-0 justify-end">
        <PaymentStatusIcon tenant={tenant} />
      </div>
    </Link>
  );
}

export default function TenantsList({ tenants, buildings }: TenantsListProps) {
  const { formatCurrency } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [signalFilter, setSignalFilter] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('payment');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState('urgency');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const buildingOptions = useMemo(() => {
    return buildings.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [buildings]);

  const filteredAndSortedTenants = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = tenants.filter((tenant) => {
      const firstName = (tenant.firstName || '').toLowerCase();
      const lastName = (tenant.lastName || '').toLowerCase();
      const email = (tenant.email || '').toLowerCase();
      const phone = (tenant.phone || '').toLowerCase();
      const propertyLabel = propertyUnitLabel(tenant)?.toLowerCase() || '';
      const matchesSearch =
        !term ||
        firstName.includes(term) ||
        lastName.includes(term) ||
        email.includes(term) ||
        phone.includes(term) ||
        propertyLabel.includes(term);

      const matchesStatus =
        !selectedStatus ||
        (selectedStatus === 'current'
          ? tenant.isTenant === true || tenant.tenantStatus === 'active'
          : selectedStatus === 'former'
            ? tenant.isTenant === false &&
              (tenant.tenantStatus === 'inactive' || tenant.tenantStatus === 'terminated')
            : tenant.tenantStatus === selectedStatus);

      const matchesProperty =
        !selectedBuildingId ||
        (selectedBuildingId === UNASSIGNED_KEY
          ? !tenant.currentBuildingId
          : tenant.currentBuildingId === selectedBuildingId);

      const matchesSignal = tenantMatchesSignalFilter(tagInput(tenant), signalFilter);

      return matchesSearch && matchesStatus && matchesProperty && matchesSignal;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'urgency') {
        // Payment confirmation first, then past-due rank
        const aConfirm = a.insights?.hasPaymentConfirmation ? 10000 : 0;
        const bConfirm = b.insights?.hasPaymentConfirmation ? 10000 : 0;
        const aRank =
          aConfirm +
          getPastDueStatus({
            balance: a.insights?.balance || 0,
            daysPastDue: a.insights?.daysPastDue || 0,
            daysUntilDue: a.insights?.daysUntilDue,
          }).urgencyRank;
        const bRank =
          bConfirm +
          getPastDueStatus({
            balance: b.insights?.balance || 0,
            daysPastDue: b.insights?.daysPastDue || 0,
            daysUntilDue: b.insights?.daysUntilDue,
          }).urgencyRank;
        return sortOrder === 'desc' ? bRank - aRank : aRank - bRank;
      }

      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortBy) {
        case 'firstName':
          aValue = (a.firstName || '').toLowerCase();
          bValue = (b.firstName || '').toLowerCase();
          break;
        case 'lastName':
          aValue = (a.lastName || '').toLowerCase();
          bValue = (b.lastName || '').toLowerCase();
          break;
        case 'email':
          aValue = (a.email || '').toLowerCase();
          bValue = (b.email || '').toLowerCase();
          break;
        case 'tenantStatus':
          aValue = a.tenantStatus || '';
          bValue = b.tenantStatus || '';
          break;
        case 'monthlyIncome':
          aValue = a.monthlyIncome || 0;
          bValue = b.monthlyIncome || 0;
          break;
        case 'moveInDate':
          aValue = a.moveInDate ? new Date(a.moveInDate).getTime() : 0;
          bValue = b.moveInDate ? new Date(b.moveInDate).getTime() : 0;
          break;
        case 'property':
          aValue = `${a.currentBuildingName || 'zzz'} ${a.currentRoomNumber || ''}`.toLowerCase();
          bValue = `${b.currentBuildingName || 'zzz'} ${b.currentRoomNumber || ''}`.toLowerCase();
          break;
        case 'dueDate':
          aValue = a.insights?.nextDueDate || '9999-99-99';
          bValue = b.insights?.nextDueDate || '9999-99-99';
          break;
        default:
          aValue = a.lastName.toLowerCase();
          bValue = b.lastName.toLowerCase();
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        if (
          sortBy === 'firstName' ||
          sortBy === 'lastName' ||
          sortBy === 'property'
        ) {
          const byNatural =
            sortOrder === 'asc'
              ? compareNatural(String(aValue), String(bValue))
              : compareNatural(String(bValue), String(aValue));
          if (byNatural !== 0) return byNatural;
          return sortOrder === 'asc'
            ? compareByRoomThenName(a, b)
            : compareByRoomThenName(b, a);
        }
        return sortOrder === 'asc'
          ? compareNatural(aValue, bValue)
          : compareNatural(bValue, aValue);
      }

      return sortOrder === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    return filtered;
  }, [
    tenants,
    searchTerm,
    selectedStatus,
    selectedBuildingId,
    signalFilter,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, selectedBuildingId, signalFilter, sortBy, sortOrder, groupBy]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedTenants.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const groupedTenants = useMemo(() => {
    const pageTenants = filteredAndSortedTenants.slice(
      (safePage - 1) * PAGE_SIZE,
      safePage * PAGE_SIZE
    );
    return groupBy === 'payment'
      ? groupTenantsByPayment(pageTenants)
      : groupTenantsByProperty(pageTenants);
  }, [filteredAndSortedTenants, safePage, groupBy]);

  const hasActiveFilters = Boolean(
    searchTerm || selectedStatus || selectedBuildingId || signalFilter
  );

  return (
    <div className="space-y-6">
      <FilterBar
        columns={6}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600">
              Showing {filteredAndSortedTenants.length} of {tenants.length} tenants
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-md shadow-sm">
                <button
                  type="button"
                  onClick={() => setGroupBy('payment')}
                  className={cn(
                    'rounded-l-md border px-3 py-1.5 text-xs font-medium',
                    groupBy === 'payment'
                      ? 'border-gray-800 bg-gray-900 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  )}
                >
                  By payment
                </button>
                <button
                  type="button"
                  onClick={() => setGroupBy('property')}
                  className={cn(
                    'rounded-r-md border border-l-0 px-3 py-1.5 text-xs font-medium',
                    groupBy === 'property'
                      ? 'border-gray-800 bg-gray-900 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  )}
                >
                  By property
                </button>
              </div>
              <div className="inline-flex rounded-md shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                  className={cn(
                    'inline-flex items-center justify-center rounded-l-md border px-3 py-2 text-sm font-medium',
                    viewMode === 'grid'
                      ? 'border-gray-800 bg-gray-900 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                  className={cn(
                    'inline-flex items-center justify-center rounded-r-md border border-l-0 px-3 py-2 text-sm font-medium',
                    viewMode === 'list'
                      ? 'border-gray-800 bg-gray-900 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        }
      >
        <FormField label="Search" htmlFor="tenant-search" className="lg:col-span-2">
          <SearchInput
            id="tenant-search"
            placeholder="Name, email, phone, or unit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </FormField>

        <FormField label="Building" htmlFor="tenant-property">
          <Select
            id="tenant-property"
            value={selectedBuildingId}
            onChange={(e) => setSelectedBuildingId(e.target.value)}
          >
            <option value="">All Buildings</option>
            {buildingOptions.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
            <option value={UNASSIGNED_KEY}>Unassigned</option>
          </Select>
        </FormField>

        <FormField label="Status" htmlFor="tenant-status">
          <Select
            id="tenant-status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="current">Current tenants</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="former">Former tenants</option>
            <option value="inactive">Inactive</option>
            <option value="terminated">Terminated</option>
          </Select>
        </FormField>

        <FormField label="Signal" htmlFor="tenant-signal">
          <Select
            id="tenant-signal"
            value={signalFilter}
            onChange={(e) => setSignalFilter(e.target.value)}
          >
            {SIGNAL_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Sort" htmlFor="tenant-sort">
          <div className="flex gap-2">
            <Select
              id="tenant-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="min-w-0 flex-1"
            >
              <option value="urgency">Payment urgency</option>
              <option value="dueDate">Due date</option>
              <option value="lastName">Last Name</option>
              <option value="firstName">First Name</option>
              <option value="property">Property</option>
              <option value="email">Email</option>
              <option value="tenantStatus">Status</option>
              <option value="monthlyIncome">Income</option>
              <option value="moveInDate">Move-in Date</option>
            </Select>
            <IconButton
              label={sortOrder === 'asc' ? 'Sort ascending' : 'Sort descending'}
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? (
                <ArrowUpAZ className="h-4 w-4" />
              ) : (
                <ArrowDownAZ className="h-4 w-4" />
              )}
            </IconButton>
          </div>
        </FormField>
      </FilterBar>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-gray-500">
        <span className="font-medium text-gray-600">Payment:</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Overdue
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-500" /> Due today
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Due soon
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> Confirmation
        </span>
        <span className="mx-1 text-gray-300">|</span>
        <span className="font-medium text-gray-600">Topics:</span>
        <span className="inline-flex items-center gap-1.5">
          <PhilippinePeso className="h-3 w-3 text-amber-500" /> Rent
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Receipt className="h-3 w-3 text-violet-500" /> Bills
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Droplets className="h-3 w-3 text-sky-500" /> Water
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Zap className="h-3 w-3 text-yellow-500" /> Electricity
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Wrench className="h-3 w-3 text-rose-500" /> Maintenance
        </span>
        <span className="inline-flex items-center gap-1.5">
          <FileSignature className="h-3 w-3 text-purple-500" /> Unsigned
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {filteredAndSortedTenants.length === 0 ? (
          <EmptyState
            title="No tenants found"
            description={
              hasActiveFilters
                ? 'Try adjusting your search or filters.'
                : 'Get started by adding your first tenant.'
            }
            action={!hasActiveFilters ? <AddTenantButton /> : undefined}
          />
        ) : viewMode === 'grid' ? (
          <>
            <div className="space-y-8 p-6">
              {groupedTenants.map((group) => (
                <section key={group.key}>
                  <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <h3 className={cn('text-sm font-bold', group.tone)}>{group.title}</h3>
                    <span className="text-xs text-gray-500">
                      {group.tenants.length}{' '}
                      {group.tenants.length === 1 ? 'tenant' : 'tenants'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {group.tenants.map((tenant) => (
                      <TenantCard key={tenant.id} tenant={tenant} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={filteredAndSortedTenants.length}
              itemsPerPage={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {groupedTenants.map((group) => (
                <Fragment key={group.key}>
                  <div className="flex items-center gap-2 bg-slate-50/80 px-3 py-2">
                    <Circle className={cn('h-3.5 w-3.5', group.dotClass)} />
                    <h3 className={cn('text-sm font-semibold', group.tone)}>
                      {group.title}
                    </h3>
                    <span className="text-xs text-gray-500">{group.tenants.length}</span>
                  </div>
                  <div>
                    {group.tenants.map((tenant) => (
                      <TenantWorkItemRow
                        key={tenant.id}
                        tenant={tenant}
                        formatCurrency={formatCurrency}
                      />
                    ))}
                  </div>
                </Fragment>
              ))}
            </div>
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={filteredAndSortedTenants.length}
              itemsPerPage={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
