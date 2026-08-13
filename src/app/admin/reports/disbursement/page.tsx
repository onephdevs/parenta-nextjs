'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Printer,
  Calculator,
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import { formatReportCategoryLabel } from '@/lib/constants/bills-expenses';
import type { DisbursementReportData } from '@/lib/services/disbursement-report';

function formatPhp(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export default function DisbursementReportPage() {
  const { data: session, status } = useSession();
  const { showNotification } = useNotifications();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [buildings, setBuildings] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCommittingLifetime, setIsCommittingLifetime] = useState(false);
  const [reportData, setReportData] = useState<DisbursementReportData | null>(
    null
  );

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'admin')) {
      redirect('/auth/signin');
    }

    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(today.getMonth() - 1);
    setStartDate(lastMonth.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);

    fetch('/api/buildings?limit=100')
      .then((r) => r.json())
      .then((data) => {
        const list = data.buildings || data.data || [];
        setBuildings(
          list.map((b: { id: string; name: string }) => ({
            id: b.id,
            name: b.name,
          }))
        );
      })
      .catch(() => undefined);
  }, [session, status]);

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      showNotification({
        type: 'warning',
        title: 'Date Required',
        message: 'Please select both start and end dates',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (buildingId) params.set('buildingId', buildingId);

      const response = await fetch(`/api/reports/disbursement?${params}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate report');
      }

      setReportData(data.data);
      showNotification({
        type: 'success',
        title: 'Report Generated',
        message: 'Disbursement waterfall ready',
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Error',
        message:
          error instanceof Error ? error.message : 'Failed to generate report',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCommitLifetime = async () => {
    if (!startDate || !endDate) return;
    setIsCommittingLifetime(true);
    try {
      const response = await fetch(
        '/api/reports/collected-amount/commit-lifetime',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate,
            endDate,
            buildingId: buildingId || null,
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        setReportData((prev) =>
          prev
            ? {
                ...prev,
                lifetime: {
                  ...prev.lifetime,
                  previousTotal: data.data.previousTotal,
                  currentPeriodCollection: data.data.currentPeriodCollection,
                  overallCollection: data.data.overallCollection,
                  alreadyCommitted: true,
                  asOfDate: data.data.asOfDate,
                },
              }
            : prev
        );
        showNotification({
          type: 'success',
          title: 'Period locked',
          message: data.message || 'Period committed to lifetime collection',
        });
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to lock period',
        });
      }
    } catch {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to lock period',
      });
    } finally {
      setIsCommittingLifetime(false);
    }
  };

  const w = reportData?.waterfall;

  return (
    <div className="space-y-6 print:space-y-4">
      <PageHeader
        title="Disbursement / Cash-flow"
        description="Period reconciliation: collection → expenses → allowance → deposits & cheques → grand total"
        actions={
          <Link href="/admin/reports">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              All reports
            </Button>
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Date range</h2>
        </CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <FormField label="From" htmlFor="startDate">
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </FormField>
          <FormField label="To" htmlFor="endDate">
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </FormField>
          <FormField label="Property (optional)" htmlFor="buildingId">
            <Select
              id="buildingId"
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
            >
              <option value="">All properties</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="flex items-end gap-2">
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Calculator className="h-4 w-4 mr-2" />
              )}
              Generate
            </Button>
            {reportData && (
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="print:hidden"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            )}
          </div>
        </div>
      </Card>

      {w && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Waterfall</h2>
            <p className="text-sm text-gray-500 mt-1">
              {reportData!.startDate} → {reportData!.endDate}
            </p>
          </CardHeader>
          <div>
            <table className="w-full max-w-xl text-sm">
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-3 font-medium text-gray-900">Total Collection</td>
                  <td className="py-3 text-right font-semibold tabular-nums">
                    {formatPhp(w.totalCollection)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-700">− Expenses</td>
                  <td className="py-3 text-right tabular-nums text-red-700">
                    ({formatPhp(w.expenses)})
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-3 font-medium text-gray-900">= After expenses</td>
                  <td className="py-3 text-right font-semibold tabular-nums">
                    {formatPhp(w.afterExpenses)}
                  </td>
                </tr>
                {w.imaCashAllowance > 0 && (
                  <tr>
                    <td className="py-3 text-gray-700">− Ima cash allowance</td>
                    <td className="py-3 text-right tabular-nums text-red-700">
                      ({formatPhp(w.imaCashAllowance)})
                    </td>
                  </tr>
                )}
                <tr className="bg-gray-50">
                  <td className="py-3 font-medium text-gray-900">= Cash for deposit</td>
                  <td className="py-3 text-right font-semibold tabular-nums">
                    {formatPhp(w.cashForDeposit)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-700">+ Cheque payments</td>
                  <td className="py-3 text-right tabular-nums">
                    {formatPhp(w.chequePayments)}
                  </td>
                </tr>
                <tr className="border-t-2 border-gray-300">
                  <td className="py-4 text-base font-semibold text-gray-900">
                    = Grand Total
                  </td>
                  <td className="py-4 text-right text-base font-bold tabular-nums text-gray-900">
                    {formatPhp(w.grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="mt-4 text-xs text-gray-500 max-w-xl">
              Total Collection excludes deposits and cheque payments (those are added
              below). Expenses include all non-cancelled expense entries in range,
              including move-out refunds.
            </p>
          </div>
        </Card>
      )}

      {reportData?.lifetime && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Lifetime collection / period lock
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Previous Total + Current Period = Overall. Locking prevents
                  double-counting this date range.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {reportData.lifetime.alreadyCommitted && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
                    Period locked
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    reportData.lifetime.alreadyCommitted || isCommittingLifetime
                  }
                  onClick={() => void handleCommitLifetime()}
                >
                  {isCommittingLifetime
                    ? 'Locking…'
                    : reportData.lifetime.alreadyCommitted
                      ? 'Already locked'
                      : 'Lock period to lifetime'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-gray-500">Previous Total</p>
              <p className="font-semibold tabular-nums">
                {formatPhp(reportData.lifetime.previousTotal)}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Current Period</p>
              <p className="font-semibold tabular-nums">
                {formatPhp(reportData.lifetime.currentPeriodCollection)}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Overall Collection</p>
              <p className="font-semibold tabular-nums">
                {formatPhp(reportData.lifetime.overallCollection)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {reportData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                Expenses by category
              </h2>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2">Category</th>
                    <th className="pb-2 text-right">Count</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.breakdown.expensesByCategory.map((row) => (
                    <tr key={row.category} className="border-b border-gray-50">
                      <td className="py-2">
                        {formatReportCategoryLabel(row.category)}
                      </td>
                      <td className="py-2 text-right">{row.count}</td>
                      <td className="py-2 text-right tabular-nums">
                        {formatPhp(row.amount)}
                      </td>
                    </tr>
                  ))}
                  {reportData.breakdown.expensesByCategory.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-gray-500">
                        No expenses in range
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                Collections by method
              </h2>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2">Method</th>
                    <th className="pb-2 text-right">Count</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.breakdown.collectionByMethod.map((row) => (
                    <tr key={row.method} className="border-b border-gray-50">
                      <td className="py-2 capitalize">
                        {row.method.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2 text-right">{row.count}</td>
                      <td className="py-2 text-right tabular-nums">
                        {formatPhp(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
