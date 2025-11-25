'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { useCurrency } from '@/contexts/CurrencyContext';

interface DepositTransaction {
  id: number;
  amount: number;
  transactionType: 'deposit' | 'applied_to_invoice' | 'refund';
  description: string;
  relatedInvoiceId?: number;
  paymentMethod?: string;
  referenceNumber?: string;
  createdAt: string;
}

interface DepositLedgerManagerProps {
  tenantId: number;
  tenantName: string;
}

export default function DepositLedgerManager({ tenantId, tenantName }: DepositLedgerManagerProps) {
  const { addNotification } = useNotifications();
  const { formatCurrency } = useCurrency();
  const [balance, setBalance] = useState<number>(0);
  const [history, setHistory] = useState<DepositTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActionForm, setShowActionForm] = useState(false);
  const [actionType, setActionType] = useState<'refund' | 'apply' | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    invoiceId: '',
    paymentMethod: 'bank_transfer',
    referenceNumber: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const loadDepositData = async () => {
    try {
      const response = await fetch(`/api/deposit-ledger/${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance || 0);
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error loading deposit data:', error);
      addNotification('Failed to load deposit information', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepositData();
  }, [tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      addNotification('Please enter a valid amount', 'error');
      return;
    }

    if (parseFloat(formData.amount) > balance) {
      addNotification('Amount cannot exceed available deposit balance', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/deposit-ledger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          amount: parseFloat(formData.amount),
          transactionType: actionType === 'refund' ? 'refund' : 'applied_to_invoice',
          description: formData.description || `Manual ${actionType} by admin`,
          relatedInvoiceId: actionType === 'apply' ? parseInt(formData.invoiceId) : null,
          paymentMethod: actionType === 'refund' ? formData.paymentMethod : null,
          referenceNumber: formData.referenceNumber || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process transaction');
      }

      addNotification(
        `Successfully ${actionType === 'refund' ? 'refunded' : 'applied'} ${formatCurrency(parseFloat(formData.amount))}`,
        'success'
      );

      // Reset form and reload data
      setFormData({ amount: '', description: '', invoiceId: '', paymentMethod: 'bank_transfer', referenceNumber: '' });
      setShowActionForm(false);
      setActionType(null);
      await loadDepositData();
    } catch (error) {
      console.error('Error processing deposit transaction:', error);
      addNotification(
        error instanceof Error ? error.message : 'Failed to process transaction',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'refund':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'applied_to_invoice':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-900 bg-gray-50 border-gray-200';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return (
          <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        );
      case 'refund':
        return (
          <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        );
      case 'applied_to_invoice':
        return (
          <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header with Balance */}
      <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-green-50 to-green-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Security Deposit</h3>
            <p className="mt-1 text-sm text-gray-900">Manage security deposit for {tenantName}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-900">Available Balance</p>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(balance)}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        {!showActionForm ? (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setActionType('apply');
                setShowActionForm(true);
              }}
              disabled={balance <= 0}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Apply to Invoice
            </button>
            <button
              onClick={() => {
                setActionType('refund');
                setShowActionForm(true);
              }}
              disabled={balance <= 0}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Refund to Tenant
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>{actionType === 'refund' ? 'Refunding Deposit' : 'Applying Deposit to Invoice'}</strong>
                {actionType === 'refund' 
                  ? ' - This will decrease the deposit balance and refund the tenant.' 
                  : ' - This will apply the deposit amount to pay an outstanding invoice.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-900">
                  Amount * (Max: {formatCurrency(balance)})
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-900 sm:text-sm">₱</span>
                  </div>
                  <input
                    type="number"
                    id="amount"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    step="0.01"
                    min="0"
                    max={balance}
                    placeholder="0.00"
                    required
                    className="block w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              {actionType === 'apply' ? (
                <div>
                  <label htmlFor="invoiceId" className="block text-sm font-medium text-gray-900">
                    Invoice ID *
                  </label>
                  <input
                    type="number"
                    id="invoiceId"
                    value={formData.invoiceId}
                    onChange={(e) => setFormData({ ...formData, invoiceId: e.target.value })}
                    placeholder="Enter invoice ID"
                    required
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              ) : (
                <div>
                  <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-900">
                    Refund Method *
                  </label>
                  <select
                    id="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    required
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="online">Online Payment</option>
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-900">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Final refund, Partial application"
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label htmlFor="referenceNumber" className="block text-sm font-medium text-gray-900">
                  Reference Number (Optional)
                </label>
                <input
                  type="text"
                  id="referenceNumber"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  placeholder="Transaction reference"
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowActionForm(false);
                  setActionType(null);
                  setFormData({ amount: '', description: '', invoiceId: '', paymentMethod: 'bank_transfer', referenceNumber: '' });
                }}
                disabled={submitting}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? 'Processing...' : `Confirm ${actionType === 'refund' ? 'Refund' : 'Application'}`}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Transaction History */}
      <div className="px-6 py-5">
        <h4 className="text-sm font-medium text-gray-900 mb-4">Transaction History</h4>
        {history.length > 0 ? (
          <div className="space-y-3">
            {history.map((transaction) => (
              <div
                key={transaction.id}
                className={`flex items-start space-x-3 p-4 rounded-lg border ${getTransactionColor(transaction.transactionType)}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getTransactionIcon(transaction.transactionType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {transaction.transactionType.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-gray-900 mt-1">{transaction.description}</p>
                      {transaction.paymentMethod && (
                        <p className="text-xs text-gray-900 mt-1">
                          Method: {transaction.paymentMethod.replace('_', ' ')}
                        </p>
                      )}
                      {transaction.referenceNumber && (
                        <p className="text-xs text-gray-900">Ref: {transaction.referenceNumber}</p>
                      )}
                      <p className="text-xs text-gray-900 mt-1">{formatDate(transaction.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        transaction.transactionType === 'deposit' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.transactionType === 'deposit' ? '+' : '-'}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </p>
                      {transaction.relatedInvoiceId && (
                        <a
                          href={`/admin/financial/invoices/${transaction.relatedInvoiceId}`}
                          className="text-xs text-purple-600 hover:text-purple-900"
                        >
                          View Invoice →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-2 text-sm text-gray-900">No deposit transactions yet</p>
            <p className="text-xs text-gray-400">Deposits will be recorded when tenants pay security deposits</p>
          </div>
        )}
      </div>
    </div>
  );
}

