'use client';

import { useState, useMemo } from 'react';
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
import { ArrowDownAZ, ArrowUpAZ, LayoutGrid, List, Plus, Search, Users } from 'lucide-react';

interface TenantsListProps {
  tenants: Tenant[];
  buildings: Building[];
}

export default function TenantsList({ tenants }: TenantsListProps) {
  const { formatCurrency } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('lastName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredAndSortedTenants = useMemo(() => {
    const filtered = tenants.filter((tenant) => {
      const matchesSearch =
        !searchTerm ||
        tenant.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tenant.phone && tenant.phone.includes(searchTerm));

      const matchesStatus = !selectedStatus || tenant.tenantStatus === selectedStatus;

      return matchesSearch && matchesStatus;
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
  }, [tenants, searchTerm, selectedStatus, sortBy, sortOrder]);

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="border-b border-gray-200 p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              className="pl-10"
              placeholder="Search tenants by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
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
                  'inline-flex items-center justify-center px-3 py-2 rounded-l-md border text-sm font-medium',
                  viewMode === 'grid'
                    ? 'bg-purple-50 text-purple-700 border-purple-300'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-label="List view"
                className={cn(
                  'inline-flex items-center justify-center px-3 py-2 rounded-r-md border border-l-0 text-sm font-medium',
                  viewMode === 'list'
                    ? 'bg-purple-50 text-purple-700 border-purple-300'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
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
              searchTerm || selectedStatus
                ? 'Try adjusting your search criteria.'
                : 'Get started by adding your first tenant.'
            }
            action={
              !searchTerm && !selectedStatus ? (
                <Link href="/admin/tenants/new">
                  <Button leftIcon={<Plus className="h-4 w-4" />}>Add Tenant</Button>
                </Link>
              ) : undefined
            }
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedTenants.map((tenant) => (
              <TenantCard key={tenant.id} tenant={tenant} />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Income</TableHead>
                <TableHead>Move-in Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedTenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={`${tenant.firstName} ${tenant.lastName}`} />
                      <div>
                        <div className="font-medium text-gray-900">
                          {tenant.firstName} {tenant.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{tenant.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{tenant.phone || 'No phone'}</TableCell>
                  <TableCell>
                    <TenantStatusBadge status={tenant.tenantStatus} />
                  </TableCell>
                  <TableCell>
                    {tenant.monthlyIncome
                      ? formatCurrency(tenant.monthlyIncome)
                      : 'Not specified'}
                  </TableCell>
                  <TableCell>
                    {tenant.moveInDate
                      ? new Date(tenant.moveInDate).toLocaleDateString()
                      : 'Not set'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/tenants/${tenant.id}`}
                      className="text-sm font-medium text-purple-600 hover:text-purple-900"
                    >
                      View Details
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </Card>
  );
}
