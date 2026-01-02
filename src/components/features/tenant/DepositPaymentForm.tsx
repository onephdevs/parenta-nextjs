'use client';

import React, { useState } from 'react';
import { DollarSign, Loader2, CheckCircle2 } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';

interface DepositPaymentFormProps {
  onPaymentComplete?: () => void;
  onCancel?: () => void;
}

export default function DepositPaymentForm({ onPaymentComplete, onCancel }: DepositPaymentFormProps) {
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
          description: description || `${paymentType === 'deposit' ? 'Deposit' : 'Advance'} payment`,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showNotification({
          type: 'success',
          title: paymentType === 'deposit' ? 'Deposit Recorded' : 'Advance Recorded',
          message: data.message || `Your ${paymentType} payment has been recorded successfully`,
        });

        if (onPaymentComplete) {
          onPaymentComplete();
        }
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-gray-900">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Deposits are held for security and refunded at move-out. Advances are applied to future rent payments.
        </p>
      </div>

      {/* Payment Type Selection */}
      <div>
        <label htmlFor="paymentType" className="block text-sm font-medium text-gray-900 mb-2">
          Payment Type *
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setPaymentType('deposit')}
            className={`p-4 border-2 rounded-lg flex items-center justify-center space-x-2 ${
              paymentType === 'deposit'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <DollarSign className={`h-5 w-5 ${paymentType === 'deposit' ? 'text-green-600' : 'text-gray-400'}`} />
            <span className="font-medium">Deposit</span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentType('advance')}
            className={`p-4 border-2 rounded-lg flex items-center justify-center space-x-2 ${
              paymentType === 'advance'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <DollarSign className={`h-5 w-5 ${paymentType === 'advance' ? 'text-blue-600' : 'text-gray-400'}`} />
            <span className="font-medium">Advance</span>
          </button>
        </div>
      </div>

      {/* Payment Amount */}
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-900 mb-2">
          Amount (₱) *
        </label>
        <input
          type="number"
          id="amount"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          placeholder="0.00"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {amount && parseFloat(amount) > 0 && (
          <p className="mt-1 text-sm text-gray-600">
            You are paying: {formatCurrency(parseFloat(amount))} as {paymentType}
          </p>
        )}
      </div>

      {/* Payment Method */}
      <div>
        <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-900 mb-2">
          Payment Method *
        </label>
        <select
          id="paymentMethod"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="online">Online Payment</option>
          <option value="credit_card">Credit Card</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cash">Cash</option>
          <option value="check">Check</option>
        </select>
      </div>

      {/* Reference Number */}
      <div>
        <label htmlFor="referenceNumber" className="block text-sm font-medium text-gray-900 mb-2">
          Reference Number (Optional)
        </label>
        <input
          type="text"
          id="referenceNumber"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          placeholder="Transaction reference, receipt number, etc."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-2">
          Description (Optional)
        </label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Additional notes about this deposit..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Payment Summary */}
      {amount && parseFloat(amount) > 0 && (
        <div className={`${paymentType === 'deposit' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4`}>
          <h4 className={`text-sm font-medium ${paymentType === 'deposit' ? 'text-green-900' : 'text-blue-900'} mb-2`}>
            {paymentType === 'deposit' ? 'Deposit' : 'Advance'} Summary
          </h4>
          <div className={`space-y-1 text-sm ${paymentType === 'deposit' ? 'text-green-800' : 'text-blue-800'}`}>
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
        </div>
      )}

      {/* Submit Buttons */}
      <div className="flex items-center justify-end space-x-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-900 hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isProcessing || !amount || parseFloat(amount) <= 0}
          className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white ${
            paymentType === 'deposit'
              ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500 disabled:bg-green-400'
              : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-400'
          } focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <DollarSign className="h-5 w-5 mr-2" />
              Record {paymentType === 'deposit' ? 'Deposit' : 'Advance'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
