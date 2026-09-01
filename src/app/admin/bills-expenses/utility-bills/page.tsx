'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useNotifications } from '@/hooks/useNotifications';
import { useAppDialog } from '@/hooks/useAppDialog';
import { FormField } from '@/components/forms/FormField';
import {
  Button,
  EmptyState,
  FilterBar,
  Input,
  ListSummaryCard,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Spinner,
  TableCard,
  WorkItemRow,
} from '@/components/ui';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';
import { formatShortDate } from '@/lib/utils';
import type { WorkItemTone } from '@/components/ui/WorkItemRow';

const PAGE_SIZE = 20;

interface RoomUtilityBill {
  id: string;
  roomId: string;
  roomNumber: string;
  buildingName: string;
  utilityType: 'electricity' | 'water';
  amount: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string;
  providerName: string;
  providerAccountNumber?: string;
  usageAmount?: number;
  usageUnit?: string;
  billStatus: 'pending' | 'paid' | 'overdue' | 'disputed';
  billUrl?: string;
  notes?: string;
}

export default function RoomUtilityBillsPage() {
  const { showNotification } = useNotifications();
  const { confirm, dialog } = useAppDialog();
  const [bills, setBills] = useState<RoomUtilityBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filters
  const [roomFilter, setRoomFilter] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [utilityTypeFilter, setUtilityTypeFilter] = useState<'electricity' | 'water' | ''>('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBuildings();
    fetchBills();
  }, []);

  const fetchBuildings = async () => {
    try {
      const response = await fetch('/api/buildings');
      if (response.ok) {
        const data = await response.json();
        let buildingsList: any[] = [];
        
        if (data.success && data.data) {
          // Handle { success: true, data: { buildings: [...] } } format
          if (data.data.buildings && Array.isArray(data.data.buildings)) {
            buildingsList = data.data.buildings;
          } else if (Array.isArray(data.data)) {
            buildingsList = data.data;
          }
        } else if (Array.isArray(data)) {
          buildingsList = data;
        } else if (data.buildings) {
          buildingsList = data.buildings;
        }
        
        setBuildings(buildingsList);
      } else {
        // Ensure buildings is always an array even on error
        setBuildings([]);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
      // Ensure buildings is always an array even on error
      setBuildings([]);
    }
  };

  const fetchBills = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '500');
      params.set('page', '1');
      if (buildingFilter) params.append('buildingId', buildingFilter);
      if (utilityTypeFilter) params.append('utilityType', utilityTypeFilter);
      if (statusFilter) params.append('billStatus', statusFilter);
      if (dateFromFilter) params.append('dateFrom', dateFromFilter);
      if (dateToFilter) params.append('dateTo', dateToFilter);

      const response = await fetch(`/api/utility-bills/room?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        let billsToDisplay: RoomUtilityBill[] = [];
        
        if (data.success && data.data) {
          billsToDisplay = data.data.bills || [];
        } else if (data.bills) {
          // Handle direct response format
          billsToDisplay = data.bills;
        }
        
        // Apply room filter
        if (roomFilter) {
          billsToDisplay = billsToDisplay.filter((bill: RoomUtilityBill) =>
            bill.roomId === roomFilter
          );
        }

        setBills(billsToDisplay);
        setCurrentPage(1);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch bills:', errorData);
        try {
          showNotification({
            type: 'error',
            title: 'Error',
            message: errorData.error || 'Failed to fetch room utility bills',
          });
        } catch (e) {
          console.error('Notification error:', e);
        }
      }
    } catch (error) {
      console.error('Error fetching bills:', error);
      try {
        showNotification({
          type: 'error',
          title: 'Error',
          message: error instanceof Error ? error.message : 'Failed to fetch room utility bills',
        });
      } catch (e) {
        console.error('Notification error:', e);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [buildingFilter, utilityTypeFilter, statusFilter, dateFromFilter, dateToFilter, roomFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredBills = useMemo(() => {
    if (!searchTerm.trim()) return bills;
    const term = searchTerm.toLowerCase();
    return bills.filter(
      (bill) =>
        (bill.roomNumber || '').toLowerCase().includes(term) ||
        (bill.buildingName || '').toLowerCase().includes(term) ||
        (bill.providerName || '').toLowerCase().includes(term)
    );
  }, [bills, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredBills.length / PAGE_SIZE));
  const pageBills = filteredBills.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleDelete = async (id: string) => {
    if (
      !(await confirm({
        title: 'Delete bill?',
        message: 'Are you sure you want to delete this bill?',
        confirmText: 'Delete',
        variant: 'danger',
      }))
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/utility-bills/room?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showNotification({
          type: 'success',
          title: 'Success',
          message: 'Bill deleted successfully',
        });
        fetchBills();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete bill');
      }
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to delete bill',
      });
    }
  };

  const handleMarkPaid = async (id: string) => {
    if (
      !(await confirm({
        title: 'Mark bill as paid?',
        message: 'This marks the utility bill paid. It does not record a tenant payment.',
        confirmText: 'Mark as Paid',
        variant: 'warning',
      }))
    ) {
      return;
    }

    try {
      const response = await fetch('/api/utility-bills/room', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          billStatus: 'paid',
        }),
      });

      if (response.ok) {
        showNotification({
          type: 'success',
          title: 'Success',
          message: 'Bill marked as paid',
        });
        fetchBills();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update bill');
      }
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to update bill',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const billStatusTone = (status: string): WorkItemTone => {
    if (status === 'paid') return 'success';
    if (status === 'overdue') return 'danger';
    if (status === 'disputed') return 'purple';
    if (status === 'sent') return 'info';
    return 'warning';
  };

  const billStatusLabel = (status: string) => {
    if (status === 'disputed') return 'Disputed';
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const summary = {
    total: filteredBills.length,
    totalAmount: filteredBills.reduce((sum, bill) => sum + bill.amount, 0),
    pending: filteredBills.filter((b) => b.billStatus === 'pending').length,
    paid: filteredBills.filter((b) => b.billStatus === 'paid').length,
    overdue: filteredBills.filter((b) => b.billStatus === 'overdue').length,
  };

  return (
    <div className="space-y-6 p-6">
      {dialog}
      <PageHeader
        title="Room Utility Bills"
        description="Track electricity and water bills by room"
        actions={
          <Link href="/admin/bills-expenses/utility-bills/new">
            <Button leftIcon={<Plus className="h-4 w-4" />}>Add Bill</Button>
          </Link>
        }
      />

        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <ListSummaryCard
            title="Total Amount"
            value={formatCurrency(summary.totalAmount)}
            footer={`${summary.total} bills`}
            icon={<DollarSign className="h-8 w-8 text-blue-600" />}
          />
          <ListSummaryCard
            title="Pending"
            value={summary.pending}
            footer="bills pending payment"
            icon={<AlertCircle className="h-8 w-8 text-yellow-600" />}
          />
          <ListSummaryCard
            title="Paid"
            value={summary.paid}
            footer="bills paid"
            icon={<CheckCircle2 className="h-8 w-8 text-green-600" />}
          />
          <ListSummaryCard
            title="Overdue"
            value={summary.overdue}
            footer="bills overdue"
            icon={<AlertCircle className="h-8 w-8 text-red-600" />}
          />
        </div>

        <FilterBar
        columns={5}
        collapsible
        activeCount={
          [buildingFilter, utilityTypeFilter, statusFilter, dateFromFilter, dateToFilter].filter(
            Boolean
          ).length
        }
        search={
          <SearchInput
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Room, building, provider..."
            aria-label="Search utility bills"
          />
        }
        footer={
          <p className="text-sm text-gray-600">
            Showing {filteredBills.length} of {bills.length} bills
          </p>
        }
      >
          <FormField label="Building" htmlFor="building">
            <Select
              id="building"
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
            >
              <option value="">All Buildings</option>
              {buildings && Array.isArray(buildings) && buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name || building.building_name || building.buildingName || 'Unknown'}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Utility Type" htmlFor="utilityType">
            <Select
              id="utilityType"
              value={utilityTypeFilter}
              onChange={(e) => setUtilityTypeFilter(e.target.value as 'electricity' | 'water' | '')}
            >
              <option value="">All Types</option>
              <option value="electricity">Electricity</option>
              <option value="water">Water</option>
            </Select>
          </FormField>

          <FormField label="Status" htmlFor="status">
            <Select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="disputed">Disputed</option>
            </Select>
          </FormField>

          <FormField label="From Date" htmlFor="dateFrom">
            <Input
              type="date"
              id="dateFrom"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
            />
          </FormField>

          <FormField label="To Date" htmlFor="dateTo">
            <Input
              type="date"
              id="dateTo"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
            />
          </FormField>
        </FilterBar>

        {/* Bills Table */}
        <TableCard title="Room utility bills" description="Track electricity and water bills by room.">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Spinner label="Loading bills" />
            </div>
          ) : filteredBills.length === 0 ? (
            <EmptyState
              title="No room utility bills found"
              description="Get started by adding a new bill"
              action={
                <Link href="/admin/bills-expenses/utility-bills/new">
                  <Button leftIcon={<Plus className="h-4 w-4" />}>Add Bill</Button>
                </Link>
              }
            />
          ) : (
            <>
            {pageBills.map((bill) => {
              const statusTone = billStatusTone(bill.billStatus);
              return (
                <WorkItemRow
                  key={bill.id}
                  href={`/admin/bills-expenses/utility-bills/${bill.id}`}
                  title={bill.buildingName || 'Utility bill'}
                  subtitle={bill.roomNumber ? `Room ${bill.roomNumber}` : bill.providerName}
                  badges={[
                    {
                      key: 'utility',
                      label: bill.utilityType,
                      tone: bill.utilityType === 'electricity' ? 'warning' : 'info',
                    },
                    {
                      key: 'status',
                      label: billStatusLabel(bill.billStatus),
                      tone: statusTone,
                    },
                  ]}
                  date={formatShortDate(bill.dueDate)}
                  metaLabel={billStatusLabel(bill.billStatus)}
                  metaDetail={formatCurrency(bill.amount)}
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
                  trailingIcon={
                    statusTone === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : statusTone === 'danger' ? (
                      <AlertTriangle className="h-4 w-4 text-rose-500" />
                    ) : null
                  }
                  actions={
                    <>
                      {bill.billStatus !== 'paid' ? (
                        <button
                          onClick={() => handleMarkPaid(bill.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Mark as Paid"
                          type="button"
                        >
                          <CheckCircle2 className="h-5 w-5" />
                        </button>
                      ) : null}
                      <button
                        onClick={() => handleDelete(bill.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                        type="button"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </>
                  }
                />
              );
            })}
            <Pagination
              currentPage={Math.min(currentPage, totalPages)}
              totalPages={totalPages}
              totalItems={filteredBills.length}
              itemsPerPage={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
            </>
          )}
        </TableCard>
    </div>
  );
}
