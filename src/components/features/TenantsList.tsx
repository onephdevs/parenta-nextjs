'use client';

import { useState, useMemo, useEffect, Fragment } from 'react';
import Link from 'next/link';
import { Tenant, Building } from '@/types/database';
import TenantCard from './TenantCard';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Avatar } from '@/components/ui/Avatar';
import { FormField } from '@/components/forms/FormField';
import Pagination from '@/components/ui/Pagination';
import { TenantStatusBadge } from '@/components/domain/StatusBadges';
import { cn } from '@/lib/utils';
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Building2,
  Eye,
  LayoutGrid,
  List,
  Plus,
  Search,
} from 'lucide-react';

const PAGE_SIZE = 20;
const UNASSIGNED_KEY = '__unassigned__';

interface TenantsListProps {
  tenants: Tenant[];
  buildings: Building[];
}

function propertyUnitLabel(tenant: Tenant): string | null {
  const room = tenant.currentRoomNumber?.trim();
  const building = tenant.currentBuildingName?.trim();
  if (room && building) return `Unit ${room} · ${building}`;
  if (room) return `Unit ${room}`;
  if (building) return building;
  return null;
}

function groupTenantsByProperty(tenants: Tenant[]) {
  const groups = new Map<string, { key: string; title: string; tenants: Tenant[] }>();

  for (const tenant of tenants) {
    const key = tenant.currentBuildingId || UNASSIGNED_KEY;
    const title = tenant.currentBuildingName?.trim() || 'Unassigned';
    const existing = groups.get(key);
    if (existing) {
      existing.tenants.push(tenant);
    } else {
      groups.set(key, { key, title, tenants: [tenant] });
    }
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.key === UNASSIGNED_KEY) return 1;
    if (b.key === UNASSIGNED_KEY) return -1;
    return a.title.localeCompare(b.title);
  });
}

export default function TenantsList({ tenants, buildings }: TenantsListProps) {
  const { formatCurrency } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState('lastName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
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

      const matchesStatus = !selectedStatus || tenant.tenantStatus === selectedStatus;

      const matchesProperty =
        !selectedBuildingId ||
        (selectedBuildingId === UNASSIGNED_KEY
          ? !tenant.currentBuildingId
          : tenant.currentBuildingId === selectedBuildingId);

      return matchesSearch && matchesStatus && matchesProperty;
    });

    filtered.sort((a, b) => {
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
          aValue = (a.currentBuildingName || 'zzz').toLowerCase();
          bValue = (b.currentBuildingName || 'zzz').toLowerCase();
          break;
        default:
          aValue = a.lastName.toLowerCase();
          bValue = b.lastName.toLowerCase();
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    return filtered;
  }, [tenants, searchTerm, selectedStatus, selectedBuildingId, sortBy, sortOrder]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, selectedBuildingId, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedTenants.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const groupedTenants = useMemo(() => {
    const pageTenants = filteredAndSortedTenants.slice(
      (safePage - 1) * PAGE_SIZE,
      safePage * PAGE_SIZE
    );
    return groupTenantsByProperty(pageTenants);
  }, [filteredAndSortedTenants, safePage]);

  const hasActiveFilters = Boolean(searchTerm || selectedStatus || selectedBuildingId);

  return (
    <div className="space-y-6">
      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <FormField label="Search" htmlFor="tenant-search" className="lg:col-span-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                id="tenant-search"
                className="pl-10"
                placeholder="Name, email, phone, or unit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
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
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
              <option value="terminated">Terminated</option>
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
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            Showing {filteredAndSortedTenants.length} of {tenants.length} tenants
          </p>
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
      </Card>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        {filteredAndSortedTenants.length === 0 ? (
          <div className="p-8 text-center text-gray-900">
            <p className="mb-2 text-lg font-medium">No tenants found</p>
            <p className="mb-4 text-sm text-gray-600">
              {hasActiveFilters
                ? 'Try adjusting your search or filters.'
                : 'Get started by adding your first tenant.'}
            </p>
            {!hasActiveFilters && (
              <Link href="/admin/tenants/new">
                <Button leftIcon={<Plus className="h-4 w-4" />}>Add Tenant</Button>
              </Link>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <>
            <div className="space-y-8 p-6">
              {groupedTenants.map((group) => (
                <section key={group.key}>
                  <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <h3 className="text-sm font-bold text-gray-900">{group.title}</h3>
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      Tenant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      Property / Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      Income
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      Move-in Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {groupedTenants.map((group) => (
                    <Fragment key={group.key}>
                      <tr className="bg-gray-50">
                        <td colSpan={7} className="px-6 py-2">
                          <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                            <Building2 className="h-3.5 w-3.5 text-gray-500" />
                            {group.title}
                            <span className="font-normal text-gray-500">
                              · {group.tenants.length}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {group.tenants.map((tenant) => {
                        const unitLabel = propertyUnitLabel(tenant);
                        return (
                          <tr key={tenant.id} className="hover:bg-gray-50">
                            <td className="whitespace-nowrap px-6 py-4">
                              <div className="flex items-center gap-3">
                                <Avatar name={`${tenant.firstName} ${tenant.lastName}`} />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {tenant.firstName} {tenant.lastName}
                                  </div>
                                  {tenant.email && (
                                    <div className="text-xs text-gray-500">{tenant.email}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              {unitLabel || <span className="text-gray-400">Unassigned</span>}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              {tenant.phone || <span className="text-gray-400">—</span>}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4">
                              <TenantStatusBadge status={tenant.tenantStatus} />
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              {tenant.monthlyIncome ? (
                                formatCurrency(tenant.monthlyIncome)
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              {tenant.moveInDate ? (
                                new Date(tenant.moveInDate).toLocaleDateString()
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                              <Link
                                href={`/admin/tenants/${tenant.id}`}
                                className="inline-flex text-gray-500 hover:text-gray-900"
                                title="View"
                              >
                                <Eye className="h-5 w-5" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
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
