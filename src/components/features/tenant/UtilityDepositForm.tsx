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
        message: 'Please enter a valid utility deposit amount',
      });
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/tenant/utility-deposits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountValue,
          utilityType,
          paymentMethod,
          referenceNumber: referenceNumber || undefined,
          description: description || `${utilityType} utility deposit payment`,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showNotification({
          type: 'success',
          title: 'Utility Deposit Recorded',
          message: data.message || 'Your utility deposit has been recorded successfully',
        });

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
        <strong>Note:</strong> Utility deposits are used to cover electric and water bills. The
        deposit amount is added to your utility deposit balance.
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
          placeholder={`Additional notes about this ${utilityType} deposit...`}
        />
      </FormField>

      {amount && parseFloat(amount) > 0 && (
        <Alert variant="info" title="Deposit Summary">
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Utility Type:</span>
              <span className="font-medium capitalize">{utilityType}</span>
            </div>
            <div className="flex justify-between">
              <span>Deposit Amount:</span>
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
          leftIcon={
            utilityType === 'electricity' ? (
              <Zap className="h-5 w-5" />
            ) : (
              <Droplet className="h-5 w-5" />
            )
          }
        >
          Record {utilityType === 'electricity' ? 'Electric' : 'Water'} Deposit
        </Button>
      </div>
    </form>
  );
}
