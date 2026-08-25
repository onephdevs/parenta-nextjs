import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { FilterBar } from '@/components/ui/FilterBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import { ListSummaryCard } from '@/components/ui/ListSummaryCard';
import { TableCard, WorkItemRow } from '@/components/ui';
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
    redirect('/auth/signin');
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

      <form method="GET">
        <FilterBar
          columns={3}
          collapsible
          activeCount={
            [
              resolvedSearchParams.startDate,
              resolvedSearchParams.endDate,
              resolvedSearchParams.period,
            ].filter(Boolean).length
          }
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-600">
                Report period: {formatDate(financialReport.period.start)} –{' '}
                {formatDate(financialReport.period.end)}
              </p>
              <Button type="submit">Generate Report</Button>
            </div>
          }
        >
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
        </FilterBar>
      </form>

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
        <TableCard title="Revenue by Category">
          {revenueByCategory.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-600">
              No revenue data for this period
            </p>
          ) : (
            revenueByCategory.map((item) => (
              <WorkItemRow
                key={item.category}
                title={formatReportCategoryLabel(item.category)}
                subtitle={`${item.count} ${item.count === 1 ? 'item' : 'items'}`}
                badges={[{ key: 'type', label: 'Revenue', tone: 'success' }]}
                metaLabel={formatCurrency(item.amount)}
                metaTone="muted"
                dotTone="success"
              />
            ))
          )}
        </TableCard>

        <TableCard title="Expenses by Category">
          {expenseByCategory.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-600">
              No expense data for this period
            </p>
          ) : (
            expenseByCategory.map((item) => (
              <WorkItemRow
                key={item.category}
                title={formatReportCategoryLabel(item.category)}
                subtitle={`${item.count} ${item.count === 1 ? 'item' : 'items'}`}
                badges={[{ key: 'type', label: 'Expense', tone: 'danger' }]}
                metaLabel={formatCurrency(item.amount)}
                metaTone="danger"
                dotTone="danger"
              />
            ))
          )}
        </TableCard>
      </div>

      <TableCard title="Monthly Financial Trends" className="mb-8">
        {monthlyTrends.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-600">No trend data available</p>
        ) : (
          monthlyTrends.map((trend) => (
            <WorkItemRow
              key={trend.month}
              title={trend.month}
              subtitle={`Expenses ${formatCurrency(trend.expenses)}`}
              badges={[
                {
                  key: 'result',
                  label: trend.profit >= 0 ? 'Profit' : 'Loss',
                  tone: trend.profit >= 0 ? 'success' : 'danger',
                },
              ]}
              metaLabel={formatCurrency(trend.profit)}
              metaDetail={`Rev ${formatCurrency(trend.revenue)}`}
              metaTone={trend.profit >= 0 ? 'muted' : 'danger'}
              dotTone={trend.profit >= 0 ? 'success' : 'danger'}
            />
          ))
        )}
      </TableCard>

      <TableCard title="Outstanding Balances by Tenant">
        {outstandingBalances.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-600">No outstanding balances</p>
        ) : (
          outstandingBalances.map((balance) => (
            <WorkItemRow
              key={balance.tenantId}
              title={balance.tenantName}
              subtitle={
                balance.daysPastDue > 0 ? `${balance.daysPastDue} days past due` : 'Current'
              }
              badges={[
                {
                  key: 'status',
                  label: balance.daysPastDue > 0 ? 'Overdue' : 'Outstanding',
                  tone: balance.daysPastDue > 0 ? 'danger' : 'warning',
                },
              ]}
              metaLabel={
                balance.daysPastDue > 0
                  ? `${balance.daysPastDue} days late`
                  : 'Outstanding'
              }
              metaDetail={formatCurrency(balance.totalAmount)}
              metaTone={balance.daysPastDue > 0 ? 'danger' : 'warning'}
              dotTone={balance.daysPastDue > 0 ? 'danger' : 'warning'}
            />
          ))
        )}
      </TableCard>
    </div>
  );
}
