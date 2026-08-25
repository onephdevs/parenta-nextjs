'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect, useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/forms/FormField';
import {
  INSPECTION_FINDING_LABELS,
  INSPECTION_FINDING_STATUSES,
  type InspectionFindingStatus,
} from '@/lib/constants/moveout-inspection';
import type { MoveoutRefundWorksheet } from '@/lib/services/moveout-inspection-service';

function formatPhp(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export default function MoveOutInspectionPage() {
  const params = useParams();
  const router = useRouter();
  const moveoutId = String(params.id || '');
  const { data: session, status } = useSession();
  const { showNotification } = useNotifications();

  const [worksheet, setWorksheet] = useState<MoveoutRefundWorksheet | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  const [actualMoveoutDate, setActualMoveoutDate] = useState('');
  const [depositReturn, setDepositReturn] = useState('');
  const [depositDeduction, setDepositDeduction] = useState('');
  const [advanceReturn, setAdvanceReturn] = useState('');
  const [utilityReturn, setUtilityReturn] = useState('');
  const [deductionReason, setDeductionReason] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lease/moveouts/${moveoutId}`);
      const data = await res.json();
      if (!data.success) {
        showNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to load move-out',
        });
        return;
      }
      const w = data.data as MoveoutRefundWorksheet;
      setWorksheet(w);
      setActualMoveoutDate(
        w.actualMoveoutDate || w.moveoutDate || new Date().toISOString().slice(0, 10)
      );
      setDepositReturn(
        w.settlement.depositReturnAmount != null
          ? String(w.settlement.depositReturnAmount)
          : String(w.suggestedDepositReturn)
      );
      setDepositDeduction(
        w.settlement.depositDeductionAmount != null
          ? String(w.settlement.depositDeductionAmount)
          : String(w.itemizedDeductionsTotal)
      );
      setAdvanceReturn(
        w.settlement.advanceReturnAmount != null
          ? String(w.settlement.advanceReturnAmount)
          : String(w.held.advance)
      );
      setUtilityReturn(
        w.settlement.utilityDepositReturnAmount != null
          ? String(w.settlement.utilityDepositReturnAmount)
          : String(w.held.utilityDeposit)
      );
      setDeductionReason(w.settlement.deductionReason || '');
      setInspectionNotes(w.inspectionNotes || '');
    } finally {
      setLoading(false);
    }
  }, [moveoutId, showNotification]);

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'admin')) {
      redirect('/auth/signin');
    }
    if (status === 'authenticated' && moveoutId) {
      void load();
    }
  }, [session, status, moveoutId, load]);

  const updateItem = async (
    itemId: string,
    patch: {
      findingStatus?: InspectionFindingStatus;
      deductionAmount?: number;
      notes?: string;
    }
  ) => {
    setSavingItemId(itemId);
    try {
      const res = await fetch(
        `/api/lease/moveouts/${moveoutId}/items/${itemId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        }
      );
      const data = await res.json();
      if (data.success) {
        setWorksheet(data.data);
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to update item',
        });
      }
    } finally {
      setSavingItemId(null);
    }
  };

  const applyChecklistTotal = () => {
    if (!worksheet) return;
    setDepositDeduction(String(worksheet.itemizedDeductionsTotal));
    setDepositReturn(String(worksheet.suggestedDepositReturn));
    showNotification({
      type: 'info',
      title: 'Amounts updated',
      message:
        'Filled deduction/return from checklist totals — edit freely before finalize.',
    });
  };

  const saveInspectionNotes = async () => {
    const res = await fetch(`/api/lease/moveouts/${moveoutId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inspectionNotes,
        markInspectionCompleted: true,
        inspectionPassed:
          (worksheet?.itemizedDeductionsTotal || 0) <= 0.009,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setWorksheet(data.data);
      showNotification({
        type: 'success',
        title: 'Inspection saved',
        message: 'Checklist notes marked complete',
      });
    }
  };

  const finalize = async () => {
    if (!actualMoveoutDate) {
      showNotification({
        type: 'warning',
        title: 'Date required',
        message: 'Enter the actual move-out date',
      });
      return;
    }
    setFinalizing(true);
    try {
      const res = await fetch(`/api/lease/moveouts/${moveoutId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualMoveoutDate,
          depositReturnAmount: Number(depositReturn) || 0,
          depositDeductionAmount: Number(depositDeduction) || 0,
          advanceReturnAmount: Number(advanceReturn) || 0,
          utilityDepositReturnAmount: Number(utilityReturn) || 0,
          deductionReason: deductionReason || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification({
          type: 'success',
          title: 'Move-out finalized',
          message: data.message || 'Settlement completed',
        });
        setWorksheet(data.data);
        router.push('/admin/leasing');
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to finalize',
        });
      }
    } finally {
      setFinalizing(false);
    }
  };

  if (loading || !worksheet) {
    return (
      <div className="flex items-center justify-center p-16 text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading inspection worksheet…
      </div>
    );
  }

  const settled = worksheet.settlement.settlementCompleted;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Move-out inspection & refund"
        description={`${worksheet.tenantName} · ${worksheet.buildingName} · Unit ${worksheet.roomNumber}`}
        actions={
          <Link href="/admin/leasing">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Lease management
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700">Held funds</h2>
          </CardHeader>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>Security deposit</dt>
              <dd className="tabular-nums font-medium">
                {formatPhp(worksheet.held.deposit)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Advance</dt>
              <dd className="tabular-nums font-medium">
                {formatPhp(worksheet.held.advance)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Utility deposit</dt>
              <dd className="tabular-nums font-medium">
                {formatPhp(worksheet.held.utilityDeposit)}
              </dd>
            </div>
            <div className="flex justify-between border-t pt-2 font-semibold">
              <dt>Total held</dt>
              <dd className="tabular-nums">{formatPhp(worksheet.held.total)}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700">
              Checklist itemized (manual)
            </h2>
          </CardHeader>
          <p className="text-2xl font-bold tabular-nums text-amber-700">
            {formatPhp(worksheet.itemizedDeductionsTotal)}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Sum of deductions you enter on failed findings — not an automatic
            formula. Suggested deposit return:{' '}
            <span className="font-medium text-gray-800">
              {formatPhp(worksheet.suggestedDepositReturn)}
            </span>
          </p>
          {!settled && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={applyChecklistTotal}
            >
              Use checklist totals in refund fields
            </Button>
          )}
        </Card>
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-700">Status</h2>
          </CardHeader>
          <p className="capitalize text-lg font-semibold">{worksheet.status}</p>
          <p className="text-sm text-gray-500 mt-1">
            Scheduled move-out {worksheet.moveoutDate}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">
            Inspection checklist
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Mark each item and enter a deduction amount only when warranted
            (damages / unpaid bills are case-by-case).
          </p>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 pr-2">Item</th>
                <th className="pb-2 pr-2">Finding</th>
                <th className="pb-2 pr-2 text-right">Deduction (₱)</th>
                <th className="pb-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {worksheet.checklist.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 align-top">
                  <td className="py-3 pr-2">
                    <div className="font-medium text-gray-900">{item.label}</div>
                    <div className="text-xs text-gray-500 capitalize">
                      {item.category}
                    </div>
                  </td>
                  <td className="py-3 pr-2">
                    <Select
                      value={item.findingStatus}
                      disabled={settled || savingItemId === item.id}
                      onChange={(e) =>
                        void updateItem(item.id, {
                          findingStatus: e.target
                            .value as InspectionFindingStatus,
                        })
                      }
                    >
                      {INSPECTION_FINDING_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {INSPECTION_FINDING_LABELS[s]}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="py-3 pr-2">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      className="text-right"
                      defaultValue={item.deductionAmount}
                      disabled={settled || savingItemId === item.id}
                      onBlur={(e) => {
                        const val = Number(e.target.value) || 0;
                        if (val !== item.deductionAmount) {
                          void updateItem(item.id, { deductionAmount: val });
                        }
                      }}
                    />
                  </td>
                  <td className="py-3">
                    <Input
                      defaultValue={item.notes || ''}
                      disabled={settled || savingItemId === item.id}
                      placeholder="Optional"
                      onBlur={(e) => {
                        if (e.target.value !== (item.notes || '')) {
                          void updateItem(item.id, { notes: e.target.value });
                        }
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!settled && (
          <div className="mt-4 flex flex-wrap gap-3">
            <FormField label="Inspection notes" htmlFor="inspectionNotes">
              <Textarea
                id="inspectionNotes"
                value={inspectionNotes}
                onChange={(e) => setInspectionNotes(e.target.value)}
                rows={2}
              />
            </FormField>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => void saveInspectionNotes()}>
                Save inspection
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">
            Refund worksheet (manual amounts)
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Enter return and deduction amounts yourself. Checklist totals are a
            guide only — finalize creates the REFUND expense automatically.
          </p>
        </CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField label="Actual move-out date" htmlFor="actualDate">
            <Input
              id="actualDate"
              type="date"
              value={actualMoveoutDate}
              disabled={settled}
              onChange={(e) => setActualMoveoutDate(e.target.value)}
            />
          </FormField>
          <FormField label="Deposit return" htmlFor="depositReturn">
            <Input
              id="depositReturn"
              type="number"
              min={0}
              step="0.01"
              value={depositReturn}
              disabled={settled}
              onChange={(e) => setDepositReturn(e.target.value)}
            />
          </FormField>
          <FormField label="Deposit deduction" htmlFor="depositDeduction">
            <Input
              id="depositDeduction"
              type="number"
              min={0}
              step="0.01"
              value={depositDeduction}
              disabled={settled}
              onChange={(e) => setDepositDeduction(e.target.value)}
            />
          </FormField>
          <FormField label="Advance return" htmlFor="advanceReturn">
            <Input
              id="advanceReturn"
              type="number"
              min={0}
              step="0.01"
              value={advanceReturn}
              disabled={settled}
              onChange={(e) => setAdvanceReturn(e.target.value)}
            />
          </FormField>
          <FormField label="Utility deposit return" htmlFor="utilityReturn">
            <Input
              id="utilityReturn"
              type="number"
              min={0}
              step="0.01"
              value={utilityReturn}
              disabled={settled}
              onChange={(e) => setUtilityReturn(e.target.value)}
            />
          </FormField>
          <FormField label="Deduction reason" htmlFor="deductionReason">
            <Input
              id="deductionReason"
              value={deductionReason}
              disabled={settled}
              placeholder="Auto-fills from failed checklist items if blank"
              onChange={(e) => setDeductionReason(e.target.value)}
            />
          </FormField>
        </div>
        {!settled ? (
          <div className="mt-6">
            <Button onClick={() => void finalize()} disabled={finalizing}>
              {finalizing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Finalize move-out &amp; refund
            </Button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-green-700 font-medium">
            Settlement completed
            {worksheet.settlement.depositReturnAmount != null
              ? ` — deposit returned ${formatPhp(worksheet.settlement.depositReturnAmount)}`
              : ''}
          </p>
        )}
      </Card>
    </div>
  );
}
