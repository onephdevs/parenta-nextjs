'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/forms/FormField';

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

export default function PaymentForm({
  invoices = [],
  onPaymentComplete,
  onCancel,
}: PaymentFormProps) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('online');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { showNotification } = useNotifications();

  useEffect(() => {
    if (invoices.length > 0 && !selectedInvoiceId) {
      const firstInvoice = invoices[0];
      setSelectedInvoiceId(firstInvoice.id);
      setPaymentAmount(firstInvoice.balanceDue);
    }
  }, [invoices, selectedInvoiceId]);

  useEffect(() => {
    if (selectedInvoiceId) {
      const invoice = invoices.find((inv) => inv.id === selectedInvoiceId);
      if (invoice) {
        setPaymentAmount(invoice.balanceDue);
      }
    }
  }, [selectedInvoiceId, invoices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInvoiceId || paymentAmount <= 0) {
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select an invoice and enter a valid amount',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/tenant/payments/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: selectedInvoiceId,
          amount: paymentAmount,
          paymentMethod,
          referenceNumber: referenceNumber || undefined,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showNotification({
          type: 'success',
          title: 'Payment Initiated',
          message: data.message || 'Your payment has been processed successfully',
        });

        onPaymentComplete?.();
      } else {
        showNotification({
          type: 'error',
          title: 'Payment Failed',
          message: data.error || 'Failed to process payment',
        });
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      showNotification({
        type: 'error',
        title: 'Payment Failed',
        message: 'An error occurred while processing your payment',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId);
  const maxAmount = selectedInvoice ? selectedInvoice.balanceDue : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-gray-900">
      <FormField label="Select Invoice to Pay" htmlFor="invoiceId" required>
        <Select
          id="invoiceId"
          value={selectedInvoiceId}
          onChange={(e) => setSelectedInvoiceId(e.target.value)}
          required={invoices.length > 0}
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
            You have no invoices with a balance due. Use the &quot;Manual Entry&quot; tab to record
            a payment without an invoice.
          </p>
        )}
      </FormField>

      <FormField
        label="Payment Amount (₱)"
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
          max={maxAmount}
          step="0.01"
          value={paymentAmount === 0 || Number.isNaN(paymentAmount) ? '' : paymentAmount}
          onChange={(e) => {
            const v = e.target.value;
            setPaymentAmount(v === '' ? 0 : parseFloat(v) || 0);
          }}
          placeholder="0"
        />
      </FormField>

      <FormField label="Payment Method" htmlFor="paymentMethod" required>
        <Select
          id="paymentMethod"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          required
        >
          <option value="online">Online Payment</option>
          <option value="credit_card">Credit Card</option>
          <option value="bank_transfer">Bank Transfer</option>
        </Select>
      </FormField>

      <FormField label="Reference Number (Optional)" htmlFor="referenceNumber">
        <Input
          type="text"
          id="referenceNumber"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          placeholder="Transaction reference, receipt number, etc."
        />
      </FormField>

      <FormField label="Notes (Optional)" htmlFor="notes">
        <Textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes about this payment..."
        />
      </FormField>

      {selectedInvoice && (
        <Alert variant="info" title="Payment Summary">
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Invoice:</span>
              <span className="font-medium">{selectedInvoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount to Pay:</span>
              <span className="font-medium">{formatCurrency(paymentAmount)}</span>
            </div>
            {paymentAmount < selectedInvoice.balanceDue && (
              <div className="flex justify-between text-orange-700">
                <span>Remaining Balance:</span>
                <span className="font-medium">
                  {formatCurrency(selectedInvoice.balanceDue - paymentAmount)}
                </span>
              </div>
            )}
          </div>
        </Alert>
      )}

      <div className="flex items-center justify-end space-x-3">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="success"
          isLoading={isProcessing}
          isDisabled={!selectedInvoiceId || paymentAmount <= 0}
          leftIcon={<CreditCard className="h-5 w-5" />}
        >
          Process Payment
        </Button>
      </div>
    </form>
  );
}
