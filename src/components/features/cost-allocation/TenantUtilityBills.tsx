'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Mail,
  Loader2
} from 'lucide-react';
import { useNotifications } from '../../../hooks/useNotifications';
import { format } from 'date-fns';

interface TenantUtilityBillsProps {
  buildingId?: string;
  tenantId?: string;
}

interface BillFilters {
  buildingId?: string;
  tenantId?: string;
  utilityType?: string;
  billStatus?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export default function TenantUtilityBills({ buildingId, tenantId }: TenantUtilityBillsProps) {
  const [bills, setBills] = useState<any[]>([]);
  const [filteredBills, setFilteredBills] = useState<any[]>([]);
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [filters, setFilters] = useState<BillFilters>({
    buildingId,
    tenantId
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showBillDetail, setShowBillDetail] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { addNotification } = useNotifications();

  const itemsPerPage = 20;

  useEffect(() => {
    fetchTenantBills();
  }, [buildingId, tenantId, currentPage]);

  useEffect(() => {
    applyFilters();
  }, [bills, filters]);

  const fetchTenantBills = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString()
      });

      if (buildingId) params.append('buildingId', buildingId);
      if (tenantId) params.append('tenantId', tenantId);

      const response = await fetch(`/api/tenant-utility-bills?${params}`);
      const data = await response.json();

      if (data.success) {
        setBills(data.data.bills);
        setTotalCount(data.data.total);
      } else {
        throw new Error(data.error || 'Failed to fetch tenant utility bills');
      }
    } catch (error) {
      console.error('Error fetching tenant utility bills:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load tenant utility bills'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...bills];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(bill => 
        bill.tenantName?.toLowerCase().includes(searchLower) ||
        bill.roomNumber?.toLowerCase().includes(searchLower) ||
        bill.utilityType?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.utilityType && filters.utilityType !== 'all') {
      filtered = filtered.filter(bill => bill.utilityType === filters.utilityType);
    }

    if (filters.billStatus && filters.billStatus !== 'all') {
      filtered = filtered.filter(bill => bill.billStatus === filters.billStatus);
    }

    if (filters.startDate) {
      filtered = filtered.filter(bill => 
        new Date(bill.billingPeriodStart) >= new Date(filters.startDate!)
      );
    }

    if (filters.endDate) {
      filtered = filtered.filter(bill => 
        new Date(bill.billingPeriodEnd) <= new Date(filters.endDate!)
      );
    }

    setFilteredBills(filtered);
  };

  const updateBillStatus = async (billId: string, status: string, paidDate?: Date) => {
    try {
      setIsUpdating(true);
      const response = await fetch('/api/tenant-utility-bills', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billId,
          status,
          paidDate: paidDate?.toISOString()
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchTenantBills();
        addNotification({
          type: 'success',
          title: 'Status Updated',
          message: `Bill status updated to ${status}`
        });
        setShowBillDetail(false);
      } else {
        throw new Error(data.error || 'Failed to update bill status');
      }
    } catch (error) {
      console.error('Error updating bill status:', error);
      addNotification({
        type: 'error',
        title: 'Update Error',
        message: 'Failed to update bill status'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case 'pending':
        return (
          <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </span>
        );
      case 'sent':
        return (
          <span className={`${baseClasses} bg-blue-100 text-blue-800`}>
            <Mail className="h-3 w-3 mr-1" />
            Sent
          </span>
        );
      case 'paid':
        return (
          <span className={`${baseClasses} bg-green-100 text-green-800`}>
            <CheckCircle className="h-3 w-3 mr-1" />
            Paid
          </span>
        );
      case 'overdue':
        return (
          <span className={`${baseClasses} bg-red-100 text-red-800`}>
            <AlertTriangle className="h-3 w-3 mr-1" />
            Overdue
          </span>
        );
      default:
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
            {status}
          </span>
        );
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow border p-6">
        <div className="space-y-4">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow border p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tenant Utility Bills
          </h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tenant, room, utility..."
                    value={filters.search || ''}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Utility Type</label>
                <select
                  value={filters.utilityType || 'all'}
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    utilityType: e.target.value === 'all' ? undefined : e.target.value 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="electricity">Electricity</option>
                  <option value="water">Water</option>
                  <option value="gas">Gas</option>
                  <option value="internet">Internet</option>
                  <option value="cable">Cable TV</option>
                  <option value="waste">Waste</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Status</label>
                <select
                  value={filters.billStatus || 'all'}
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    billStatus: e.target.value === 'all' ? undefined : e.target.value 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Period Start</label>
                <input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setFilters({ buildingId, tenantId })}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {filteredBills.filter(b => b.billStatus === 'pending').length}
            </div>
            <div className="text-sm text-blue-600">Pending Bills</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {filteredBills.filter(b => b.billStatus === 'paid').length}
            </div>
            <div className="text-sm text-green-600">Paid Bills</div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {filteredBills.filter(b => b.billStatus === 'overdue').length}
            </div>
            <div className="text-sm text-red-600">Overdue Bills</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              ${filteredBills.reduce((sum, b) => sum + b.allocatedAmount, 0).toFixed(2)}
            </div>
            <div className="text-sm text-purple-600">Total Amount</div>
          </div>
        </div>

        {/* Bills Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Room
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Utility
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBills.map((bill) => (
                <tr key={bill.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {bill.tenantName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {bill.roomNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                    {bill.utilityType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(bill.billingPeriodStart), 'MMM d')} - {format(new Date(bill.billingPeriodEnd), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    ${bill.allocatedAmount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(bill.billStatus)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {bill.dueDate && (
                      <span className={`${new Date(bill.dueDate) < new Date() && bill.billStatus !== 'paid' ? 'text-red-600 font-medium' : ''}`}>
                        {format(new Date(bill.dueDate), 'MMM d, yyyy')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button
                      onClick={() => {
                        setSelectedBill(bill);
                        setShowBillDetail(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredBills.length === 0 && (
          <div className="text-center py-8 text-gray-900">
            No tenant utility bills found matching your criteria.
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-900">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} bills
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bill Detail Modal */}
      {showBillDetail && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Utility Bill Details</h3>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Bill Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Tenant</label>
                  <div className="font-medium">{selectedBill.tenantName}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Room</label>
                  <div className="font-medium">{selectedBill.roomNumber}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Utility Type</label>
                  <div className="capitalize">{selectedBill.utilityType}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Status</label>
                  <div>{getStatusBadge(selectedBill.billStatus)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Billing Period</label>
                  <div>
                    {format(new Date(selectedBill.billingPeriodStart), 'MMM d')} - {format(new Date(selectedBill.billingPeriodEnd), 'MMM d, yyyy')}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Due Date</label>
                  <div>
                    {selectedBill.dueDate && format(new Date(selectedBill.dueDate), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-900">Cost Breakdown</label>
                <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                  {selectedBill.baseCharge > 0 && (
                    <div className="flex justify-between">
                      <span>Base Charge:</span>
                      <span className="font-medium">${selectedBill.baseCharge.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedBill.usageCharge > 0 && (
                    <div className="flex justify-between">
                      <span>Usage Charge:</span>
                      <span className="font-medium">${selectedBill.usageCharge.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedBill.commonAreaCharge > 0 && (
                    <div className="flex justify-between">
                      <span>Common Area Charge:</span>
                      <span className="font-medium">${selectedBill.commonAreaCharge.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Total Amount:</span>
                    <span>${selectedBill.allocatedAmount.toFixed(2)}</span>
                  </div>
                  <div className="text-sm text-gray-900">
                    Share: {selectedBill.tenantSharePercentage.toFixed(1)}% of total building cost
                  </div>
                </div>
              </div>

              {/* Status Actions */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-900">Update Status</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateBillStatus(selectedBill.id, 'sent')}
                    disabled={isUpdating || selectedBill.billStatus === 'sent'}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    Mark as Sent
                  </button>
                  <button
                    onClick={() => updateBillStatus(selectedBill.id, 'paid', new Date())}
                    disabled={isUpdating || selectedBill.billStatus === 'paid'}
                    className="px-3 py-1.5 text-sm bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    Mark as Paid
                  </button>
                  <button
                    onClick={() => updateBillStatus(selectedBill.id, 'overdue')}
                    disabled={isUpdating || selectedBill.billStatus === 'overdue'}
                    className="px-3 py-1.5 text-sm bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    Mark as Overdue
                  </button>
                </div>
              </div>

              {selectedBill.paidDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-900">Paid Date</label>
                  <div className="text-green-600 font-medium">
                    {format(new Date(selectedBill.paidDate), 'MMM d, yyyy')}
                  </div>
                </div>
              )}

              {selectedBill.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-900">Notes</label>
                  <div className="text-sm">{selectedBill.notes}</div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => setShowBillDetail(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 