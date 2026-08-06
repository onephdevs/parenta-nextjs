import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import { ListSummaryCard } from '@/components/ui/ListSummaryCard';
import {
  AlertCircle,
  DollarSign,
  Download,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  generateFinancialReport,
  getRevenueByCategory,
  getExpenseByCategory,
  getMonthlyTrends,
  getOutstandingBalances,
} from '@/lib/api/financial-reports';
import { formatReportCategoryLabel } from '@/lib/constants/bills-expenses';

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

  const today = new Date();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const startDate =
    resolvedSearchParams.startDate || currentMonthStart.toISOString().split('T')[0];
  const endDate =
    resolvedSearchParams.endDate || currentMonthEnd.toISOString().split('T')[0];

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
      getMonthlyTrends(6),
      getOutstandingBalances(),
    ]);
  } catch (error) {
    console.error('Error loading financial reports:', error);
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
      day: 'numeric',
    });
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const netProfit = financialReport.profitLoss.netProfit;

  return (
    <div className="space-y-6 p-6">
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
        <form method="GET" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Start Date" htmlFor="startDate">
            <Input
              type="date"
              name="startDate"
              id="startDate"
              defaultValue={startDate}
            />
          </FormField>

          <FormField label="End Date" htmlFor="endDate">
            <Input type="date" name="endDate" id="endDate" defaultValue={endDate} />
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

      <p className="text-sm text-gray-600">
        Report period: {formatDate(financialReport.period.start)} –{' '}
        {formatDate(financialReport.period.end)}
      </p>

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <ListSummaryCard
          title="Total Revenue"
          value={formatCurrency(financialReport.revenue.totalRevenue)}
          footer="confirmed collections"
          icon={<DollarSign className="h-8 w-8 text-green-600" />}
        />
        <ListSummaryCard
          title="Total Expenses"
          value={formatCurrency(financialReport.expenses.totalExpenses)}
          footer="operating expenses"
          icon={<TrendingDown className="h-8 w-8 text-red-600" />}
        />
        <ListSummaryCard
          title="Net Profit"
          value={formatCurrency(netProfit)}
          footer={`Margin: ${formatPercentage(financialReport.profitLoss.profitMargin)}`}
          icon={
            <TrendingUp
              className={`h-8 w-8 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}
            />
          }
        />
        <ListSummaryCard
          title="Outstanding"
          value={formatCurrency(financialReport.outstandingBalances.totalOutstanding)}
          footer={`Overdue: ${formatCurrency(financialReport.outstandingBalances.overdueOutstanding)}`}
          icon={<AlertCircle className="h-8 w-8 text-yellow-600" />}
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="border-b border-gray-100 px-6 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Revenue by Category</h3>
          </div>
          <div className="px-6 py-4">
            {revenueByCategory.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-600">
                No revenue data for this period
              </p>
            ) : (
              <div className="space-y-3">
                {revenueByCategory.map((item) => (
                  <div key={item.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {formatReportCategoryLabel(item.category)}
                      </span>
                      <span className="text-sm text-gray-500">({item.count})</span>
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

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="border-b border-gray-100 px-6 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Expenses by Category</h3>
          </div>
          <div className="px-6 py-4">
            {expenseByCategory.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-600">
                No expense data for this period
              </p>
            ) : (
              <div className="space-y-3">
                {expenseByCategory.map((item) => (
                  <div key={item.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {formatReportCategoryLabel(item.category)}
                      </span>
                      <span className="text-sm text-gray-500">({item.count})</span>
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

      <div className="mb-8 overflow-hidden rounded-lg bg-white shadow">
        <div className="border-b border-gray-100 px-6 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Monthly Financial Trends</h3>
        </div>
        {monthlyTrends.length === 0 ? (
          <div className="p-8 text-center text-gray-900">
            <p className="text-sm text-gray-600">No trend data available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Month
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Expenses
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Profit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {monthlyTrends.map((trend) => (
                  <tr key={trend.month} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {trend.month}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(trend.revenue)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(trend.expenses)}
                    </td>
                    <td
                      className={`whitespace-nowrap px-6 py-4 text-sm font-medium ${
                        trend.profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(trend.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="border-b border-gray-100 px-6 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Outstanding Balances by Tenant</h3>
        </div>
        {outstandingBalances.length === 0 ? (
          <div className="p-8 text-center text-gray-900">
            <p className="text-sm text-gray-600">No outstanding balances</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Total Outstanding
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Overdue Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Days Past Due
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {outstandingBalances.map((balance) => (
                  <tr key={balance.tenantId} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {balance.tenantName}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(balance.totalAmount)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-red-600">
                      {formatCurrency(balance.overdueAmount)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
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
  );
}
