'use client';

import React, { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/forms/FormField';

interface ManualPaymentFormProps {
  onPaymentComplete?: () => void;
  onCancel?: () => void;
}

export default function ManualPaymentForm({
  onPaymentComplete,
  onCancel,
}: ManualPaymentFormProps) {
  const [paymentType, setPaymentType] = useState<string>('rent');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('online');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { showNotification } = useNotifications();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountValue = parseFloat(amount);
    if (!amount || amountValue <= 0) {
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please enter a valid payment amount',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/tenant/payments/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountValue,
          paymentType,
          paymentMethod,
          referenceNumber: referenceNumber || undefined,
          notes: notes || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showNotification({
          type: 'success',
          title: 'Payment Recorded',
          message: data.message || 'Your payment has been recorded successfully',
        });
        onPaymentComplete?.();
      } else {
        showNotification({
          type: 'error',
          title: 'Payment Failed',
          message: data.error || 'Failed to record payment',
        });
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      showNotification({
        type: 'error',
        title: 'Payment Failed',
        message: 'An error occurred while recording your payment',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(value);
  };

  const getPaymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      rent: 'Rent',
      deposit: 'Deposit',
      advance: 'Advance',
      utility: 'Utility',
      late_fee: 'Late Fee',
      other: 'Other',
    };
    return labels[type] || type;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-gray-900">
      <Alert variant="info">
        <strong>Note:</strong> Enter the payment amount you have paid. This will be recorded in
        your payment history.
      </Alert>

      <FormField label="Payment Type" htmlFor="paymentType" required>
        <Select
          id="paymentType"
          value={paymentType}
          onChange={(e) => setPaymentType(e.target.value)}
          required
        >
          <option value="rent">Rent</option>
          <option value="deposit">Deposit</option>
          <option value="advance">Advance</option>
          <option value="utility">Utility</option>
          <option value="late_fee">Late Fee</option>
          <option value="other">Other</option>
        </Select>
      </FormField>

      <FormField
        label="Payment Amount (₱)"
        htmlFor="amount"
        required
        hint={
          amount && parseFloat(amount) > 0
            ? `Amount: ${formatCurrency(parseFloat(amount))}`
            : undefined
        }
      >
        <Input
          type="number"
          id="amount"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          placeholder="0.00"
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
          <option value="cash">Cash</option>
          <option value="check">Check</option>
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

      {amount && parseFloat(amount) > 0 && (
        <Alert variant="info" title="Payment Summary">
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Payment Type:</span>
              <span className="font-medium">{getPaymentTypeLabel(paymentType)}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>
              <span className="font-medium">{formatCurrency(parseFloat(amount))}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Method:</span>
              <span className="font-medium capitalize">
                {paymentMethod.replace('_', ' ')}
              </span>
            </div>
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
          isDisabled={!amount || parseFloat(amount) <= 0}
          leftIcon={<CreditCard className="h-5 w-5" />}
        >
          Record Payment
        </Button>
      </div>
    </form>
  );
}
