'use client';

import React, { useEffect, useState } from 'react';
import { Copy, Smartphone } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/forms/FormField';
import { useTenantTheme } from '@/hooks/useTenantTheme';
import { cn } from '@/lib/utils';
import type { TenantPaymentInstructions } from '@/lib/tenant-payment-instructions-shared';
import { DEFAULT_TENANT_PAYMENT_INSTRUCTIONS } from '@/lib/tenant-payment-instructions-shared';
import { ReceiptImageField } from '@/components/features/tenant/ReceiptImageField';

interface Invoice {
  id: string;
  invoiceNumber: string;
  dueDate: string;
  balanceDue: number;
  totalAmount: number;
  status: string;
  periodLabel?: string;
  payAhead?: boolean;
}

interface PaymentFormProps {
  invoices?: Invoice[];
  onPaymentComplete?: (result?: { paymentId?: string }) => void;
  onCancel?: () => void;
  /** Prefill which invoice to pay */
  initialInvoiceId?: string;
  /** Prefill amount (use with full pay). Omit / 0 for partial entry. */
  initialAmount?: number;
  /** When true, do not auto-fill full balance — tenant enters a partial amount */
  preferPartial?: boolean;
}

type PayMethod = TenantPaymentInstructions['acceptedMethods'][number];

const METHOD_LABELS: Record<PayMethod, string> = {
  gcash: 'GCash',
  maya: 'Maya',
  bank_transfer: 'Bank transfer',
  other: 'Other e-wallet / transfer',
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

export default function PaymentForm({
  invoices = [],
  onPaymentComplete,
  onCancel,
  initialInvoiceId,
  initialAmount,
  preferPartial = false,
}: PaymentFormProps) {
  const theme = useTenantTheme();
  const { showNotification } = useNotifications();

  const [instructions, setInstructions] = useState<
    (TenantPaymentInstructions & { configured?: boolean }) | null
  >(null);
  const [loadingInstructions, setLoadingInstructions] = useState(true);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState(initialInvoiceId || '');
  const [paymentAmount, setPaymentAmount] = useState(
    preferPartial ? initialAmount ?? 0 : initialAmount ?? 0
  );
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>('gcash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userEditedAmount, setUserEditedAmount] = useState(preferPartial);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/tenant/payment-instructions');
        const data = await res.json();
        if (cancelled) return;
        if (data.success && data.data) {
          setInstructions(data.data);
          const methods = (data.data.acceptedMethods || []) as PayMethod[];
          if (methods.length > 0) setPaymentMethod(methods[0]);
        } else {
          setInstructions(null);
        }
      } catch {
        if (!cancelled) setInstructions(null);
      } finally {
        if (!cancelled) setLoadingInstructions(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (invoices.length === 0) return;
    if (!selectedInvoiceId) {
      const preferred =
        (initialInvoiceId && invoices.find((i) => i.id === initialInvoiceId)) || invoices[0];
      setSelectedInvoiceId(preferred.id);
      if (!preferPartial && !userEditedAmount) {
        setPaymentAmount(
          typeof initialAmount === 'number' && initialAmount > 0
            ? Math.min(initialAmount, preferred.balanceDue)
            : preferred.balanceDue
        );
      } else if (preferPartial && typeof initialAmount === 'number' && initialAmount > 0) {
        setPaymentAmount(Math.min(initialAmount, preferred.balanceDue));
      }
    }
  }, [invoices, selectedInvoiceId, initialInvoiceId, initialAmount, preferPartial, userEditedAmount]);

  useEffect(() => {
    if (!selectedInvoiceId || userEditedAmount || preferPartial) return;
    const invoice = invoices.find((inv) => inv.id === selectedInvoiceId);
    if (invoice) setPaymentAmount(invoice.balanceDue);
  }, [selectedInvoiceId, invoices, userEditedAmount, preferPartial]);

  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId);
  const maxAmount = selectedInvoice ? selectedInvoice.balanceDue : 0;
  const acceptedMethods = (instructions?.acceptedMethods?.length
    ? instructions.acceptedMethods
    : DEFAULT_TENANT_PAYMENT_INSTRUCTIONS.acceptedMethods) as PayMethod[];

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showNotification({
        type: 'success',
        title: 'Copied',
        message: `${label} copied to clipboard`,
      });
    } catch {
      showNotification({
        type: 'error',
        title: 'Copy failed',
        message: 'Could not copy to clipboard',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInvoiceId || paymentAmount <= 0) {
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Select an invoice and enter a valid amount',
      });
      return;
    }

    if (!selectedFile) {
      showNotification({
        type: 'error',
        title: 'Receipt required',
        message: 'Take a photo or choose a screenshot of your payment transfer',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('invoiceId', selectedInvoiceId);
      formData.append('amount', String(paymentAmount));
      formData.append('paymentMethod', paymentMethod);
      formData.append('referenceNumber', referenceNumber.trim());
      formData.append('paymentDate', new Date().toISOString().slice(0, 10));
      const noteParts = [
        notes.trim() || null,
        selectedInvoice?.payAhead ? 'Pay ahead' : null,
      ].filter(Boolean);
      if (noteParts.length > 0) formData.append('notes', noteParts.join('\n'));

      const response = await fetch('/api/tenant/payments/upload-receipt', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (!data.success) {
        showNotification({
          type: 'error',
          title: 'Payment Failed',
          message: data.error || 'Failed to submit payment',
        });
        return;
      }

      showNotification({
        type: 'success',
        title: 'Payment submitted',
        message:
          'Receipt uploaded. Your balance updates after the office verifies the transfer.',
      });
      setSelectedFile(null);
      setReferenceNumber('');
      setNotes('');
      onPaymentComplete?.({ paymentId: data.data?.paymentId });
    } catch (error) {
      console.error('Error submitting payment:', error);
      showNotification({
        type: 'error',
        title: 'Payment Failed',
        message: 'An error occurred while submitting your payment',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div
        className={cn(
          'rounded-xl border p-4 sm:p-5',
          theme.mode === 'dark' ? 'border-zinc-700 bg-zinc-950/60' : 'border-emerald-200 bg-emerald-50/60'
        )}
      >
        <div className="mb-3 flex items-center gap-2">
          <Smartphone className={cn('h-5 w-5', theme.iconMoney)} strokeWidth={1.75} />
          <h4 className={theme.sectionTitle}>Send payment here</h4>
        </div>

        {loadingInstructions ? (
          <p className={theme.muted}>Loading payment details…</p>
        ) : instructions?.phone ? (
          <div className="space-y-3">
            {instructions.notes && <p className={theme.body}>{instructions.notes}</p>}

            <div className="flex flex-wrap items-center gap-2">
              <span className={theme.label}>Mobile / GCash number</span>
              <span className={cn('text-xl font-semibold tracking-wide', theme.shellHeader)}>
                {instructions.phone}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={theme.outlineButton}
                leftIcon={<Copy className="h-3.5 w-3.5" />}
                onClick={() => handleCopy(instructions.phone, 'Phone number')}
              >
                Copy
              </Button>
            </div>

            {instructions.accountName && (
              <p className={theme.body}>
                Account name:{' '}
                <span className={theme.listValue}>{instructions.accountName}</span>
              </p>
            )}

            {(instructions.bankName || instructions.bankAccountNumber) && (
              <div className={theme.body}>
                {instructions.bankName && <p>Bank: {instructions.bankName}</p>}
                {instructions.bankAccountNumber && (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span>Account: {instructions.bankAccountNumber}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={theme.outlineButton}
                      leftIcon={<Copy className="h-3.5 w-3.5" />}
                      onClick={() =>
                        handleCopy(instructions.bankAccountNumber, 'Account number')
                      }
                    >
                      Copy
                    </Button>
                  </div>
                )}
              </div>
            )}

            <p className={theme.subtle}>
              Accepted: {acceptedMethods.map((m) => METHOD_LABELS[m]).join(' · ')}
            </p>
          </div>
        ) : (
          <p className={theme.muted}>
            Payment number is not configured yet. Please contact the office, or use Upload
            receipt after you transfer.
          </p>
        )}
      </div>

      <FormField
        label="Select invoice to pay"
        htmlFor="invoiceId"
        required
        hint={
          selectedInvoice?.payAhead
            ? 'This bill is not due yet. Paying now is paying ahead.'
            : undefined
        }
      >
        <Select
          id="invoiceId"
          value={selectedInvoiceId}
          onChange={(e) => setSelectedInvoiceId(e.target.value)}
          required={invoices.length > 0}
          className={theme.input}
        >
          <option value="">
            {invoices.length === 0 ? 'No invoices available' : 'Select an invoice'}
          </option>
          {invoices.some((invoice) => !invoice.payAhead) && (
            <optgroup label="Due now">
              {invoices
                .filter((invoice) => !invoice.payAhead)
                .map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.periodLabel ? `${invoice.periodLabel} · ` : ''}
                    {formatCurrency(invoice.balanceDue)} due{' '}
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </option>
                ))}
            </optgroup>
          )}
          {invoices.some((invoice) => invoice.payAhead) && (
            <optgroup label="Pay ahead">
              {invoices
                .filter((invoice) => invoice.payAhead)
                .map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.periodLabel ? `${invoice.periodLabel} · ` : ''}
                    {formatCurrency(invoice.balanceDue)} due{' '}
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </option>
                ))}
            </optgroup>
          )}
        </Select>
        {invoices.length === 0 && (
          <p className="mt-1 text-sm text-amber-700">
            No invoices are available to pay right now.
          </p>
        )}
      </FormField>

      <FormField
        label="Payment amount (₱)"
        htmlFor="paymentAmount"
        required
        hint={
          selectedInvoice
            ? `Balance due: ${formatCurrency(selectedInvoice.balanceDue)}`
            : undefined
        }
      >
        <Input
          type="number"
          id="paymentAmount"
          min={0}
          max={maxAmount || undefined}
          step="0.01"
          value={paymentAmount === 0 || Number.isNaN(paymentAmount) ? '' : paymentAmount}
          onChange={(e) => {
            const v = e.target.value;
            setUserEditedAmount(true);
            setPaymentAmount(v === '' ? 0 : parseFloat(v) || 0);
          }}
          placeholder="0"
          className={theme.input}
        />
      </FormField>

      <FormField label="How did you pay?" htmlFor="paymentMethod" required>
        <Select
          id="paymentMethod"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PayMethod)}
          required
          className={theme.input}
        >
          {acceptedMethods.map((method) => (
            <option key={method} value={method}>
              {METHOD_LABELS[method]}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        label="GCash / bank reference"
        htmlFor="referenceNumber"
        hint="Optional for now. You can add it later when we start matching receipts."
      >
        <Input
          id="referenceNumber"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          placeholder="Optional"
          className={theme.input}
        />
      </FormField>

      <ReceiptImageField
        file={selectedFile}
        onChange={setSelectedFile}
        disabled={isProcessing}
        className="text-gray-900"
      />

      <FormField label="Notes (optional)" htmlFor="notes">
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Anything the office should know"
          className={theme.input}
        />
      </FormField>

      <div className="flex flex-wrap justify-end gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className={theme.outlineButton}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          isLoading={isProcessing}
          className={theme.primaryButton}
          disabled={invoices.length === 0}
        >
          {isProcessing ? 'Submitting…' : 'Submit payment + receipt'}
        </Button>
      </div>
    </form>
  );
}
