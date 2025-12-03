'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useNotifications } from '@/context/NotificationContext';
import { 
  Plus, 
  Filter, 
  Search, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  Droplets,
  Calendar,
  DollarSign
} from 'lucide-react';

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
  const [bills, setBills] = useState<RoomUtilityBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [buildings, setBuildings] = useState<any[]>([]);
  
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
        
        // Apply search filter
        if (searchTerm) {
          billsToDisplay = billsToDisplay.filter((bill: RoomUtilityBill) =>
            (bill.roomNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (bill.buildingName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (bill.providerName || '').toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        // Apply room filter
        if (roomFilter) {
          billsToDisplay = billsToDisplay.filter((bill: RoomUtilityBill) =>
            bill.roomId === roomFilter
          );
        }

        setBills(billsToDisplay);
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bill?')) {
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Paid</span>;
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
      case 'overdue':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Overdue</span>;
      case 'disputed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Disputed</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const summary = {
    total: bills.length,
    totalAmount: bills.reduce((sum, bill) => sum + bill.amount, 0),
    pending: bills.filter(b => b.billStatus === 'pending').length,
    paid: bills.filter(b => b.billStatus === 'paid').length,
    overdue: bills.filter(b => b.billStatus === 'overdue').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin/bills-expenses"
                className="text-gray-900 hover:text-gray-900"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Room Utility Bills</h1>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                href="/admin/bills-expenses/utility-bills/new"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Bill
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="w-8 h-8 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-900 truncate">Total Amount</dt>
                    <dd className="text-lg font-medium text-gray-900">{formatCurrency(summary.totalAmount)}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-gray-900">{summary.total} bills</span>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertCircle className="w-8 h-8 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-900 truncate">Pending</dt>
                    <dd className="text-lg font-medium text-gray-900">{summary.pending}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-gray-900">bills pending payment</span>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-900 truncate">Paid</dt>
                    <dd className="text-lg font-medium text-gray-900">{summary.paid}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-gray-900">bills paid</span>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-900 truncate">Overdue</dt>
                    <dd className="text-lg font-medium text-gray-900">{summary.overdue}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-gray-900">bills overdue</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-900 mb-1">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    id="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Room, building, provider..."
                    className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-base text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="building" className="block text-sm font-medium text-gray-900 mb-1">
                  Building
                </label>
                <select
                  id="building"
                  value={buildingFilter}
                  onChange={(e) => setBuildingFilter(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-base text-gray-900"
                >
                  <option value="">All Buildings</option>
                  {buildings && Array.isArray(buildings) && buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name || building.building_name || building.buildingName || 'Unknown'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="utilityType" className="block text-sm font-medium text-gray-900 mb-1">
                  Utility Type
                </label>
                <select
                  id="utilityType"
                  value={utilityTypeFilter}
                  onChange={(e) => setUtilityTypeFilter(e.target.value as 'electricity' | 'water' | '')}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-base text-gray-900"
                >
                  <option value="">All Types</option>
                  <option value="electricity">⚡ Electricity</option>
                  <option value="water">💧 Water</option>
                </select>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-900 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-base text-gray-900"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="disputed">Disputed</option>
                </select>
              </div>

              <div>
                <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-900 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  id="dateFrom"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-base text-gray-900"
                />
              </div>

              <div>
                <label htmlFor="dateTo" className="block text-sm font-medium text-gray-900 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  id="dateTo"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 text-base text-gray-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bills Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-900">Loading...</div>
          ) : bills.length === 0 ? (
            <div className="p-8 text-center text-gray-900">
              <p className="text-lg font-medium mb-2">No room utility bills found</p>
              <p className="text-sm text-gray-900 mb-4">Get started by adding a new bill</p>
              <Link
                href="/admin/bills-expenses/utility-bills/new"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Bill
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Room</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Utility</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Provider</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Billing Period</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-900 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{bill.buildingName}</div>
                        <div className="text-sm text-gray-900">Room {bill.roomNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {bill.utilityType === 'electricity' ? (
                            <Zap className="h-4 w-4 text-yellow-500 mr-2" />
                          ) : (
                            <Droplets className="h-4 w-4 text-blue-500 mr-2" />
                          )}
                          <span className="text-sm text-gray-900 capitalize">{bill.utilityType}</span>
                        </div>
                        {bill.usageAmount && (
                          <div className="text-xs text-gray-900">
                            {bill.usageAmount} {bill.usageUnit}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{bill.providerName}</div>
                        {bill.providerAccountNumber && (
                          <div className="text-xs text-gray-900">{bill.providerAccountNumber}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(bill.billingPeriodStart)}</div>
                        <div className="text-xs text-gray-900">to {formatDate(bill.billingPeriodEnd)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(bill.dueDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{formatCurrency(bill.amount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(bill.billStatus)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {bill.billStatus !== 'paid' && (
                            <button
                              onClick={() => handleMarkPaid(bill.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Mark as Paid"
                            >
                              <CheckCircle2 className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(bill.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
