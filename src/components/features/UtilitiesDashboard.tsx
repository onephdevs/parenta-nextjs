'use client';

import { useState, useEffect } from 'react';
import { UtilityBill } from '../../types/database';
import { useNotifications } from '../../hooks/useNotifications';
import { useAppDialog } from '@/hooks/useAppDialog';
import UtilityBillForm from './UtilityBillForm';
import UtilityBillsList from './UtilityBillsList';
import UtilityStatsCards from './UtilityStatsCards';
import UtilityTrendsChart from './UtilityTrendsChart';

interface UtilityStats {
  total_bills: number;
  pending_bills: number;
  paid_bills: number;
  overdue_bills: number;
  disputed_bills: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  overdue_amount: number;
  average_bill_amount: number;
  buildings_count: number;
  utility_types_count: number;
  providers_count: number;
}

interface UtilityTrend {
  utility_type: string;
  month: string;
  bill_count: number;
  total_amount: number;
  average_amount: number;
  total_usage: number;
  average_usage: number;
}

interface Provider {
  provider_name: string;
  utility_type: string;
  bill_count: number;
  total_amount: number;
  average_bill: number;
  buildings_served: number;
  first_bill_date: string;
  last_bill_date: string;
  overdue_bills: number;
}

interface Filters {
  buildingId?: string;
  utilityType?: string;
  billStatus?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export default function UtilitiesDashboard() {
  const [bills, setBills] = useState<UtilityBill[]>([]);
  const [stats, setStats] = useState<UtilityStats | null>(null);
  const [trends, setTrends] = useState<UtilityTrend[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [upcomingBills, setUpcomingBills] = useState<UtilityBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState<UtilityBill | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalBills, setTotalBills] = useState(0);

  const { addNotification } = useNotifications();
  const { confirm, dialog } = useAppDialog();
  const ITEMS_PER_PAGE = 10;

  const fetchUtilityData = async () => {
    try {
      setLoading(true);
      
      // Fetch utility bills with filters and pagination
      const billsParams = new URLSearchParams({
        ...filters,
        limit: ITEMS_PER_PAGE.toString(),
        offset: ((currentPage - 1) * ITEMS_PER_PAGE).toString(),
      });
      
      const [billsResponse, statsResponse] = await Promise.all([
        fetch(`/api/utilities?${billsParams}`),
        fetch('/api/utilities/stats')
      ]);

      if (!billsResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to fetch utility data');
      }

      const billsData = await billsResponse.json();
      const statsData = await statsResponse.json();

      setBills(billsData.bills);
      setTotalBills(billsData.total);
      setStats(statsData.overview);
      setTrends(statsData.trends);
      setProviders(statsData.providers);
      setUpcomingBills(statsData.upcomingBills);
    } catch (error) {
      console.error('Error fetching utility data:', error);
      addNotification('Failed to fetch utility data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUtilityData();
  }, [filters, currentPage]);

  const handleCreateBill = () => {
    setEditingBill(null);
    setShowForm(true);
  };

  const handleEditBill = (bill: UtilityBill) => {
    setEditingBill(bill);
    setShowForm(true);
  };

  const handleDeleteBill = async (billId: string) => {
    if (
      !(await confirm({
        title: 'Delete utility bill?',
        message: 'Are you sure you want to delete this utility bill?',
        confirmText: 'Delete',
        variant: 'danger',
      }))
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/utilities/${billId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete utility bill');
      }

      addNotification('Utility bill deleted successfully', 'success');
      fetchUtilityData();
    } catch (error) {
      console.error('Error deleting utility bill:', error);
      addNotification('Failed to delete utility bill', 'error');
    }
  };

  const handleUpdateStatus = async (billId: string, status: string) => {
    try {
      const response = await fetch(`/api/utilities/${billId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update bill status');
      }

      addNotification(`Bill status updated to ${status}`, 'success');
      fetchUtilityData();
    } catch (error) {
      console.error('Error updating bill status:', error);
      addNotification('Failed to update bill status', 'error');
    }
  };

  const handleFormSubmit = async (billData: unknown) => {
    try {
      const url = editingBill ? `/api/utilities/${editingBill.id}` : '/api/utilities';
      const method = editingBill ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(billData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save utility bill');
      }

      const action = editingBill ? 'updated' : 'created';
      addNotification(`Utility bill ${action} successfully`, 'success');
      setShowForm(false);
      fetchUtilityData();
    } catch (error) {
      console.error('Error saving utility bill:', error);
      addNotification(error instanceof Error ? error.message : 'Failed to save utility bill', 'error');
    }
  };

  const handleFilterChange = (newFilters: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalBills / ITEMS_PER_PAGE);

  if (loading && bills.length === 0) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow border">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg shadow border p-6">
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {dialog}
      {/* Statistics Cards */}
      {stats && <UtilityStatsCards stats={stats} />}

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Utility Bills Management</h2>
        <div className="flex space-x-3">
          <a
            href="/admin/utilities/readings"
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            📊 Meter Readings
          </a>
          <a
            href="/admin/utilities/cost-allocation"
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            💰 Cost Allocation
          </a>
          <button
            onClick={handleCreateBill}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add New Bill
          </button>
        </div>
      </div>

      {/* Upcoming Bills Alert */}
      {upcomingBills.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="text-amber-800 font-medium mb-2">
            📅 {upcomingBills.length} bills due in the next 7 days
          </h3>
          <div className="space-y-2">
            {upcomingBills.slice(0, 3).map((bill) => (
              <div key={bill.id} className="text-sm text-amber-700">
                <span className="font-medium">{bill.providerName}</span> - {bill.utilityType} 
                <span className="ml-2">${bill.amount.toFixed(2)}</span>
                <span className="ml-2 text-xs">Due: {new Date(bill.dueDate).toLocaleDateString()}</span>
              </div>
            ))}
            {upcomingBills.length > 3 && (
              <div className="text-sm text-amber-600">
                and {upcomingBills.length - 3} more...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trends Chart */}
      {trends.length > 0 && <UtilityTrendsChart trends={trends} />}

      {/* Bills List with Filters */}
      <UtilityBillsList
        bills={bills}
        loading={loading}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
        onEditBill={handleEditBill}
        onDeleteBill={handleDeleteBill}
        onUpdateStatus={handleUpdateStatus}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Provider Summary */}
      {providers.length > 0 && (
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Provider Summary</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Utility Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Total Bills
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Average Bill
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Buildings Served
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Overdue Bills
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {providers.slice(0, 10).map((provider, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {provider.provider_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {provider.utility_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {provider.bill_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${provider.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${provider.average_bill.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {provider.buildings_served}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {provider.overdue_bills > 0 && (
                        <span className="text-red-600 font-medium">
                          {provider.overdue_bills}
                        </span>
                      )}
                      {provider.overdue_bills === 0 && (
                        <span className="text-green-600">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <UtilityBillForm
          bill={editingBill}
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
} 