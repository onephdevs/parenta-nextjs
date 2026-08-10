'use client';

import React, { useMemo, useState } from 'react';
import { Upload } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/forms/FormField';
import { useTenantTheme } from '@/hooks/useTenantTheme';
import { cn } from '@/lib/utils';
import { ReceiptImageField } from '@/components/features/tenant/ReceiptImageField';

export interface ReceiptLinkOption {
  /** Unique select value, e.g. payment:uuid | invoice:uuid | custom */
  value: string;
  label: string;
  kind: 'payment' | 'invoice' | 'custom';
  paymentId?: string;
  invoiceId?: string;
  defaultAmount?: number;
  defaultDate?: string;
}

interface ReceiptUploadPanelProps {
  options: ReceiptLinkOption[];
  onUploadComplete?: () => void;
  className?: string;
}

function toDateInputValue(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function ReceiptUploadPanel({
  options,
  onUploadComplete,
  className,
}: ReceiptUploadPanelProps) {
  const theme = useTenantTheme();
  const { showNotification } = useNotifications();

  const selectable = useMemo(
    () => [
      ...options,
      {
        value: 'custom',
        label: 'Other / custom payment date',
        kind: 'custom' as const,
      },
    ],
    [options]
  );

  const [linkValue, setLinkValue] = useState(selectable[0]?.value || 'custom');
  const selected =
    selectable.find((o) => o.value === linkValue) ||
    selectable[selectable.length - 1];

  const [paymentDate, setPaymentDate] = useState(
    toDateInputValue(selected?.defaultDate) ||
      new Date().toISOString().slice(0, 10)
  );
  const [amount, setAmount] = useState(
    selected?.defaultAmount != null && selected.defaultAmount > 0
      ? String(selected.defaultAmount)
      : ''
  );
  const [notes, setNotes] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleLinkChange = (value: string) => {
    setLinkValue(value);
    const next = selectable.find((o) => o.value === value);
    if (next?.defaultDate) setPaymentDate(toDateInputValue(next.defaultDate));
    if (next?.defaultAmount != null && next.defaultAmount > 0) {
      setAmount(String(next.defaultAmount));
    } else if (next?.kind === 'custom') {
      setAmount('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      showNotification({
        type: 'error',
        title: 'Missing image',
        message: 'Take a photo or choose a receipt image / PDF',
      });
      return;
    }

    if (!referenceNumber.trim()) {
      showNotification({
        type: 'error',
        title: 'Reference required',
        message: 'Enter the transaction / reference number from your receipt',
      });
      return;
    }

    const needsAmount = selected?.kind !== 'payment';
    const amountValue = parseFloat(amount);
    if (needsAmount && (!amount || amountValue <= 0)) {
      showNotification({
        type: 'error',
        title: 'Amount required',
        message: 'Enter the payment amount this receipt is for',
      });
      return;
    }

    if ((selected?.kind === 'custom' || selected?.kind === 'invoice') && !paymentDate) {
      showNotification({
        type: 'error',
        title: 'Date required',
        message: 'Select the payment date this receipt belongs to',
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('referenceNumber', referenceNumber.trim());
      if (selected?.kind === 'payment' && selected.paymentId) {
        formData.append('paymentId', selected.paymentId);
      } else if (selected?.kind === 'invoice' && selected.invoiceId) {
        formData.append('invoiceId', selected.invoiceId);
        formData.append('paymentDate', paymentDate);
        formData.append('amount', String(amountValue));
      } else {
        formData.append('paymentDate', paymentDate);
        formData.append('amount', String(amountValue));
      }
      if (notes.trim()) formData.append('notes', notes.trim());

      const response = await fetch('/api/tenant/payments/upload-receipt', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (!data.success) {
        showNotification({
          type: 'error',
          title: 'Upload failed',
          message: data.error || 'Could not upload receipt',
        });
        return;
      }

      showNotification({
        type: 'success',
        title: 'Receipt uploaded',
        message:
          'Submitted for verification. Balance updates after the office confirms the transaction ID.',
      });
      setSelectedFile(null);
      setNotes('');
      setReferenceNumber('');
      onUploadComplete?.();
    } catch (error) {
      console.error('Receipt upload error:', error);
      showNotification({
        type: 'error',
        title: 'Upload failed',
        message: 'An error occurred while uploading your receipt',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn(theme.formPanel, 'p-4 sm:p-6', className)}>
      <div className="mb-5">
        <h3 className="text-lg font-medium text-gray-900">Upload receipt</h3>
        <p className="mt-1 text-sm text-gray-500">
          Take a photo or choose a file, then link it to the payment it belongs to.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Link to payment date" htmlFor="receipt-link" required>
          <Select
            id="receipt-link"
            value={linkValue}
            onChange={(e) => handleLinkChange(e.target.value)}
          >
            {selectable.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Payment date" htmlFor="receipt-date" required>
          <Input
            id="receipt-date"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            disabled={selected?.kind === 'payment'}
          />
        </FormField>

        {(selected?.kind === 'invoice' || selected?.kind === 'custom') && (
          <FormField label="Amount (₱)" htmlFor="receipt-amount" required>
            <Input
              id="receipt-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </FormField>
        )}

        <FormField
          label="Reference / transaction number"
          htmlFor="receipt-reference"
          required
          hint="From your GCash, Maya, or bank transfer confirmation"
          className="sm:col-span-2"
        >
          <Input
            id="receipt-reference"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="e.g. 1234567890"
            required
          />
        </FormField>

        <FormField label="Notes (optional)" htmlFor="receipt-notes" className="sm:col-span-2">
          <Textarea
            id="receipt-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional details about this payment..."
          />
        </FormField>
      </div>

      <div className="mt-5">
        <ReceiptImageField
          file={selectedFile}
          onChange={setSelectedFile}
          disabled={isUploading}
        />
      </div>

      <div className="mt-5 flex justify-end">
        <Button
          type="submit"
          variant="success"
          isLoading={isUploading}
          disabled={isUploading || !selectedFile || !referenceNumber.trim()}
          leftIcon={<Upload className="h-4 w-4" />}
          className={theme.primaryButton}
        >
          Submit for verification
        </Button>
      </div>
    </form>
  );
}
