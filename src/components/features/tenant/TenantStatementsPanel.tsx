'use client';

/**
 * Tenant statements panel — Excel / PDF / Print exports of payment & invoice data.
 * Nested under Payments as "Statements" rather than a top-level nav item.
 */

import React, { useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  FileType,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/forms/FormField';
import { useNotifications } from '@/hooks/useNotifications';
import { useTenantTheme } from '@/hooks/useTenantTheme';
import { cn } from '@/lib/utils';

export function TenantStatementsPanel() {
  const theme = useTenantTheme();
  const [reportType, setReportType] = useState<'payments' | 'invoices' | 'summary'>('payments');
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const { showNotification } = useNotifications();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const params = new URLSearchParams({ type: reportType });
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const response = await fetch(`/api/tenant/reports?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setReportData(data.data);
        showNotification({
          type: 'success',
          title: 'Statement ready',
          message: 'Preview loaded — export or print when ready.',
        });
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to generate statement',
        });
      }
    } catch {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to generate statement',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/tenant/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType,
          format,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}-statement-${dateFrom || 'all'}-${dateTo || 'all'}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showNotification({
          type: 'success',
          title: 'Downloaded',
          message: `Statement exported as ${format.toUpperCase()}`,
        });
      } else {
        const data = await response.json();
        showNotification({
          type: 'error',
          title: 'Export failed',
          message: data.error || 'Failed to export',
        });
      }
    } catch {
      showNotification({
        type: 'error',
        title: 'Export failed',
        message: 'Failed to export statement',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className={theme.sectionTitle}>Statements</h2>
        <p className={cn('mt-1', theme.muted)}>
          Export payment history and invoices as Excel or PDF, or print the preview.
        </p>
      </div>

      <div className={theme.cardPad}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Statement type" htmlFor="statementType">
            <Select
              id="statementType"
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value as 'payments' | 'invoices' | 'summary');
                setReportData(null);
              }}
              className={theme.input}
            >
              <option value="payments">Payment history</option>
              <option value="invoices">Invoice history</option>
              <option value="summary">Financial summary</option>
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="From" htmlFor="dateFrom">
              <Input
                type="date"
                id="dateFrom"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={theme.input}
              />
            </FormField>
            <FormField label="To" htmlFor="dateTo">
              <Input
                type="date"
                id="dateTo"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={theme.input}
              />
            </FormField>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            variant="success"
            onClick={handleGenerateReport}
            isLoading={isGenerating}
            leftIcon={!isGenerating ? <FileText className="h-4 w-4" /> : undefined}
            className={theme.primaryButton}
          >
            Generate statement
          </Button>
        </div>
      </div>

      {reportData && (
        <div className={cn(theme.cardPad, 'print:bg-white print:text-black')}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <h3 className={theme.sectionTitle}>Preview</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('excel')}
                isLoading={isExporting}
                leftIcon={<FileSpreadsheet className="h-4 w-4" />}
                className={theme.outlineButton}
              >
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('pdf')}
                isLoading={isExporting}
                leftIcon={<FileType className="h-4 w-4" />}
                className={theme.outlineButton}
              >
                PDF
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={() => window.print()}
                leftIcon={<Printer className="h-4 w-4" />}
                className={theme.primaryButton}
              >
                Print
              </Button>
            </div>
          </div>

          {reportData.summary && (
            <div className={cn("mb-4 grid grid-cols-2 gap-3 rounded-lg border p-4 md:grid-cols-4 print:bg-gray-50", theme.divider, theme.mode === "dark" ? "bg-black/60" : "bg-zinc-50")}>
              {Object.entries(reportData.summary).map(([key, value]) => {
                if (key === 'period' || key === 'tenantName') return null;
                return (
                  <div key={key}>
                    <p className={cn('capitalize', theme.label)}>{key.replace(/([A-Z])/g, ' $1')}</p>
                    <p className={cn(theme.value, 'print:text-black')}>
                      {typeof value === 'number' && key.toLowerCase().includes('amount')
                        ? formatCurrency(value)
                        : String(value)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {Array.isArray(reportData.payments) && reportData.payments.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className={cn('border-b text-left', theme.divider, theme.shellMuted)}>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Amount</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.payments.map((p: any) => (
                    <tr key={p.id} className={cn('border-b', theme.divider)}>
                      <td className={cn('py-2 pr-3', theme.body)}>
                        {formatDate(p.paymentDate || p.date)}
                      </td>
                      <td className={cn('py-2 pr-3', theme.body)}>
                        {p.paymentType || p.type}
                      </td>
                      <td className={cn('py-2 pr-3', theme.listValue)}>
                        {formatCurrency(Number(p.amount) || 0)}
                      </td>
                      <td className={cn('py-2', theme.listLabel)}>
                        {p.paymentStatus || p.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Array.isArray(reportData.invoices) && reportData.invoices.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className={cn('border-b text-left', theme.divider, theme.shellMuted)}>
                    <th className="py-2 pr-3">Invoice</th>
                    <th className="py-2 pr-3">Due</th>
                    <th className="py-2 pr-3">Amount</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.invoices.map((inv: any) => (
                    <tr key={inv.id} className={cn('border-b', theme.divider)}>
                      <td className={cn('py-2 pr-3', theme.body)}>{inv.invoiceNumber}</td>
                      <td className={cn('py-2 pr-3', theme.body)}>
                        {formatDate(inv.dueDate)}
                      </td>
                      <td className={cn('py-2 pr-3', theme.listValue)}>
                        {formatCurrency(Number(inv.totalAmount || inv.amount) || 0)}
                      </td>
                      <td className={cn('py-2', theme.listLabel)}>
                        {inv.status || inv.invoiceStatus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
