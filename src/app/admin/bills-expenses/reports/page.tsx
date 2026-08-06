'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  FileSpreadsheet,
  FileType,
  Loader2,
  Printer,
  Zap,
  Droplets,
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import type {
  ReportPeriodPreset,
  ReportView,
} from '@/lib/constants/bills-expenses';

interface Building {
  id: string;
  name: string;
}

interface SummaryRow {
  category: string;
  label: string;
  amount: number;
  percentage: number;
}

interface DetailRow {
  id: string;
  category: string;
  categoryLabel: string;
  description: string;
  date: string;
  amount: number;
  locationLabel: string;
  vendor?: string;
  source: 'utility' | 'expense';
}

interface ReportData {
  view: ReportView;
  periodLabel: string;
  startDate: string;
  endDate: string;
  buildingName?: string;
  totalAmount: number;
  summary: SummaryRow[];
  details: DetailRow[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ExpenseReportsPage() {
  const { showNotification } = useNotifications();
  const [view, setView] = useState<ReportView>('summary');
  const [period, setPeriod] = useState<ReportPeriodPreset>('this_month');
  const [buildingId, setBuildingId] = useState('');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        const response = await fetch('/api/buildings');
        if (!response.ok) return;
        const data = await response.json();
        let list: Building[] = [];
        if (data.success && data.data?.buildings) list = data.data.buildings;
        else if (data.success && Array.isArray(data.data)) list = data.data;
        else if (Array.isArray(data.buildings)) list = data.buildings;
        setBuildings(
          list.map((b: Building & { building_name?: string }) => ({
            id: String(b.id),
            name: b.name || b.building_name || 'Building',
          }))
        );
      } catch {
        setBuildings([]);
      }
    };
    fetchBuildings();
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const params = new URLSearchParams({
        view,
        period,
      });
      if (buildingId) params.set('buildingId', buildingId);

      const response = await fetch(
        `/api/reports/bills-expenses?${params.toString()}`
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed');

      setReportData(data.data);
      showNotification({
        type: 'success',
        title: 'Report Generated',
        message: 'Expense & utility report ready',
      });
    } catch (error) {
      console.error(error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to generate report',
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
          reportType: 'bills-expenses',
          data: reportData,
          filename: `bills-expenses-${reportData.startDate}`,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bills-expenses-${reportData.startDate}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
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

  const handlePrint = () => {
    window.print();
  };

  const CategoryIcon = ({ category }: { category: string }) => {
    if (category === 'electricity') {
      return <Zap className="h-3.5 w-3.5 text-amber-500" />;
    }
    if (category === 'water') {
      return <Droplets className="h-3.5 w-3.5 text-sky-500" />;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 print:max-w-none print:px-0">
        <Link
          href="/admin/bills-expenses/utility-bills"
          className="mb-6 inline-flex items-center text-sm text-gray-500 hover:text-gray-900 print:hidden"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Bills &amp; Expenses
        </Link>

        <div className="mb-8 print:hidden">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Reports
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Expense &amp; utility bill reporting
          </p>
        </div>

        {/* Controls */}
        <div className="mb-8 flex flex-col gap-3 rounded-lg bg-gray-50 p-4 sm:flex-row sm:items-end print:hidden">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Report type
            </label>
            <select
              value={view}
              onChange={(e) => setView(e.target.value as ReportView)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="summary">Summary by category</option>
              <option value="detail">Detail list</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Period
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as ReportPeriodPreset)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="this_month">This month</option>
              <option value="last_month">Last month</option>
              <option value="this_quarter">This quarter</option>
              <option value="last_quarter">Last quarter</option>
              <option value="last_6_months">Last 6 months</option>
              <option value="this_year">This year</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Building
            </label>
            <select
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">All buildings</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
            Generate
          </button>
        </div>

        {/* Report output */}
        {reportData && (
          <div className="rounded-lg border border-gray-200 print:border-0">
            <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                {reportData.periodLabel} —{' '}
                {reportData.view === 'summary'
                  ? 'Summary by category'
                  : 'Detail list'}
                {reportData.buildingName
                  ? ` · ${reportData.buildingName}`
                  : ''}
              </h2>
              <div className="flex gap-2 print:hidden">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  title="Print (uses PDF layout)"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  <FileType className="h-3.5 w-3.5" />
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('excel')}
                  disabled={isExporting}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Excel
                </button>
              </div>
            </div>

            {reportData.view === 'summary' ? (
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">% of total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reportData.summary.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-8 text-center text-sm text-gray-500"
                      >
                        No expenses or utility bills in this period
                      </td>
                    </tr>
                  ) : (
                    reportData.summary.map((row) => (
                      <tr key={row.category} className="text-sm text-gray-900">
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <CategoryIcon category={row.category} />
                            {row.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums">
                          {formatCurrency(row.amount)}
                        </td>
                        <td className="px-4 py-3.5 text-right text-gray-600 tabular-nums">
                          {row.percentage}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {reportData.summary.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-gray-200 text-sm font-semibold text-gray-900">
                      <td className="px-4 py-3.5">Total</td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        {formatCurrency(reportData.totalAmount)}
                      </td>
                      <td className="px-4 py-3.5" />
                    </tr>
                  </tfoot>
                )}
              </table>
            ) : (
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Unit / Building</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reportData.details.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-sm text-gray-500"
                      >
                        No line items in this period
                      </td>
                    </tr>
                  ) : (
                    reportData.details.map((row) => (
                      <tr key={row.id} className="text-sm text-gray-900">
                        <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                          {formatDate(row.date)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5">
                            <CategoryIcon category={row.category} />
                            {row.categoryLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">{row.description}</td>
                        <td className="px-4 py-3.5 text-gray-600">
                          {row.locationLabel}
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium tabular-nums">
                          {formatCurrency(row.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {reportData.details.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-gray-200 text-sm font-semibold text-gray-900">
                      <td className="px-4 py-3.5" colSpan={4}>
                        Total
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        {formatCurrency(reportData.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        )}

        {!reportData && !isGenerating && (
          <div className="rounded-lg border border-dashed border-gray-200 px-4 py-16 text-center text-sm text-gray-500 print:hidden">
            Choose report type, period, and building, then click Generate.
          </div>
        )}
      </div>
    </div>
  );
}
