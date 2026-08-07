'use client';

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  FileType,
  Printer,
  Zap,
  Droplets,
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import type {
  ReportPeriodPreset,
  ReportView,
} from '@/lib/constants/bills-expenses';
import {
  Button,
  EmptyState,
  FilterBar,
  FormField,
  PageHeader,
  Select,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';

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
    <div className="space-y-6 p-6 print:p-0">
      <div className="print:hidden">
        <PageHeader
          title="Reports"
          description="Expense & utility bill reporting"
          backHref="/admin/bills-expenses/utility-bills"
          backLabel="Back to Bills & Expenses"
        />
      </div>

      <FilterBar
        columns={4}
        className="print:hidden"
        footer={
          <Button onClick={handleGenerate} isLoading={isGenerating}>
            Generate
          </Button>
        }
      >
        <FormField label="Report type" htmlFor="report-view">
          <Select
            id="report-view"
            value={view}
            onChange={(e) => setView(e.target.value as ReportView)}
          >
            <option value="summary">Summary by category</option>
            <option value="detail">Detail list</option>
          </Select>
        </FormField>
        <FormField label="Period" htmlFor="report-period">
          <Select
            id="report-period"
            value={period}
            onChange={(e) => setPeriod(e.target.value as ReportPeriodPreset)}
          >
            <option value="this_month">This month</option>
            <option value="last_month">Last month</option>
            <option value="this_quarter">This quarter</option>
            <option value="last_quarter">Last quarter</option>
            <option value="last_6_months">Last 6 months</option>
            <option value="this_year">This year</option>
          </Select>
        </FormField>
        <FormField label="Building" htmlFor="report-building">
          <Select
            id="report-building"
            value={buildingId}
            onChange={(e) => setBuildingId(e.target.value)}
          >
            <option value="">All buildings</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </FormField>
      </FilterBar>

      {reportData && (
        <div className="overflow-hidden rounded-lg bg-white shadow print:shadow-none">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              {reportData.periodLabel} —{' '}
              {reportData.view === 'summary' ? 'Summary by category' : 'Detail list'}
              {reportData.buildingName ? ` · ${reportData.buildingName}` : ''}
            </h2>
            <div className="flex gap-2 print:hidden">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrint}
                leftIcon={<Printer className="h-3.5 w-3.5" />}
              >
                Print
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleExport('pdf')}
                disabled={isExporting}
                leftIcon={<FileType className="h-3.5 w-3.5" />}
              >
                PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleExport('excel')}
                disabled={isExporting}
                leftIcon={<FileSpreadsheet className="h-3.5 w-3.5" />}
              >
                Excel
              </Button>
            </div>
          </div>

          {reportData.view === 'summary' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">% of total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.summary.length === 0 ? (
                  <TableEmpty colSpan={3}>
                    No expenses or utility bills in this period
                  </TableEmpty>
                ) : (
                  reportData.summary.map((row) => (
                    <TableRow key={row.category}>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <CategoryIcon category={row.category} />
                          {row.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(row.amount)}
                      </TableCell>
                      <TableCell className="text-right text-gray-600 tabular-nums">
                        {row.percentage}%
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Unit / Building</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.details.length === 0 ? (
                  <TableEmpty colSpan={5}>No line items in this period</TableEmpty>
                ) : (
                  reportData.details.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-gray-600">{formatDate(row.date)}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          <CategoryIcon category={row.category} />
                          {row.categoryLabel}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-normal">{row.description}</TableCell>
                      <TableCell className="text-gray-600">{row.locationLabel}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(row.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {((reportData.view === 'summary' && reportData.summary.length > 0) ||
            (reportData.view === 'detail' && reportData.details.length > 0)) && (
            <div className="flex justify-between border-t border-gray-200 px-6 py-3.5 text-sm font-semibold text-gray-900">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(reportData.totalAmount)}</span>
            </div>
          )}
        </div>
      )}

      {!reportData && !isGenerating && (
        <EmptyState
          className="rounded-lg border border-dashed border-gray-200 print:hidden"
          title="No report yet"
          description="Choose report type, period, and building, then click Generate."
        />
      )}
    </div>
  );
}
