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
import { PAYMENT_METHOD_SELECT_OPTIONS } from '@/lib/constants/payment-methods';
import { ReceiptImageField } from '@/components/features/tenant/ReceiptImageField';
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
  const [paymentMethod, setPaymentMethod] = useState<string>('gcash');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

    if (!referenceNumber.trim()) {
      showNotification({
        type: 'error',
        title: 'Reference required',
        message: 'Enter the transaction / reference number from your receipt',
      });
      return;
    }

    if (!selectedFile) {
      showNotification({
        type: 'error',
        title: 'Receipt required',
        message: 'Take a photo or choose a screenshot of your payment receipt',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('amount', String(amountValue));
      formData.append('paymentType', paymentType);
      formData.append('paymentMethod', paymentMethod);
      formData.append('referenceNumber', referenceNumber.trim());
      formData.append(
        'notes',
        description.trim() ||
          `${paymentType === 'deposit' ? 'Deposit' : 'Advance'} payment`
      );

      const response = await fetch('/api/tenant/payments/manual', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        showNotification({
          type: 'success',
          title: 'Payment submitted',
          message:
            data.message ||
            'Receipt uploaded. Balance updates after the office verifies the transaction ID.',
        });
        setSelectedFile(null);
        setReferenceNumber('');
        setDescription('');
        setAmount('');
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
        <strong>Note:</strong> Attach your receipt and transaction ID. The office confirms
        before deposit/advance balances update.
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
          {PAYMENT_METHOD_SELECT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        label="Reference / transaction number"
        htmlFor="referenceNumber"
        required
      >
        <Input
          type="text"
          id="referenceNumber"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          placeholder="e.g. 1234567890"
          required
        />
      </FormField>

      <ReceiptImageField
        file={selectedFile}
        onChange={setSelectedFile}
        disabled={isProcessing}
      />

      <FormField label="Description (Optional)" htmlFor="description">
        <Textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Additional notes about this deposit..."
        />
      </FormField>

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
          isDisabled={
            !amount ||
            parseFloat(amount) <= 0 ||
            !selectedFile ||
            !referenceNumber.trim()
          }
          leftIcon={<DollarSign className="h-5 w-5" />}
        >
          Submit {paymentType === 'deposit' ? 'Deposit' : 'Advance'}
        </Button>
      </div>
    </form>
  );
}
