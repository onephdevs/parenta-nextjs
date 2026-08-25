'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  Mail,
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { format } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { FormField } from '@/components/forms/FormField';
import { formatPaymentNotesForPeople } from '@/lib/format-payment-notes';
import { formatShortDate } from '@/lib/utils';
import { WorkItemRow } from '@/components/ui/WorkItemRow';
import type { WorkItemTone } from '@/components/ui/WorkItemRow';

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
    tenantId,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showBillDetail, setShowBillDetail] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { showNotification } = useNotifications();

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
        offset: ((currentPage - 1) * itemsPerPage).toString(),
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
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load tenant utility bills',
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
          paidDate: paidDate?.toISOString(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchTenantBills();
        showNotification({
          type: 'success',
          title: 'Status Updated',
          message: `Bill status updated to ${status}`,
        });
        setShowBillDetail(false);
      } else {
        throw new Error(data.error || 'Failed to update bill status');
      }
    } catch (error) {
      console.error('Error updating bill status:', error);
      showNotification({
        type: 'error',
        title: 'Update Error',
        message: 'Failed to update bill status',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
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
      <Card>
        <div className="space-y-4">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Tenant Utility Bills
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              leftIcon={<Filter className="h-4 w-4" />}
            >
              Filters
            </Button>
          </div>
        </CardHeader>

        {showFilters && (
          <div className="mb-6 mx-6 p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField label="Search" htmlFor="bill-search">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                  <Input
                    id="bill-search"
                    type="text"
                    placeholder="Search tenant, room, utility..."
                    value={filters.search || ''}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </FormField>

              <FormField label="Utility Type" htmlFor="bill-utility-type">
                <Select
                  id="bill-utility-type"
                  value={filters.utilityType || 'all'}
                  onChange={(e) => setFilters({
                    ...filters,
                    utilityType: e.target.value === 'all' ? undefined : e.target.value,
                  })}
                >
                  <option value="all">All Types</option>
                  <option value="electricity">Electricity</option>
                  <option value="water">Water</option>
                  <option value="gas">Gas</option>
                  <option value="internet">Internet</option>
                  <option value="cable">Cable TV</option>
                  <option value="waste">Waste</option>
                  <option value="other">Other</option>
                </Select>
              </FormField>

              <FormField label="Status" htmlFor="bill-status">
                <Select
                  id="bill-status"
                  value={filters.billStatus || 'all'}
                  onChange={(e) => setFilters({
                    ...filters,
                    billStatus: e.target.value === 'all' ? undefined : e.target.value,
                  })}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </Select>
              </FormField>

              <FormField label="Period Start" htmlFor="bill-period-start">
                <Input
                  id="bill-period-start"
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  min="2000-01-01"
                  max="2099-12-31"
                  style={{ colorScheme: 'light' }}
                />
              </FormField>
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({ buildingId, tenantId })}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}

        <CardBody>
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

          <div className="-mx-6">
            {filteredBills.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-gray-500">
                No tenant utility bills found matching your criteria.
              </p>
            ) : (
              filteredBills.map((bill) => {
                const status = String(bill.billStatus || 'pending');
                const statusTone: WorkItemTone =
                  status === 'paid'
                    ? 'success'
                    : status === 'overdue'
                      ? 'danger'
                      : status === 'sent'
                        ? 'info'
                        : 'warning';
                return (
                  <WorkItemRow
                    key={bill.id}
                    onClick={() => {
                      setSelectedBill(bill);
                      setShowBillDetail(true);
                    }}
                    title={bill.tenantName || 'Tenant bill'}
                    subtitle={bill.roomNumber ? `Room ${bill.roomNumber}` : bill.utilityType}
                    badges={[
                      {
                        key: 'utility',
                        label: String(bill.utilityType || 'Utility'),
                        tone: String(bill.utilityType).toLowerCase() === 'electricity' ? 'warning' : 'info',
                      },
                      {
                        key: 'status',
                        label: status.replace(/_/g, ' '),
                        tone: statusTone,
                      },
                    ]}
                    date={bill.dueDate ? formatShortDate(bill.dueDate) : null}
                    metaLabel={status.replace(/_/g, ' ')}
                    metaDetail={`$${Number(bill.allocatedAmount || 0).toFixed(2)}`}
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
                  />
                );
              })
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-900">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} bills
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  isDisabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  isDisabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {showBillDetail && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" padding="none">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Utility Bill Details</h3>
            </div>

            <div className="p-6 space-y-6">
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

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-900">Update Status</label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateBillStatus(selectedBill.id, 'sent')}
                    isDisabled={isUpdating || selectedBill.billStatus === 'sent'}
                  >
                    Mark as Sent
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => updateBillStatus(selectedBill.id, 'paid', new Date())}
                    isDisabled={isUpdating || selectedBill.billStatus === 'paid'}
                  >
                    Mark as Paid
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => updateBillStatus(selectedBill.id, 'overdue')}
                    isDisabled={isUpdating || selectedBill.billStatus === 'overdue'}
                  >
                    Mark as Overdue
                  </Button>
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
                  <div className="text-sm">
                    {formatPaymentNotesForPeople(selectedBill.notes)}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Button variant="secondary" onClick={() => setShowBillDetail(false)}>
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
