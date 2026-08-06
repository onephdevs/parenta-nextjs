'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  FileSpreadsheet,
  FileType,
  Printer,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useNotifications } from '@/hooks/useNotifications';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import { ListSummaryCard } from '@/components/ui/ListSummaryCard';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  formatReportCategoryLabel,
} from '@/lib/constants/bills-expenses';

type PeriodType = 'monthly' | 'quarterly' | 'semi-annual' | 'annual';

interface ExpenseReportData {
  summary: {
    totalExpenses: number;
    totalCount: number;
    averageExpense: number;
    largestExpense: number;
    averageMonthlyExpense: number;
    period: string;
    periodType: string;
    periodLabel: string;
  };
  byCategory: Array<{
    category: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  monthlyTrend: Array<Record<string, string | number>>;
  details: Array<{
    id: string;
    description: string;
    amount: number;
    category: string;
    buildingName?: string;
    roomNumber?: string;
    expenseDate: string;
    vendorName?: string;
    notes?: string;
  }>;
}

const CATEGORY_COLORS: Record<string, string> = {
  cleaning: '#8B5CF6',
  maintenance: '#06B6D4',
  repair: '#EAB308',
  upgrade: '#EC4899',
  garbage_collection: '#22C55E',
  other: '#9CA3AF',
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount || 0);
}

function formatDate(date: string) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

function toLocalYmd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function rangeForPeriodType(periodType: PeriodType, year: number, half: 1 | 2): {
  startDate: string;
  endDate: string;
  subtitle: string;
} {
  if (periodType === 'semi-annual') {
    if (half === 1) {
      return {
        startDate: toLocalYmd(new Date(year, 0, 1)),
        endDate: toLocalYmd(new Date(year, 6, 0)),
        subtitle: `January to June ${year}`,
      };
    }
    return {
      startDate: toLocalYmd(new Date(year, 6, 1)),
      endDate: toLocalYmd(new Date(year, 11, 31)),
      subtitle: `July to December ${year}`,
    };
  }

  if (periodType === 'annual') {
    return {
      startDate: toLocalYmd(new Date(year, 0, 1)),
      endDate: toLocalYmd(new Date(year, 11, 31)),
      subtitle: String(year),
    };
  }

  if (periodType === 'quarterly') {
    const q = Math.floor(new Date().getMonth() / 3);
    const startMonth = q * 3;
    return {
      startDate: toLocalYmd(new Date(year, startMonth, 1)),
      endDate: toLocalYmd(new Date(year, startMonth + 3, 0)),
      subtitle: `Q${q + 1} ${year}`,
    };
  }

  // monthly — current month
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  return {
    startDate: toLocalYmd(new Date(y, m, 1)),
    endDate: toLocalYmd(new Date(y, m + 1, 0)),
    subtitle: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  };
}

export default function ExpenseReportPage() {
  const { showNotification } = useNotifications();
  const now = new Date();
  const initial = rangeForPeriodType('semi-annual', now.getFullYear(), 1);

  const [periodType, setPeriodType] = useState<PeriodType>('semi-annual');
  const [year, setYear] = useState(now.getFullYear());
  const [half, setHalf] = useState<1 | 2>(1);
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [periodSubtitle, setPeriodSubtitle] = useState(initial.subtitle);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [reportData, setReportData] = useState<ExpenseReportData | null>(null);

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [y, y - 1, y - 2, y - 3];
  }, []);

  const applyPeriodDefaults = (nextType: PeriodType, nextYear = year, nextHalf = half) => {
    const range = rangeForPeriodType(nextType, nextYear, nextHalf);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    setPeriodSubtitle(range.subtitle);
  };

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      showNotification({
        type: 'warning',
        title: 'Date Required',
        message: 'Please select a reporting period',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        periodType,
      });
      if (category) params.set('category', category);

      const response = await fetch(`/api/reports/expenses?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed');

      setReportData(data.data);
      showNotification({
        type: 'success',
        title: 'Report Generated',
        message: 'Expense report ready',
      });
    } catch (error) {
      console.error(error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to generate report',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!reportData) {
      showNotification({
        type: 'warning',
        title: 'No Data',
        message: 'Generate the report first',
      });
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch(`/api/reports/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: 'expenses',
          data: reportData,
          filename: `expense-report-${startDate}-${endDate}`,
        }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-report-${startDate}-${endDate}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showNotification({
        type: 'success',
        title: 'Export Successful',
        message: `Report exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error(error);
      showNotification({
        type: 'error',
        title: 'Export Failed',
        message: 'Failed to export report',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const chartCategories = reportData?.byCategory.map((c) => c.category) || [];

  return (
    <div className="space-y-6 p-6">
      <Link
        href="/admin/reports"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </Link>

      <PageHeader
        title={
          reportData
            ? `${reportData.summary.periodLabel || 'Expense'} Expense Report`
            : 'Expense Report'
        }
        description={reportData ? periodSubtitle : 'List, totals, and category breakdown by period'}
        actions={
          reportData ? (
            <>
              <Button
                variant="outline"
                onClick={() => handleExport('excel')}
                isLoading={isExporting}
                leftIcon={<FileSpreadsheet className="h-4 w-4" />}
              >
                Export Excel
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('pdf')}
                isLoading={isExporting}
                leftIcon={<FileType className="h-4 w-4" />}
              >
                Export PDF
              </Button>
              <Button variant="outline" onClick={() => window.print()} leftIcon={<Printer className="h-4 w-4" />}>
                Print
              </Button>
            </>
          ) : undefined
        }
      />

      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <FormField label="Category" htmlFor="category">
            <Select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {EXPENSE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Period Type" htmlFor="periodType">
            <Select
              id="periodType"
              value={periodType}
              onChange={(e) => {
                const next = e.target.value as PeriodType;
                setPeriodType(next);
                applyPeriodDefaults(next);
              }}
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="semi-annual">Semi-Annual</option>
              <option value="annual">Annual</option>
            </Select>
          </FormField>

          {periodType === 'semi-annual' && (
            <FormField label="Months" htmlFor="half">
              <Select
                id="half"
                value={String(half)}
                onChange={(e) => {
                  const next = Number(e.target.value) as 1 | 2;
                  setHalf(next);
                  applyPeriodDefaults(periodType, year, next);
                }}
              >
                <option value="1">January to June</option>
                <option value="2">July to December</option>
              </Select>
            </FormField>
          )}

          <FormField label="Year" htmlFor="year">
            <Select
              id="year"
              value={String(year)}
              onChange={(e) => {
                const next = Number(e.target.value);
                setYear(next);
                applyPeriodDefaults(periodType, next, half);
              }}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Start Date" htmlFor="startDate">
            <Input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriodSubtitle(`${e.target.value} to ${endDate}`);
              }}
            />
          </FormField>

          <FormField label="End Date" htmlFor="endDate">
            <Input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriodSubtitle(`${startDate} to ${e.target.value}`);
              }}
            />
          </FormField>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={handleGenerate} isLoading={isGenerating}>
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>
      </Card>

      {reportData && (
        <>
          <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <ListSummaryCard
              title="Total Expenses"
              value={formatCurrency(reportData.summary.totalExpenses)}
              footer={`${reportData.summary.totalCount} items`}
              icon={<span className="text-lg font-bold text-gray-400">₱</span>}
            />
            <ListSummaryCard
              title="Largest Expense"
              value={formatCurrency(reportData.summary.largestExpense)}
              footer="highest single item"
              icon={<span className="text-lg font-bold text-gray-400">₱</span>}
            />
            <ListSummaryCard
              title="Average Monthly Expense"
              value={formatCurrency(reportData.summary.averageMonthlyExpense)}
              footer="across selected period"
              icon={<span className="text-lg font-bold text-gray-400">₱</span>}
            />
          </div>

          <div className="mb-8 overflow-hidden rounded-lg bg-white shadow">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">
                Total Expense Per Category
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-5">
              <div className="space-y-3 lg:col-span-2">
                {reportData.byCategory.length === 0 ? (
                  <p className="text-sm text-gray-500">No category data</p>
                ) : (
                  reportData.byCategory.map((row) => (
                    <div key={row.category} className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              CATEGORY_COLORS[row.category] || CATEGORY_COLORS.other,
                          }}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {formatReportCategoryLabel(row.category)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {row.percentage.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-gray-900">
                        {formatCurrency(row.amount)}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="h-72 lg:col-span-3">
                {reportData.monthlyTrend.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                    No trend data for this period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={reportData.monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(v) =>
                          `₱${Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}K` : v}`
                        }
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          formatCurrency(value),
                          formatReportCategoryLabel(name),
                        ]}
                      />
                      <Legend
                        formatter={(value) => formatReportCategoryLabel(String(value))}
                      />
                      {chartCategories.map((cat) => (
                        <Line
                          key={cat}
                          type="monotone"
                          dataKey={cat}
                          stroke={CATEGORY_COLORS[cat] || CATEGORY_COLORS.other}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-base font-semibold text-gray-900">Expenses Details</h3>
              <p className="text-sm text-gray-500">
                {reportData.details.length} items in total
              </p>
            </div>
            {reportData.details.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-600">
                No expenses in this period
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                        Expense Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                        Description
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-900">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {reportData.details.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {formatDate(row.expenseDate)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {formatReportCategoryLabel(row.category)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {row.description || '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(row.amount)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {row.notes?.trim() || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
