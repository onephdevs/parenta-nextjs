'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';

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

export default function PaymentForm({ invoices = [], onPaymentComplete, onCancel }: PaymentFormProps) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('online');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { showNotification } = useNotifications();

  useEffect(() => {
    if (invoices.length > 0 && !selectedInvoiceId) {
      // Auto-select first invoice
      const firstInvoice = invoices[0];
      setSelectedInvoiceId(firstInvoice.id);
      setPaymentAmount(firstInvoice.balanceDue);
    }
  }, [invoices, selectedInvoiceId]);

  useEffect(() => {
    if (selectedInvoiceId) {
      const invoice = invoices.find(inv => inv.id === selectedInvoiceId);
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

        if (onPaymentComplete) {
          onPaymentComplete();
        }
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

  const selectedInvoice = invoices.find(inv => inv.id === selectedInvoiceId);
  const maxAmount = selectedInvoice ? selectedInvoice.balanceDue : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-gray-900">
      {/* Invoice Selection */}
      <div>
        <label htmlFor="invoiceId" className="block text-sm font-medium text-gray-900 mb-2">
          Select Invoice to Pay *
        </label>
        <select
          id="invoiceId"
          value={selectedInvoiceId}
          onChange={(e) => setSelectedInvoiceId(e.target.value)}
          required={invoices.length > 0}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">
            {invoices.length === 0 ? 'No invoices due' : 'Select an invoice'}
          </option>
          {invoices.map((invoice) => (
            <option key={invoice.id} value={invoice.id}>
              {invoice.invoiceNumber} - {formatCurrency(invoice.balanceDue)} due {new Date(invoice.dueDate).toLocaleDateString()}
            </option>
          ))}
        </select>
        {invoices.length === 0 && (
          <p className="mt-1 text-sm text-amber-700">
            You have no invoices with a balance due. Use the &quot;Manual Entry&quot; tab to record a payment without an invoice.
          </p>
        )}
      </div>

      {/* Payment Amount */}
      <div>
        <label htmlFor="paymentAmount" className="block text-sm font-medium text-gray-900 mb-2">
          Payment Amount (₱) *
        </label>
        <input
          type="number"
          id="paymentAmount"
          min={0}
          max={maxAmount}
          step="0.01"
          value={paymentAmount === 0 ? '' : paymentAmount}
          onChange={(e) => {
            const v = e.target.value;
            setPaymentAmount(v === '' ? 0 : parseFloat(v) || 0);
          }}
          placeholder="0"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {selectedInvoice && (
          <p className="mt-1 text-sm text-gray-900">
            Balance due: {formatCurrency(selectedInvoice.balanceDue)}
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

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-900 mb-2">
          Notes (Optional)
        </label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes about this payment..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Payment Info */}
      {selectedInvoice && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Payment Summary</h4>
          <div className="space-y-1 text-sm text-blue-800">
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
          disabled={isProcessing || !selectedInvoiceId || paymentAmount <= 0}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="h-5 w-5 mr-2" />
              Process Payment
            </>
          )}
        </button>
      </div>
    </form>
  );
}
