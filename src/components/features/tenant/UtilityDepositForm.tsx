'use client';

import React, { useState } from 'react';
import { Zap, Droplet } from 'lucide-react';
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

interface UtilityDepositFormProps {
  onPaymentComplete?: () => void;
  onCancel?: () => void;
}

export default function UtilityDepositForm({
  onPaymentComplete,
  onCancel,
}: UtilityDepositFormProps) {
  const [utilityType, setUtilityType] = useState<string>('electricity');
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
        message: 'Please enter a valid utility deposit amount',
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
      formData.append('paymentType', 'utility');
      formData.append('paymentMethod', paymentMethod);
      formData.append('referenceNumber', referenceNumber.trim());
      formData.append(
        'notes',
        description.trim() || `${utilityType} utility deposit payment`
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
            'Receipt uploaded. Balance updates after the office confirms it.',
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
          message: data.error || 'Failed to record utility deposit',
        });
      }
    } catch (error) {
      console.error('Error recording utility deposit:', error);
      showNotification({
        type: 'error',
        title: 'Payment Failed',
        message: 'An error occurred while recording your utility deposit',
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
      <Alert variant="warning">
        <strong>Note:</strong> Attach your receipt. A transaction ID is optional for now.
        The office confirms before your utility deposit balance updates.
      </Alert>

      <FormField label="Utility Type" htmlFor="utilityType-electricity" required>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setUtilityType('electricity')}
            className={cn(
              'p-4 border-2 rounded-lg flex items-center justify-center space-x-2',
              utilityType === 'electricity'
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-300 hover:border-gray-400'
            )}
          >
            <Zap
              className={cn(
                'h-5 w-5',
                utilityType === 'electricity' ? 'text-orange-600' : 'text-gray-400'
              )}
            />
            <span className="font-medium">Electricity</span>
          </button>
          <button
            type="button"
            onClick={() => setUtilityType('water')}
            className={cn(
              'p-4 border-2 rounded-lg flex items-center justify-center space-x-2',
              utilityType === 'water'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            )}
          >
            <Droplet
              className={cn(
                'h-5 w-5',
                utilityType === 'water' ? 'text-blue-600' : 'text-gray-400'
              )}
            />
            <span className="font-medium">Water</span>
          </button>
        </div>
      </FormField>

      <FormField
        label={`${utilityType === 'electricity' ? 'Electric' : 'Water'} Deposit Amount (₱)`}
        htmlFor="amount"
        required
        hint={
          amount && parseFloat(amount) > 0
            ? `You are depositing: ${formatCurrency(parseFloat(amount))} for ${utilityType}`
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
        hint="Optional for now"
      >
        <Input
          type="text"
          id="referenceNumber"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          placeholder="Optional"
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
          placeholder={`Additional notes about this ${utilityType} deposit...`}
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
            !selectedFile
          }
          leftIcon={
            utilityType === 'electricity' ? (
              <Zap className="h-5 w-5" />
            ) : (
              <Droplet className="h-5 w-5" />
            )
          }
        >
          Submit {utilityType === 'electricity' ? 'Electric' : 'Water'} Deposit
        </Button>
      </div>
    </form>
  );
}
