'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Copy, ImagePlus, Smartphone, Upload, X } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/forms/FormField';
import { useTenantTheme } from '@/hooks/useTenantTheme';
import { cn } from '@/lib/utils';
import type { TenantPaymentInstructions } from '@/lib/tenant-payment-instructions-shared';

interface Invoice {
  id: string;
  invoiceNumber: string;
  dueDate: string;
  balanceDue: number;
  totalAmount: number;
  status: string;
}

interface PaymentFormProps {
  invoices?: Invoice[];
  onPaymentComplete?: () => void;
  onCancel?: () => void;
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
}: PaymentFormProps) {
  const theme = useTenantTheme();
  const { showNotification } = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [instructions, setInstructions] = useState<
    (TenantPaymentInstructions & { configured?: boolean }) | null
  >(null);
  const [loadingInstructions, setLoadingInstructions] = useState(true);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>('gcash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
    if (invoices.length > 0 && !selectedInvoiceId) {
      setSelectedInvoiceId(invoices[0].id);
      setPaymentAmount(invoices[0].balanceDue);
    }
  }, [invoices, selectedInvoiceId]);

  useEffect(() => {
    if (!selectedInvoiceId) return;
    const invoice = invoices.find((inv) => inv.id === selectedInvoiceId);
    if (invoice) setPaymentAmount(invoice.balanceDue);
  }, [selectedInvoiceId, invoices]);

  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId);
  const maxAmount = selectedInvoice ? selectedInvoice.balanceDue : 0;
  const acceptedMethods = (instructions?.acceptedMethods?.length
    ? instructions.acceptedMethods
    : (['gcash', 'maya', 'bank_transfer'] as PayMethod[])) as PayMethod[];

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

  const handleFileSelect = (file: File) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      showNotification({
        type: 'error',
        title: 'Invalid file',
        message: 'Upload a JPEG, PNG, WEBP, or PDF screenshot of your receipt',
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showNotification({
        type: 'error',
        title: 'File too large',
        message: 'Receipt must be under 5MB',
      });
      return;
    }
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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

    if (!referenceNumber.trim()) {
      showNotification({
        type: 'error',
        title: 'Reference required',
        message: 'Enter the GCash / transfer reference number from your receipt',
      });
      return;
    }

    if (!selectedFile) {
      showNotification({
        type: 'error',
        title: 'Receipt required',
        message: 'Upload a screenshot of your payment transfer',
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
      if (notes.trim()) formData.append('notes', notes.trim());

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
      clearFile();
      setReferenceNumber('');
      setNotes('');
      onPaymentComplete?.();
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

      <FormField label="Select invoice to pay" htmlFor="invoiceId" required>
        <Select
          id="invoiceId"
          value={selectedInvoiceId}
          onChange={(e) => setSelectedInvoiceId(e.target.value)}
          required={invoices.length > 0}
          className={theme.input}
        >
          <option value="">
            {invoices.length === 0 ? 'No invoices due' : 'Select an invoice'}
          </option>
          {invoices.map((invoice) => (
            <option key={invoice.id} value={invoice.id}>
              {invoice.invoiceNumber} - {formatCurrency(invoice.balanceDue)} due{' '}
              {new Date(invoice.dueDate).toLocaleDateString()}
            </option>
          ))}
        </Select>
        {invoices.length === 0 && (
          <p className="mt-1 text-sm text-amber-700">
            No invoices with a balance due. Use Manual Entry or Upload receipt for other
            payments.
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
        label="Reference number"
        htmlFor="referenceNumber"
        required
        hint="From your GCash / bank transfer confirmation"
      >
        <Input
          id="referenceNumber"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          placeholder="e.g. 1234567890"
          className={theme.input}
          required
        />
      </FormField>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <label className={cn('text-sm font-medium', theme.listValue)}>
            Receipt screenshot <span className="text-red-500">*</span>
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={theme.outlineButton}
            leftIcon={<ImagePlus className="h-4 w-4" />}
            onClick={() => fileInputRef.current?.click()}
          >
            Choose image
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />

        {selectedFile ? (
          <div
            className={cn(
              'relative overflow-hidden rounded-xl border p-3',
              theme.divider
            )}
          >
            <button
              type="button"
              aria-label="Remove receipt"
              onClick={clearFile}
              className={cn('absolute right-2 top-2 z-10', theme.shellIconButton)}
            >
              <X className="h-4 w-4" />
            </button>
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Receipt preview"
                className="mx-auto max-h-56 rounded-lg object-contain"
              />
            ) : (
              <p className={cn('py-6 text-center text-sm', theme.muted)}>
                {selectedFile.name}
              </p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-10 text-sm transition',
              theme.mode === 'dark'
                ? 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:bg-zinc-900'
                : 'border-zinc-300 text-zinc-500 hover:border-zinc-400 hover:bg-zinc-50'
            )}
          >
            <Upload className="h-6 w-6" />
            Upload transfer screenshot
          </button>
        )}
      </div>

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
