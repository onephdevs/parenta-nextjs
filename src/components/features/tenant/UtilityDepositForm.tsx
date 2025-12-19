'use client';

import React, { useState } from 'react';
import { Zap, Droplet, Loader2 } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';

interface UtilityDepositFormProps {
  onPaymentComplete?: () => void;
  onCancel?: () => void;
}

export default function UtilityDepositForm({ onPaymentComplete, onCancel }: UtilityDepositFormProps) {
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

        if (onPaymentComplete) {
          onPaymentComplete();
        }
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-gray-900">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-orange-800">
          <strong>Note:</strong> Utility deposits are used to cover electric and water bills. The deposit amount is added to your utility deposit balance.
        </p>
      </div>

      {/* Utility Type */}
      <div>
        <label htmlFor="utilityType" className="block text-sm font-medium text-gray-900 mb-2">
          Utility Type *
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setUtilityType('electricity')}
            className={`p-4 border-2 rounded-lg flex items-center justify-center space-x-2 ${
              utilityType === 'electricity'
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Zap className={`h-5 w-5 ${utilityType === 'electricity' ? 'text-orange-600' : 'text-gray-400'}`} />
            <span className="font-medium">Electricity</span>
          </button>
          <button
            type="button"
            onClick={() => setUtilityType('water')}
            className={`p-4 border-2 rounded-lg flex items-center justify-center space-x-2 ${
              utilityType === 'water'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Droplet className={`h-5 w-5 ${utilityType === 'water' ? 'text-blue-600' : 'text-gray-400'}`} />
            <span className="font-medium">Water</span>
          </button>
        </div>
      </div>

      {/* Deposit Amount */}
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-900 mb-2">
          {utilityType === 'electricity' ? 'Electric' : 'Water'} Deposit Amount (₱) *
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        {amount && parseFloat(amount) > 0 && (
          <p className="mt-1 text-sm text-gray-600">
            You are depositing: {formatCurrency(parseFloat(amount))} for {utilityType}
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
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
          placeholder={`Additional notes about this ${utilityType} deposit...`}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Payment Summary */}
      {amount && parseFloat(amount) > 0 && (
        <div className={`bg-${utilityType === 'electricity' ? 'orange' : 'blue'}-50 border border-${utilityType === 'electricity' ? 'orange' : 'blue'}-200 rounded-lg p-4`}>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Deposit Summary</h4>
          <div className="space-y-1 text-sm text-gray-800">
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
            utilityType === 'electricity'
              ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
              : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
          } focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              {utilityType === 'electricity' ? (
                <Zap className="h-5 w-5 mr-2" />
              ) : (
                <Droplet className="h-5 w-5 mr-2" />
              )}
              Record {utilityType === 'electricity' ? 'Electric' : 'Water'} Deposit
            </>
          )}
        </button>
      </div>
    </form>
  );
}
