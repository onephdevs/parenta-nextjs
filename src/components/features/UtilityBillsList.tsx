'use client';

import { useState, useEffect } from 'react';
import { UtilityBill, Building } from '@/types/database';
import {
  Badge,
  Button,
  EmptyState,
  Input,
  SearchInput,
  Select,
} from '@/components/ui';
import { InvoiceStatusBadge } from '@/components/domain/StatusBadges';
import { FormField } from '@/components/forms/FormField';

interface Filters {
  buildingId?: string;
  utilityType?: string;
  billStatus?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

interface UtilityBillsListProps {
  bills: UtilityBill[];
  loading: boolean;
  filters: Filters;
  onFilterChange: (filters: Partial<Filters>) => void;
  onClearFilters: () => void;
  onEditBill: (bill: UtilityBill) => void;
  onDeleteBill: (billId: string) => void;
  onUpdateStatus: (billId: string, status: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function UtilityBillsList({
  bills,
  loading,
  filters,
  onFilterChange,
  onClearFilters,
  onEditBill,
  onDeleteBill,
  onUpdateStatus,
  currentPage,
  totalPages,
  onPageChange,
}: UtilityBillsListProps) {
  const [buildings, setBuildings] = useState<Building[]>([]);

  useEffect(() => {
    fetchBuildings();
  }, []);

  const fetchBuildings = async () => {
    try {
      const response = await fetch('/api/buildings');
      if (response.ok) {
        const data = await response.json();
        setBuildings(data.buildings || []);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  const utilityTypes = [
    'electricity',
    'water',
    'gas',
    'internet',
    'cable',
    'waste',
    'other',
  ];

  const billStatuses = [
    'pending',
    'paid',
    'overdue',
    'disputed',
  ];

  const getStatusBadge = (status: string) => {
    if (status === 'disputed') {
      return <Badge tone="warning">Disputed</Badge>;
    }
    return <InvoiceStatusBadge status={status} />;
  };

  const getUtilityIcon = (type: string) => {
    const icons = {
      electricity: '⚡',
      water: '💧',
      gas: '🔥',
      internet: '🌐',
      cable: '📺',
      waste: '🗑️',
      other: '📋',
    };
    return icons[type as keyof typeof icons] || '📋';
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const getDaysUntilDue = (dueDate: Date | string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const hasActiveFilters = Object.values(filters).some(value => value && value !== '');

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow">
      <div className="border-b border-gray-200 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Utility Bills</h3>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClearFilters}>
              Clear all filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
          <FormField label="Search" htmlFor="utility-bills-search" className="lg:col-span-2">
            <SearchInput
              id="utility-bills-search"
              placeholder="Search provider, account, notes..."
              value={filters.search || ''}
              onChange={(e) => onFilterChange({ search: e.target.value })}
            />
          </FormField>

          <FormField label="Building" htmlFor="utility-bills-building">
            <Select
              id="utility-bills-building"
              value={filters.buildingId || ''}
              onChange={(e) => onFilterChange({ buildingId: e.target.value || undefined })}
            >
              <option value="">All Buildings</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Type" htmlFor="utility-bills-type">
            <Select
              id="utility-bills-type"
              value={filters.utilityType || ''}
              onChange={(e) => onFilterChange({ utilityType: e.target.value || undefined })}
            >
              <option value="">All Types</option>
              {utilityTypes.map((type) => (
                <option key={type} value={type}>
                  {getUtilityIcon(type)} {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Status" htmlFor="utility-bills-status">
            <Select
              id="utility-bills-status"
              value={filters.billStatus || ''}
              onChange={(e) => onFilterChange({ billStatus: e.target.value || undefined })}
            >
              <option value="">All Statuses</option>
              {billStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="From" htmlFor="utility-bills-from">
            <Input
              id="utility-bills-from"
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => onFilterChange({ startDate: e.target.value || undefined })}
              min="2000-01-01"
              max="2099-12-31"
              style={{ colorScheme: 'light' }}
            />
          </FormField>

          <FormField label="To" htmlFor="utility-bills-to">
            <Input
              id="utility-bills-to"
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => onFilterChange({ endDate: e.target.value || undefined })}
              min="2000-01-01"
              max="2099-12-31"
              style={{ colorScheme: 'light' }}
            />
          </FormField>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Utility & Provider
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Building
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Billing Period
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              [...Array(5)].map((_, index) => (
                <tr key={index} className="animate-pulse">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-32" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-24" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-16" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-28" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-20" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-16" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-24" />
                  </td>
                </tr>
              ))
            ) : bills.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    title={
                      hasActiveFilters
                        ? 'No bills match your filters'
                        : 'No utility bills found'
                    }
                  />
                </td>
              </tr>
            ) : (
              bills.map((bill) => {
                const daysUntilDue = getDaysUntilDue(bill.dueDate);
                const building = buildings.find(b => b.id === bill.buildingId);

                return (
                  <tr key={bill.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{getUtilityIcon(bill.utilityType)}</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {bill.providerName}
                          </div>
                          <div className="text-sm text-gray-900 capitalize">
                            {bill.utilityType}
                          </div>
                          {bill.providerAccountNumber && (
                            <div className="text-xs text-gray-400">
                              Account: {bill.providerAccountNumber}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {building?.name || 'Unknown Building'}
                      </div>
                      {building && (
                        <div className="text-sm text-gray-900">
                          {building.city}, {building.state}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(bill.amount)}
                      </div>
                      {bill.usageAmount && (
                        <div className="text-sm text-gray-900">
                          {bill.usageAmount} {bill.usageUnit || 'units'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{formatDate(bill.billingPeriodStart)}</div>
                      <div>to {formatDate(bill.billingPeriodEnd)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(bill.dueDate)}
                      </div>
                      <div className={`text-xs ${
                        daysUntilDue < 0
                          ? 'text-red-600'
                          : daysUntilDue <= 7
                            ? 'text-yellow-600'
                            : 'text-gray-900'
                      }`}>
                        {daysUntilDue < 0
                          ? `${Math.abs(daysUntilDue)} days overdue`
                          : daysUntilDue === 0
                            ? 'Due today'
                            : `${daysUntilDue} days remaining`
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(bill.billStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditBill(bill)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </Button>

                        {bill.billStatus !== 'paid' && (
                          <Select
                            value=""
                            size="sm"
                            onChange={(e) => {
                              if (e.target.value) {
                                onUpdateStatus(bill.id, e.target.value);
                              }
                            }}
                            className="w-auto text-xs"
                          >
                            <option value="">Change Status</option>
                            <option value="paid">Mark as Paid</option>
                            <option value="overdue">Mark as Overdue</option>
                            <option value="disputed">Mark as Disputed</option>
                            <option value="pending">Mark as Pending</option>
                          </Select>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteBill(bill.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-900">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              isDisabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              isDisabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
