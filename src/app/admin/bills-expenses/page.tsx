'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useNotifications } from '@/context/NotificationContext';
import { 
  Plus, 
  FileText, 
  Zap, 
  Droplets,
  DollarSign,
  TrendingUp,
  Calendar,
  ArrowRight,
  Receipt
} from 'lucide-react';

interface Summary {
  totalBills: number;
  totalBillsAmount: number;
  pendingBills: number;
  totalExpenses: number;
  totalExpensesAmount: number;
  monthlyExpenses: number;
}

interface RecentBill {
  id: string;
  roomNumber: string;
  buildingName: string;
  utilityType: 'electricity' | 'water';
  amount: number;
  dueDate: string;
  billStatus: string;
}

interface RecentExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  expenseDate: string;
  buildingName?: string;
}

export default function BillsExpensesPage() {
  const { showNotification } = useNotifications();
  const [summary, setSummary] = useState<Summary>({
    totalBills: 0,
    totalBillsAmount: 0,
    pendingBills: 0,
    totalExpenses: 0,
    totalExpensesAmount: 0,
    monthlyExpenses: 0,
  });
  const [recentBills, setRecentBills] = useState<RecentBill[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<RecentExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch room utility bills
      const billsResponse = await fetch('/api/utility-bills/room?limit=5');
      let billsData = { bills: [], total: 0 };
      if (billsResponse.ok) {
        const billsResult = await billsResponse.json();
        if (billsResult.success) {
          billsData = billsResult.data;
        }
      }

      // Fetch expenses
      const expensesResponse = await fetch('/api/expenses?limit=5');
      let expensesData = { expenses: [], total: 0 };
      if (expensesResponse.ok) {
        const expensesResult = await expensesResponse.json();
        if (expensesResult.success) {
          expensesData = expensesResult.data;
        }
      }

      // Calculate summary
      const totalBills = billsData.total || 0;
      const totalBillsAmount = (billsData.bills || []).reduce((sum: number, bill: any) => sum + (bill.amount || 0), 0);
      const pendingBills = (billsData.bills || []).filter((b: any) => b.billStatus === 'pending').length;

      const totalExpenses = expensesData.total || 0;
      const totalExpensesAmount = (expensesData.expenses || []).reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
      
      // Calculate monthly expenses
      const currentMonth = new Date();
      currentMonth.setDate(1);
      const monthlyExpenses = (expensesData.expenses || []).filter((exp: any) => {
        const expDate = new Date(exp.expenseDate);
        return expDate >= currentMonth;
      }).reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);

      setSummary({
        totalBills,
        totalBillsAmount,
        pendingBills,
        totalExpenses,
        totalExpensesAmount,
        monthlyExpenses,
      });

      setRecentBills((billsData.bills || []).slice(0, 5).map((bill: any) => ({
        id: bill.id,
        roomNumber: bill.roomNumber,
        buildingName: bill.buildingName,
        utilityType: bill.utilityType,
        amount: bill.amount,
        dueDate: bill.dueDate,
        billStatus: bill.billStatus,
      })));

      setRecentExpenses((expensesData.expenses || []).slice(0, 5).map((exp: any) => ({
        id: exp.id,
        description: exp.description,
        amount: exp.amount,
        category: exp.category,
        expenseDate: exp.expenseDate,
        buildingName: exp.buildingName,
      })));

    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load bills and expenses data',
      });
    } finally {
      setIsLoading(false);
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

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      cleaning: 'bg-blue-100 text-blue-800',
      maintenance: 'bg-red-100 text-red-800',
      repair: 'bg-orange-100 text-orange-800',
      upgrade: 'bg-purple-100 text-purple-800',
      garbage_collection: 'bg-green-100 text-green-800',
      utilities: 'bg-yellow-100 text-yellow-800',
      supplies: 'bg-indigo-100 text-indigo-800',
      services: 'bg-pink-100 text-pink-800',
      insurance: 'bg-gray-100 text-gray-800',
      taxes: 'bg-gray-100 text-gray-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Paid</span>;
      case 'pending':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
      case 'overdue':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Overdue</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-900">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bills & Expenses</h1>
              <p className="text-sm text-gray-900 mt-1">Manage utility bills and expenses</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* Total Bills */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Receipt className="w-8 h-8 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-900 truncate">Total Bills</dt>
                    <dd className="text-lg font-medium text-gray-900">{formatCurrency(summary.totalBillsAmount)}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-gray-900">{summary.totalBills} bills</span>
              </div>
            </div>
          </div>

          {/* Pending Bills */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="w-8 h-8 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-900 truncate">Pending Bills</dt>
                    <dd className="text-lg font-medium text-gray-900">{summary.pendingBills}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-gray-900">awaiting payment</span>
              </div>
            </div>
          </div>

          {/* Total Expenses */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-900 truncate">Total Expenses</dt>
                    <dd className="text-lg font-medium text-gray-900">{formatCurrency(summary.totalExpensesAmount)}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-gray-900">{summary.totalExpenses} expenses</span>
              </div>
            </div>
          </div>

          {/* Monthly Expenses */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-900 truncate">This Month</dt>
                    <dd className="text-lg font-medium text-gray-900">{formatCurrency(summary.monthlyExpenses)}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-gray-900">expenses this month</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/bills-expenses/utility-bills/new"
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition group"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Zap className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h4 className="font-semibold text-gray-900">Add Utility Bill</h4>
                  <p className="text-sm text-gray-900">Record electric or water bill</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition" />
              </div>
            </Link>

            <Link
              href="/admin/financial/expenses/new"
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition group"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h4 className="font-semibold text-gray-900">Record Expense</h4>
                  <p className="text-sm text-gray-900">Add misc expense</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition" />
              </div>
            </Link>

            <Link
              href="/admin/bills-expenses/reports"
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition group"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h4 className="font-semibold text-gray-900">View Reports</h4>
                  <p className="text-sm text-gray-900">Expense reports & analytics</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition" />
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Utility Bills */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Recent Utility Bills</h3>
                <Link
                  href="/admin/bills-expenses/utility-bills"
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  View All
                </Link>
              </div>
            </div>
            <div className="p-6">
              {recentBills.length === 0 ? (
                <div className="text-center py-8 text-gray-900">
                  <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No utility bills found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentBills.map((bill) => (
                    <div key={bill.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition">
                      <div className="flex items-center space-x-4">
                        {bill.utilityType === 'electricity' ? (
                          <Zap className="h-5 w-5 text-yellow-500" />
                        ) : (
                          <Droplets className="h-5 w-5 text-blue-500" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {bill.buildingName} - Room {bill.roomNumber}
                          </div>
                          <div className="text-xs text-gray-900">
                            {bill.utilityType} • Due {formatDate(bill.dueDate)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">{formatCurrency(bill.amount)}</div>
                        {getStatusBadge(bill.billStatus)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Expenses */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Recent Expenses</h3>
                <Link
                  href="/admin/financial/expenses"
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  View All
                </Link>
              </div>
            </div>
            <div className="p-6">
              {recentExpenses.length === 0 ? (
                <div className="text-center py-8 text-gray-900">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No expenses found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentExpenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{expense.description}</div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryBadge(expense.category)}`}>
                            {expense.category.replace('_', ' ')}
                          </span>
                          {expense.buildingName && (
                            <span className="text-xs text-gray-900">{expense.buildingName}</span>
                          )}
                          <span className="text-xs text-gray-900">{formatDate(expense.expenseDate)}</span>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-gray-900 ml-4">
                        {formatCurrency(expense.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
