'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CalendarClock, Tag } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { DetailSection } from '@/components/ui/DetailSection';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/forms/FormField';
import { FormErrorBanner } from '@/components/forms/FormErrorBanner';

interface InvoiceNegotiationPanelProps {
  invoiceId: string;
  /** Original scheduled due date YYYY-MM-DD */
  dueDate: string | null;
  negotiatedDueDate?: string | null;
  negotiatedDueReason?: string | null;
  adjustmentAmount?: number | null;
  adjustmentReason?: string | null;
  balanceDue: number;
  /** When paid/cancelled, hide mutate forms */
  canEdit: boolean;
}

function toInputDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

export function InvoiceNegotiationPanel({
  invoiceId,
  dueDate,
  negotiatedDueDate,
  negotiatedDueReason,
  adjustmentAmount,
  adjustmentReason,
  balanceDue,
  canEdit,
}: InvoiceNegotiationPanelProps) {
  const router = useRouter();
  const [dueValue, setDueValue] = useState(
    toInputDate(negotiatedDueDate) || toInputDate(dueDate)
  );
  const [dueReason, setDueReason] = useState(negotiatedDueReason || '');
  const [discountValue, setDiscountValue] = useState(
    adjustmentAmount != null && Number(adjustmentAmount) > 0
      ? String(adjustmentAmount)
      : ''
  );
  const [discountReason, setDiscountReason] = useState(adjustmentReason || '');
  const [savingDue, setSavingDue] = useState(false);
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function saveNegotiation(body: Record<string, unknown>) {
    const res = await fetch(`/api/invoices/${invoiceId}/negotiate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok || json.success === false) {
      throw new Error(json.error || 'Failed to update invoice');
    }
    return json;
  }

  async function handleSaveDue(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!dueValue) {
      setError('Choose the new agreed deadline');
      return;
    }
    if (!dueReason.trim()) {
      setError('Explain why the deadline was moved (e.g. salary timing)');
      return;
    }
    setSavingDue(true);
    try {
      await saveNegotiation({
        negotiatedDueDate: dueValue,
        reason: dueReason.trim(),
      });
      setSuccess('New deadline saved');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save deadline');
    } finally {
      setSavingDue(false);
    }
  }

  async function handleSaveDiscount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const amount = Number(discountValue);
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Enter a valid discount amount (₱0 or more)');
      return;
    }
    if (!discountReason.trim()) {
      setError('Explain the discount (e.g. collecting rent / cleaning common areas)');
      return;
    }
    if (amount > balanceDue + Number(adjustmentAmount || 0) + 0.01) {
      setError('Discount cannot exceed the amount still owed');
      return;
    }
    setSavingDiscount(true);
    try {
      await saveNegotiation({
        adjustmentAmount: amount,
        adjustmentReason: discountReason.trim(),
      });
      setSuccess(
        amount > 0
          ? `Discount of ₱${amount.toLocaleString('en-PH')} applied`
          : 'Discount cleared'
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save discount');
    } finally {
      setSavingDiscount(false);
    }
  }

  if (!canEdit) {
    return (
      <DetailSection title="Billing agreements">
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <p className="text-sm text-gray-600">
            This invoice is paid or cancelled — deadline and discount changes are locked.
          </p>
          {(negotiatedDueDate || (adjustmentAmount != null && Number(adjustmentAmount) > 0)) && (
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              {negotiatedDueDate && (
                <p>
                  Agreed deadline: <strong>{toInputDate(negotiatedDueDate)}</strong>
                  {negotiatedDueReason ? ` — ${negotiatedDueReason}` : ''}
                </p>
              )}
              {adjustmentAmount != null && Number(adjustmentAmount) > 0 && (
                <p>
                  Discount: <strong>₱{Number(adjustmentAmount).toLocaleString('en-PH')}</strong>
                  {adjustmentReason ? ` — ${adjustmentReason}` : ''}
                </p>
              )}
            </div>
          )}
        </div>
      </DetailSection>
    );
  }

  return (
    <DetailSection
      title="Billing agreements"
      description="No late-fee penalties — agree a new deadline when rent is delayed, or apply a discretionary discount."
    >
      <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
        {error && <FormErrorBanner message={error} className="mb-3" />}
        {success && (
          <Alert variant="success" className="mb-3" onDismiss={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <form onSubmit={handleSaveDue} className="space-y-3 border-b border-gray-100 pb-5">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
            <CalendarClock className="h-4 w-4" />
            Negotiate due date
          </div>
          {dueDate && (
            <p className="text-xs text-gray-500">
              Original due date: {toInputDate(dueDate)}
              {negotiatedDueDate
                ? ` · Current agreed: ${toInputDate(negotiatedDueDate)}`
                : ''}
            </p>
          )}
          <FormField label="New agreed deadline" htmlFor="nego-due" required>
            <Input
              id="nego-due"
              type="date"
              required
              value={dueValue}
              onChange={(e) => setDueValue(e.target.value)}
            />
          </FormField>
          <FormField
            label="Reason"
            htmlFor="nego-reason"
            required
            hint="e.g. Salary arrives on the 15th — agreed to pay then"
          >
            <Textarea
              id="nego-reason"
              required
              rows={2}
              value={dueReason}
              onChange={(e) => setDueReason(e.target.value)}
              placeholder="Tenant explanation / agreed reason"
            />
          </FormField>
          <Button type="submit" size="sm" isLoading={savingDue} disabled={savingDiscount}>
            Save deadline
          </Button>
        </form>

        <form onSubmit={handleSaveDiscount} className="mt-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
            <Tag className="h-4 w-4" />
            Discretionary discount
          </div>
          <FormField
            label="Discount amount (₱)"
            htmlFor="nego-discount"
            hint="Example: ₱1,800 for collecting rent and cleaning common areas. Set 0 to clear."
          >
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-gray-500">
                ₱
              </span>
              <Input
                id="nego-discount"
                type="number"
                min={0}
                step="0.01"
                className="pl-8"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </FormField>
          <FormField label="Discount reason" htmlFor="nego-discount-reason" required>
            <Textarea
              id="nego-discount-reason"
              required
              rows={2}
              value={discountReason}
              onChange={(e) => setDiscountReason(e.target.value)}
              placeholder="Why this discount was given"
            />
          </FormField>
          <Button
            type="submit"
            size="sm"
            variant="outline"
            isLoading={savingDiscount}
            disabled={savingDue}
          >
            Apply discount
          </Button>
        </form>
      </div>
    </DetailSection>
  );
}
