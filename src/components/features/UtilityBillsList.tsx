'use client';

import { useState, useEffect } from 'react';
import { UtilityBill, Building } from '../../types/database';

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
    'other'
  ];

  const billStatuses = [
    'pending',
    'paid',
    'overdue',
    'disputed'
  ];

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      disputed: 'bg-orange-100 text-orange-800',
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
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
    <div className="bg-white rounded-lg shadow border">
      {/* Filters */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Utility Bills</h3>
            {hasActiveFilters && (
              <button
                onClick={onClearFilters}
                className="text-sm text-gray-900 hover:text-gray-900"
              >
                Clear all filters
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <input
                type="text"
                placeholder="Search provider, account, notes..."
                value={filters.search || ''}
                onChange={(e) => onFilterChange({ search: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Building Filter */}
            <div>
              <select
                value={filters.buildingId || ''}
                onChange={(e) => onFilterChange({ buildingId: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Buildings</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Utility Type Filter */}
            <div>
              <select
                value={filters.utilityType || ''}
                onChange={(e) => onFilterChange({ utilityType: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                {utilityTypes.map((type) => (
                  <option key={type} value={type}>
                    {getUtilityIcon(type)} {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filters.billStatus || ''}
                onChange={(e) => onFilterChange({ billStatus: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                {billStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="lg:col-span-1">
              <input
                type="date"
                placeholder="Start Date"
                value={filters.startDate || ''}
                onChange={(e) => onFilterChange({ startDate: e.target.value || undefined })}
                min="2000-01-01"
                max="2099-12-31"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                style={{
                  colorScheme: 'light',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bills Table */}
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
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-28"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </td>
                </tr>
              ))
            ) : bills.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-900">
                  {hasActiveFilters ? 'No bills match your filters' : 'No utility bills found'}
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
                        <button
                          onClick={() => onEditBill(bill)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        
                        {bill.billStatus !== 'paid' && (
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                onUpdateStatus(bill.id, e.target.value);
                              }
                            }}
                            className="text-xs border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="">Change Status</option>
                            <option value="paid">Mark as Paid</option>
                            <option value="overdue">Mark as Overdue</option>
                            <option value="disputed">Mark as Disputed</option>
                            <option value="pending">Mark as Pending</option>
                          </select>
                        )}
                        
                        <button
                          onClick={() => onDeleteBill(bill.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-900">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 