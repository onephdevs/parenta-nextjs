'use client';

import React, { useState } from 'react';
import { DollarSign } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/forms/FormField';
import { cn } from '@/lib/utils';

interface DepositPaymentFormProps {
  onPaymentComplete?: () => void;
  onCancel?: () => void;
}

export default function DepositPaymentForm({
  onPaymentComplete,
  onCancel,
}: DepositPaymentFormProps) {
  const [paymentType, setPaymentType] = useState<'deposit' | 'advance'>('deposit');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('online');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { showNotification } = useNotifications();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountValue = parseFloat(amount);
    if (!amount || amountValue <= 0) {
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please enter a valid deposit amount',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/tenant/deposits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountValue,
          paymentType,
          paymentMethod,
          referenceNumber: referenceNumber || undefined,
          description:
            description || `${paymentType === 'deposit' ? 'Deposit' : 'Advance'} payment`,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showNotification({
          type: 'success',
          title: paymentType === 'deposit' ? 'Deposit Recorded' : 'Advance Recorded',
          message: data.message || `Your ${paymentType} payment has been recorded successfully`,
        });

        onPaymentComplete?.();
      } else {
        showNotification({
          type: 'error',
          title: 'Payment Failed',
          message: data.error || 'Failed to record deposit payment',
        });
      }
    } catch (error) {
      console.error('Error recording deposit payment:', error);
      showNotification({
        type: 'error',
        title: 'Payment Failed',
        message: 'An error occurred while recording your deposit payment',
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-gray-900">
      <Alert variant="info">
        <strong>Note:</strong> Deposits are held for security and refunded at move-out. Advances
        are applied to future rent payments.
      </Alert>

      <FormField label="Payment Type" htmlFor="paymentType-deposit" required>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setPaymentType('deposit')}
            className={cn(
              'p-4 border-2 rounded-lg flex items-center justify-center space-x-2',
              paymentType === 'deposit'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-gray-400'
            )}
          >
            <DollarSign
              className={cn(
                'h-5 w-5',
                paymentType === 'deposit' ? 'text-green-600' : 'text-gray-400'
              )}
            />
            <span className="font-medium">Deposit</span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentType('advance')}
            className={cn(
              'p-4 border-2 rounded-lg flex items-center justify-center space-x-2',
              paymentType === 'advance'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            )}
          >
            <DollarSign
              className={cn(
                'h-5 w-5',
                paymentType === 'advance' ? 'text-blue-600' : 'text-gray-400'
              )}
            />
            <span className="font-medium">Advance</span>
          </button>
        </div>
      </FormField>

      <FormField
        label="Amount (₱)"
        htmlFor="amount"
        required
        hint={
          amount && parseFloat(amount) > 0
            ? `You are paying: ${formatCurrency(parseFloat(amount))} as ${paymentType}`
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

      <FormField label="Description (Optional)" htmlFor="description">
        <Textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Additional notes about this deposit..."
        />
      </FormField>

      {amount && parseFloat(amount) > 0 && (
        <Alert
          variant={paymentType === 'deposit' ? 'success' : 'info'}
          title={`${paymentType === 'deposit' ? 'Deposit' : 'Advance'} Summary`}
        >
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Payment Type:</span>
              <span className="font-medium capitalize">{paymentType}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>
              <span className="font-medium">{formatCurrency(parseFloat(amount))}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Method:</span>
              <span className="font-medium capitalize">{paymentMethod.replace('_', ' ')}</span>
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
          leftIcon={<DollarSign className="h-5 w-5" />}
        >
          Record {paymentType === 'deposit' ? 'Deposit' : 'Advance'}
        </Button>
      </div>
    </form>
  );
}
