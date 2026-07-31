import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import { ArrowLeft, Download } from 'lucide-react';
import { 
  generateFinancialReport, 
  getRevenueByCategory, 
  getExpenseByCategory,
  getMonthlyTrends,
  getOutstandingBalances
} from '@/lib/api/financial-reports';

interface SearchParams {
  startDate?: string;
  endDate?: string;
  period?: string;
}

interface ReportsPageProps {
  searchParams: Promise<SearchParams>;
}

export default async function FinancialReportsPage({ searchParams }: ReportsPageProps) {
  const resolvedSearchParams = await searchParams;
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'admin') {
    redirect('/auth/admin/signin');
  }

  // Default to current month if no dates provided
  const today = new Date();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const startDate = resolvedSearchParams.startDate || currentMonthStart.toISOString().split('T')[0];
  const endDate = resolvedSearchParams.endDate || currentMonthEnd.toISOString().split('T')[0];

  // Load all report data with error handling
  let financialReport, revenueByCategory, expenseByCategory, monthlyTrends, outstandingBalances;
  
  try {
    [
      financialReport,
      revenueByCategory,
      expenseByCategory,
      monthlyTrends,
      outstandingBalances,
    ] = await Promise.all([
      generateFinancialReport(startDate, endDate),
      getRevenueByCategory(startDate, endDate),
      getExpenseByCategory(startDate, endDate),
      getMonthlyTrends(6), // Last 6 months
      getOutstandingBalances(),
    ]);
  } catch (error) {
    console.error('Error loading financial reports:', error);
    // Return empty data if there's an error
    financialReport = {
      period: {
        start: new Date(startDate),
        end: new Date(endDate),
      },
      summary: {
        totalRevenue: 0,
        totalExpenses: 0,
        netIncome: 0,
        profitMargin: 0,
        totalPayments: 0,
        totalInvoices: 0,
        totalOutstanding: 0,
      },
      revenue: {
        totalRevenue: 0,
      },
      expenses: {
        totalExpenses: 0,
      },
      profitLoss: {
        netProfit: 0,
        profitMargin: 0,
      },
      outstandingBalances: {
        totalOutstanding: 0,
        overdueOutstanding: 0,
      },
      details: {
        revenue: [],
        expenses: [],
        payments: [],
        invoices: [],
      },
    };
    revenueByCategory = [];
    expenseByCategory = [];
    monthlyTrends = [];
    outstandingBalances = [];
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6 p-6">
      <Link
        href="/admin/financial"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Financial
      </Link>
      <PageHeader
        title="Financial Reports"
        description="Revenue, expenses, and outstanding balances"
        actions={
          <a
            href={`/api/reports/financial/export?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&format=xlsx`}
            download
          >
            <Button variant="outline" leftIcon={<Download className="h-4 w-4" />}>
              Export Report
            </Button>
          </a>
        }
      />

      <Card className="mb-6">
        <form method="GET" className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <FormField label="Start Date" htmlFor="startDate">
            <Input
              type="date"
              name="startDate"
              id="startDate"
              defaultValue={startDate}
            />
          </FormField>

          <FormField label="End Date" htmlFor="endDate">
            <Input
              type="date"
              name="endDate"
              id="endDate"
              defaultValue={endDate}
            />
          </FormField>

          <FormField label="Quick Period" htmlFor="period">
            <Select name="period" id="period" defaultValue="">
              <option value="">Custom Range</option>
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="this-quarter">This Quarter</option>
              <option value="this-year">This Year</option>
            </Select>
          </FormField>

          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Generate Report
            </Button>
          </div>
        </form>
      </Card>

        {/* Report Period */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4">
            <h2 className="text-lg font-medium text-gray-900">
              Financial Report: {formatDate(financialReport.period.start)} - {formatDate(financialReport.period.end)}
            </h2>
          </div>
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* Total Revenue */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-900 truncate">Total Revenue</dt>
                    <dd className="text-lg font-medium text-gray-900">{formatCurrency(financialReport.revenue.totalRevenue)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Total Expenses */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-900 truncate">Total Expenses</dt>
                    <dd className="text-lg font-medium text-gray-900">{formatCurrency(financialReport.expenses.totalExpenses)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Net Profit */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                    financialReport.profitLoss.netProfit >= 0 ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-900 truncate">Net Profit</dt>
                    <dd className="text-lg font-medium text-gray-900">{formatCurrency(financialReport.profitLoss.netProfit)}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-gray-900">Margin: {formatPercentage(financialReport.profitLoss.profitMargin)}</span>
              </div>
            </div>
          </div>

          {/* Outstanding Balance */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-900 truncate">Outstanding</dt>
                    <dd className="text-lg font-medium text-gray-900">{formatCurrency(financialReport.outstandingBalances.totalOutstanding)}</dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="text-gray-900">Overdue: {formatCurrency(financialReport.outstandingBalances.overdueOutstanding)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
          {/* Revenue Breakdown */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Revenue by Category</h3>
            </div>
            <div className="px-6 py-4">
              {revenueByCategory.length === 0 ? (
                <p className="text-gray-900 text-center py-4">No revenue data for this period</p>
              ) : (
                <div className="space-y-3">
                  {revenueByCategory.map((item) => (
                    <div key={item.category} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {item.category}
                        </span>
                        <span className="ml-2 text-sm text-gray-900">
                          ({item.count} transactions)
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Expenses by Category</h3>
            </div>
            <div className="px-6 py-4">
              {expenseByCategory.length === 0 ? (
                <p className="text-gray-900 text-center py-4">No expense data for this period</p>
              ) : (
                <div className="space-y-3">
                  {expenseByCategory.map((item) => (
                    <div key={item.category} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {item.category}
                        </span>
                        <span className="ml-2 text-sm text-gray-900">
                          ({item.count} expenses)
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Monthly Trends */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Monthly Financial Trends</h3>
          </div>
          <div className="px-6 py-4">
            {monthlyTrends.length === 0 ? (
              <p className="text-gray-900 text-center py-4">No trend data available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                        Month
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                        Revenue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                        Expenses
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                        Profit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {monthlyTrends.map((trend) => (
                      <tr key={trend.month}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {trend.month}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(trend.revenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(trend.expenses)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          trend.profit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(trend.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Outstanding Balances */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Outstanding Balances by Tenant</h3>
          </div>
          <div className="px-6 py-4">
            {outstandingBalances.length === 0 ? (
              <p className="text-gray-900 text-center py-4">No outstanding balances</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                        Tenant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                        Total Outstanding
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                        Overdue Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                        Days Past Due
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {outstandingBalances.map((balance) => (
                      <tr key={balance.tenantId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {balance.tenantName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(balance.totalAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                          {formatCurrency(balance.overdueAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {balance.daysPastDue > 0 ? `${balance.daysPastDue} days` : 'Current'}
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