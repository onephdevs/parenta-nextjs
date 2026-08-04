'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Upload, X, FileText, ImagePlus } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { FormField } from '@/components/forms/FormField';
import { useTenantTheme } from '@/hooks/useTenantTheme';
import { cn } from '@/lib/utils';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectable = useMemo(
    () => [...options, { value: 'custom', label: 'Other / custom payment date', kind: 'custom' as const }],
    [options]
  );

  const [linkValue, setLinkValue] = useState(selectable[0]?.value || 'custom');
  const selected = selectable.find((o) => o.value === linkValue) || selectable[selectable.length - 1];

  const [paymentDate, setPaymentDate] = useState(
    toDateInputValue(selected?.defaultDate) || new Date().toISOString().slice(0, 10)
  );
  const [amount, setAmount] = useState(
    selected?.defaultAmount != null && selected.defaultAmount > 0
      ? String(selected.defaultAmount)
      : ''
  );
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
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

  const handleFileSelect = (file: File) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      showNotification({
        type: 'error',
        title: 'Invalid file',
        message: 'Please upload a PDF, JPEG, PNG, or WEBP file',
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showNotification({
        type: 'error',
        title: 'File too large',
        message: 'File size must be less than 5MB',
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
    if (!selectedFile) {
      showNotification({
        type: 'error',
        title: 'Missing image',
        message: 'Choose a receipt image or PDF to upload',
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
        message: 'Your receipt was linked to the selected payment date',
      });
      clearFile();
      setNotes('');
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
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Upload receipt</h3>
          <p className="mt-1 text-sm text-gray-500">
            Attach a photo or PDF and link it to the payment date it belongs to.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          leftIcon={<ImagePlus className="h-4 w-4" />}
          onClick={() => fileInputRef.current?.click()}
        >
          Choose image
        </Button>
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
          label="Notes (optional)"
          htmlFor="receipt-notes"
          className={selected?.kind === 'payment' ? 'sm:col-span-2' : undefined}
        >
          <Textarea
            id="receipt-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Bank transfer reference, remittance details, etc."
          />
        </FormField>
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

      <div
        className={cn(
          'mt-5 rounded-lg border-2 border-dashed p-6 text-center transition',
          selectedFile ? 'border-emerald-300 bg-emerald-50/40' : 'border-gray-300 bg-gray-50'
        )}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) handleFileSelect(file);
        }}
      >
        {selectedFile ? (
          <div className="space-y-3">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Receipt preview"
                className="mx-auto max-h-48 rounded-md object-contain"
              />
            ) : (
              <FileText className="mx-auto h-10 w-10 text-gray-400" />
            )}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
              <span className="truncate max-w-xs">{selectedFile.name}</span>
              <button
                type="button"
                aria-label="Remove file"
                onClick={clearFile}
                className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mx-auto flex flex-col items-center gap-2 text-sm text-gray-600"
          >
            <Upload className="h-8 w-8 text-gray-400" />
            <span>Drop receipt here or click to browse</span>
            <span className="text-xs text-gray-400">PDF, JPEG, PNG, WEBP · max 5MB</span>
          </button>
        )}
      </div>

      <div className="mt-5 flex justify-end">
        <Button
          type="submit"
          variant="success"
          isLoading={isUploading}
          disabled={isUploading || !selectedFile}
          leftIcon={<Upload className="h-4 w-4" />}
          className={theme.primaryButton}
        >
          Upload & link receipt
        </Button>
      </div>
    </form>
  );
}
