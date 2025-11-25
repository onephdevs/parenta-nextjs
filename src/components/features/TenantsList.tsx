'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Tenant, Building } from '@/types/database';
import TenantCard from './TenantCard';

interface TenantsListProps {
  tenants: Tenant[];
  buildings: Building[];
}

export default function TenantsList({ tenants }: TenantsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('lastName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter and sort tenants
  const filteredAndSortedTenants = useMemo(() => {
    const filtered = tenants.filter(tenant => {
      const matchesSearch = !searchTerm || (
        tenant.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tenant.phone && tenant.phone.includes(searchTerm))
      );

      const matchesStatus = !selectedStatus || tenant.tenantStatus === selectedStatus;

      return matchesSearch && matchesStatus;
    });

    // Sort tenants
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
      } else {
        return sortOrder === 'asc' ? 
          (aValue as number) - (bValue as number) : 
          (bValue as number) - (aValue as number);
      }
    });

    return filtered;
  }, [tenants, searchTerm, selectedStatus, sortBy, sortOrder]);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'terminated':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header with Search and Filters */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search tenants by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Filters and Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
              <option value="terminated">Terminated</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="lastName">Sort by Last Name</option>
              <option value="firstName">Sort by First Name</option>
              <option value="email">Sort by Email</option>
              <option value="tenantStatus">Sort by Status</option>
              <option value="monthlyIncome">Sort by Income</option>
              <option value="moveInDate">Sort by Move-in Date</option>
            </select>

            {/* Sort Order */}
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm leading-4 font-medium text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              {sortOrder === 'asc' ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
              )}
            </button>

            {/* View Mode Toggle */}
            <div className="inline-flex rounded-md shadow-sm">
              <button
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                  viewMode === 'grid'
                    ? 'bg-purple-50 text-purple-700 border-purple-300'
                    : 'bg-white text-gray-900 hover:bg-gray-50'
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center px-3 py-2 rounded-r-md border border-l-0 border-gray-300 text-sm font-medium ${
                  viewMode === 'list'
                    ? 'bg-purple-50 text-purple-700 border-purple-300'
                    : 'bg-white text-gray-900 hover:bg-gray-50'
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-4 text-sm text-gray-900">
          Showing {filteredAndSortedTenants.length} of {tenants.length} tenants
        </div>
      </div>

      {/* Tenants Display */}
      <div className="p-6">
        {filteredAndSortedTenants.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 515.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No tenants found</h3>
            <p className="mt-1 text-sm text-gray-900">
              {searchTerm || selectedStatus
                ? 'Try adjusting your search criteria.'
                : 'Get started by adding your first tenant.'
              }
            </p>
            {(!searchTerm && !selectedStatus) && (
              <div className="mt-6">
                <Link
                  href="/admin/tenants/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Tenant
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAndSortedTenants.map(tenant => (
                  <TenantCard 
                    key={tenant.id} 
                    tenant={tenant}
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Tenant</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Income</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Move-in Date</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-900 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAndSortedTenants.map(tenant => (
                      <tr key={tenant.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                                <span className="text-sm font-medium text-purple-600">
                                  {tenant.firstName.charAt(0)}{tenant.lastName.charAt(0)}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {tenant.firstName} {tenant.lastName}
                              </div>
                              <div className="text-sm text-gray-900">{tenant.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {tenant.phone || 'No phone'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(tenant.tenantStatus)}`}>
                            {tenant.tenantStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {tenant.monthlyIncome ? `$${tenant.monthlyIncome.toLocaleString()}` : 'Not specified'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {tenant.moveInDate ? new Date(tenant.moveInDate).toLocaleDateString() : 'Not set'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={`/admin/tenants/${tenant.id}`}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 