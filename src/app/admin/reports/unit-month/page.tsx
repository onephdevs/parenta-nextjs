'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Grid3X3 } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import type {
  CollectionCellStatus,
  UnitMonthCollectionsData,
} from '@/lib/services/unit-month-collections';

function formatPhp(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function cellTone(status: CollectionCellStatus): string {
  switch (status) {
    case 'paid':
      return 'bg-emerald-50 text-emerald-900 border-emerald-200';
    case 'partial':
      return 'bg-amber-50 text-amber-950 border-amber-200';
    case 'unpaid':
      return 'bg-red-50 text-red-900 border-red-200';
    case 'vacant':
      return 'bg-gray-50 text-gray-500 border-gray-200';
    default:
      return 'bg-white text-gray-400 border-gray-100';
  }
}

function cellLabel(status: CollectionCellStatus): string {
  switch (status) {
    case 'paid':
      return 'Paid';
    case 'partial':
      return 'Partial';
    case 'unpaid':
      return 'Unpaid';
    case 'vacant':
      return 'Vacant';
    default:
      return '—';
  }
}

export default function UnitMonthCollectionsPage() {
  const { data: session, status } = useSession();
  const { showNotification } = useNotifications();
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [buildings, setBuildings] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<UnitMonthCollectionsData | null>(
    null
  );

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'admin')) {
      redirect('/auth/signin');
    }

    const today = new Date();
    const end = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const startDate = new Date(today.getFullYear(), today.getMonth() - 5, 1);
    const start = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
    setStartMonth(start);
    setEndMonth(end);

    fetch('/api/buildings?limit=100')
      .then((r) => r.json())
      .then((data) => {
        const list = data.data?.buildings || data.buildings || data.data || [];
        setBuildings(
          (Array.isArray(list) ? list : []).map(
            (b: { id: string; name: string }) => ({
              id: b.id,
              name: b.name,
            })
          )
        );
      })
      .catch(() => undefined);
  }, [session, status]);

  const handleGenerate = async () => {
    if (!startMonth || !endMonth) {
      showNotification({
        type: 'warning',
        title: 'Months required',
        message: 'Select start and end months',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const params = new URLSearchParams({ startMonth, endMonth });
      if (buildingId) params.set('buildingId', buildingId);
      const response = await fetch(
        `/api/reports/unit-month-collections?${params}`
      );
      const data = await response.json();
      if (data.success) {
        setReportData(data.data);
        showNotification({
          type: 'success',
          title: 'Matrix ready',
          message: `${data.data.rows?.length || 0} units × ${data.data.monthKeys?.length || 0} months`,
        });
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to generate matrix',
        });
      }
    } catch {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to generate unit×month matrix',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Unit × Month Collections"
        description="Spreadsheet-style desk: paid / partial / unpaid per unit and month (revenue units only)"
        actions={
          <Link href="/admin/reports">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Reports
            </Button>
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </CardHeader>
        <div className="grid gap-4 p-4 sm:grid-cols-4">
          <FormField label="Start month" htmlFor="startMonth">
            <Input
              id="startMonth"
              type="month"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
            />
          </FormField>
          <FormField label="End month" htmlFor="endMonth">
            <Input
              id="endMonth"
              type="month"
              value={endMonth}
              onChange={(e) => setEndMonth(e.target.value)}
            />
          </FormField>
          <FormField label="Property" htmlFor="buildingId">
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
          <div className="flex items-end">
            <Button
              variant="primary"
              onClick={() => void handleGenerate()}
              isLoading={isGenerating}
              leftIcon={
                isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Grid3X3 className="h-4 w-4" />
                )
              }
            >
              Generate matrix
            </Button>
          </div>
        </div>
      </Card>

      {reportData && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">
              {reportData.rows.length} units · {reportData.monthKeys.length} months
            </h3>
          </CardHeader>
          <div className="overflow-x-auto p-2">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 px-3 py-2 text-left font-semibold text-gray-900">
                    Unit
                  </th>
                  {reportData.monthKeys.map((key) => (
                    <th
                      key={key}
                      className="border-b border-gray-200 px-2 py-2 text-center font-semibold text-gray-700 whitespace-nowrap"
                    >
                      {monthLabel(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.rows.map((row) => (
                  <tr key={row.roomId} className="hover:bg-gray-50/80">
                    <td className="sticky left-0 z-10 bg-white border-b border-r border-gray-100 px-3 py-2 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {row.buildingName} · {row.roomNumber}
                      </div>
                      <div className="text-gray-500">
                        {formatPhp(row.monthlyRate)}/mo
                      </div>
                    </td>
                    {row.cells.map((cell) => (
                      <td
                        key={cell.monthKey}
                        className="border-b border-gray-100 px-1 py-1"
                      >
                        {cell.invoiceId ? (
                          <Link
                            href={`/admin/financial/invoices/${cell.invoiceId}`}
                            className={`block rounded border px-1.5 py-1.5 text-center leading-tight ${cellTone(cell.status)}`}
                            title={
                              cell.tenantName
                                ? `${cell.tenantName} · ${formatPhp(cell.balance)} due`
                                : cellLabel(cell.status)
                            }
                          >
                            <div className="font-semibold">
                              {cellLabel(cell.status)}
                            </div>
                            {cell.billed > 0 && (
                              <div className="opacity-80">
                                {formatPhp(cell.paid)}/{formatPhp(cell.billed)}
                              </div>
                            )}
                            {cell.usingDeposit && (
                              <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide">
                                Deposit
                              </div>
                            )}
                          </Link>
                        ) : (
                          <div
                            className={`rounded border px-1.5 py-1.5 text-center ${cellTone(cell.status)}`}
                          >
                            {cellLabel(cell.status)}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td className="sticky left-0 z-10 bg-gray-50 border-t border-r border-gray-200 px-3 py-2 font-semibold text-gray-900">
                    Totals
                  </td>
                  {reportData.totalsByMonth.map((t) => (
                    <td
                      key={t.monthKey}
                      className="border-t border-gray-200 px-1 py-2 text-center text-gray-800"
                    >
                      <div className="font-medium">{formatPhp(t.paid)}</div>
                      <div className="text-gray-500">
                        bal {formatPhp(t.balance)}
                      </div>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
