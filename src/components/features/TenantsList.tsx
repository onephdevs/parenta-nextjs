'use client';

import { useState, useMemo, Fragment } from 'react';
import Link from 'next/link';
import { Tenant, Building } from '@/types/database';
import TenantCard from './TenantCard';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { TenantStatusBadge } from '@/components/domain/StatusBadges';
import { cn } from '@/lib/utils';
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Building2,
  LayoutGrid,
  List,
  Plus,
  Search,
  Users,
} from 'lucide-react';

interface TenantsListProps {
  tenants: Tenant[];
  buildings: Building[];
}

const UNASSIGNED_KEY = '__unassigned__';

function propertyUnitLabel(tenant: Tenant): string | null {
  const room = tenant.currentRoomNumber?.trim();
  const building = tenant.currentBuildingName?.trim();
  if (room && building) return `Unit ${room} · ${building}`;
  if (room) return `Unit ${room}`;
  if (building) return building;
  return null;
}

export default function TenantsList({ tenants, buildings }: TenantsListProps) {
  const { formatCurrency } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState('lastName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const buildingOptions = useMemo(() => {
    return buildings.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [buildings]);

  const filteredAndSortedTenants = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = tenants.filter((tenant) => {
      const propertyLabel = propertyUnitLabel(tenant)?.toLowerCase() || '';
      const matchesSearch =
        !term ||
        tenant.firstName.toLowerCase().includes(term) ||
        tenant.lastName.toLowerCase().includes(term) ||
        tenant.email.toLowerCase().includes(term) ||
        (tenant.phone && tenant.phone.includes(searchTerm)) ||
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
          aValue = a.firstName.toLowerCase();
          bValue = b.firstName.toLowerCase();
          break;
        case 'lastName':
          aValue = a.lastName.toLowerCase();
          bValue = b.lastName.toLowerCase();
          break;
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'tenantStatus':
          aValue = a.tenantStatus;
          bValue = b.tenantStatus;
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

  const groupedTenants = useMemo(() => {
    const groups = new Map<string, { key: string; title: string; tenants: Tenant[] }>();

    for (const tenant of filteredAndSortedTenants) {
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
  }, [filteredAndSortedTenants]);

  const hasActiveFilters = Boolean(searchTerm || selectedStatus || selectedBuildingId);

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="space-y-4 border-b border-gray-200 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              className="pl-10"
              placeholder="Search tenants by name, email, phone, or unit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={selectedBuildingId}
              onChange={(e) => setSelectedBuildingId(e.target.value)}
              className="w-auto min-w-[11rem]"
            >
              <option value="">All Properties</option>
              {buildingOptions.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
              <option value={UNASSIGNED_KEY}>Unassigned</option>
            </Select>

            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-auto min-w-[9rem]"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
              <option value="terminated">Terminated</option>
            </Select>

            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-auto min-w-[10rem]"
            >
              <option value="lastName">Sort by Last Name</option>
              <option value="firstName">Sort by First Name</option>
              <option value="property">Sort by Property</option>
              <option value="email">Sort by Email</option>
              <option value="tenantStatus">Sort by Status</option>
              <option value="monthlyIncome">Sort by Income</option>
              <option value="moveInDate">Sort by Move-in Date</option>
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

        <div className="text-sm text-gray-600">
          Showing {filteredAndSortedTenants.length} of {tenants.length} tenants
        </div>
      </div>

      <div className="p-6">
        {filteredAndSortedTenants.length === 0 ? (
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="No tenants found"
            description={
              hasActiveFilters
                ? 'Try adjusting your search or filters.'
                : 'Get started by adding your first tenant.'
            }
            action={
              !hasActiveFilters ? (
                <Link href="/admin/tenants/new">
                  <Button leftIcon={<Plus className="h-4 w-4" />}>Add Tenant</Button>
                </Link>
              ) : undefined
            }
          />
        ) : viewMode === 'grid' ? (
          <div className="space-y-8">
            {groupedTenants.map((group) => (
              <section key={group.key}>
                <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                  <Building2 className="h-4 w-4 text-[#39CCCC]" />
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
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Property / Unit</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Income</TableHead>
                <TableHead>Move-in Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedTenants.map((group) => (
                <Fragment key={group.key}>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableCell colSpan={7} className="py-2">
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                        <Building2 className="h-3.5 w-3.5 text-[#39CCCC]" />
                        {group.title}
                        <span className="font-normal text-gray-500">
                          · {group.tenants.length}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                  {group.tenants.map((tenant) => {
                    const unitLabel = propertyUnitLabel(tenant);
                    return (
                      <TableRow key={tenant.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar name={`${tenant.firstName} ${tenant.lastName}`} />
                            <div>
                              <div className="font-medium text-gray-900">
                                {tenant.firstName} {tenant.lastName}
                              </div>
                              {tenant.email && (
                                <div className="text-sm text-gray-500">{tenant.email}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {unitLabel ? (
                            <span className="inline-flex max-w-[14rem] items-center gap-1.5 rounded-md bg-[#E2E5F7] px-2 py-1 text-xs font-semibold text-gray-800">
                              <Building2 className="h-3 w-3 flex-shrink-0 text-[#39CCCC]" />
                              <span className="truncate">{unitLabel}</span>
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {tenant.phone ? (
                            tenant.phone
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <TenantStatusBadge status={tenant.tenantStatus} />
                        </TableCell>
                        <TableCell>
                          {tenant.monthlyIncome ? (
                            formatCurrency(tenant.monthlyIncome)
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {tenant.moveInDate ? (
                            new Date(tenant.moveInDate).toLocaleDateString()
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/admin/tenants/${tenant.id}`}>
                            <Button size="sm" variant="outline">
                              View Details
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </Card>
  );
}
