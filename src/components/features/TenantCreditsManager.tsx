'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { useCurrency } from '@/contexts/CurrencyContext';

interface CreditTransaction {
  id: string | number;
  amount: number;
  transactionType: 'credit' | 'debit' | 'applied_to_invoice';
  description: string;
  relatedInvoiceId?: string | number;
  createdAt: string;
}

interface TenantCreditsManagerProps {
  tenantId: number;
  tenantName: string;
}

export default function TenantCreditsManager({ tenantId, tenantName }: TenantCreditsManagerProps) {
  const { addNotification } = useNotifications();
  const { formatCurrency } = useCurrency();
  const [balance, setBalance] = useState<number>(0);
  const [history, setHistory] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    type: 'credit' as 'credit' | 'debit',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const loadCreditData = async () => {
    try {
      // Fetch balance (aggregated total) and history separately
      const [balanceRes, historyRes] = await Promise.all([
        fetch(`/api/tenant-credits/${tenantId}?type=balance`),
        fetch(`/api/tenant-credits/${tenantId}?type=history`)
      ]);
      
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        // API returns { success: true, data: <number> } for balance
        const balance = typeof balanceData.data === 'number' ? balanceData.data : (balanceData.data?.balance || balanceData.balance || 0);
        setBalance(balance);
      }
      
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        // API returns { success: true, data: <array> } for history
        const rawHistory = Array.isArray(historyData.data) ? historyData.data : (historyData.history || []);
        
        // Transform API response to match component's CreditTransaction interface
        // API returns TenantCredit objects with 'source' and 'status', but component expects 'transactionType'
        const history: CreditTransaction[] = rawHistory.map((item: any) => {
          // Map source/status to transactionType
          let transactionType: 'credit' | 'debit' | 'applied_to_invoice' = 'credit';
          
          if (item.status === 'applied') {
            transactionType = 'applied_to_invoice';
          } else if (item.source === 'adjustment' && item.amount < 0) {
            transactionType = 'debit';
          } else {
            transactionType = 'credit';
          }
          
          return {
            id: item.id || String(item.id),
            amount: parseFloat(item.amount || 0),
            transactionType,
            description: item.description || 'No description',
            relatedInvoiceId: item.appliedToInvoiceId || item.applied_to_invoice_id,
            createdAt: item.createdAt || item.created_at || new Date().toISOString(),
          };
        });
        
        setHistory(history);
      }
    } catch (error) {
      console.error('Error loading advance data:', error);
      addNotification('Failed to load advance information', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCreditData();
  }, [tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      addNotification('Please enter a valid amount', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/tenant-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          amount: parseFloat(formData.amount),
          transactionType: formData.type,
          description: formData.description || `Manual ${formData.type} by admin`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process transaction');
      }

      addNotification(
        `Successfully ${formData.type === 'credit' ? 'added' : 'deducted'} ${formatCurrency(parseFloat(formData.amount))}`,
        'success'
      );

      // Reset form and reload data
      setFormData({ amount: '', type: 'credit', description: '' });
      setShowAddForm(false);
      await loadCreditData();
    } catch (error) {
      console.error('Error processing credit transaction:', error);
      addNotification(
        error instanceof Error ? error.message : 'Failed to process transaction',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: string | Date) => {
    if (!date) return 'Date not available';
    try {
      return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'credit':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'debit':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'applied_to_invoice':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-900 bg-gray-50 border-gray-200';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit':
        return (
          <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        );
      case 'debit':
        return (
          <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
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
      <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-purple-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Advance</h3>
            <p className="mt-1 text-sm text-gray-900">Manage prepaid rent credits for {tenantName}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-900">Total Advance</p>
            <p className="text-3xl font-bold text-purple-600">{formatCurrency(balance)}</p>
          </div>
        </div>
      </div>

      {/* Add/Deduct Advance Form */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add/Deduct Advance
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-900">
                  Amount *
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
                    placeholder="0.00"
                    required
                    className="block w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-900">
                  Transaction Type *
                </label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'credit' | 'debit' })}
                  required
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="credit">Add Advance</option>
                  <option value="debit">Deduct Advance</option>
                </select>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-900">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Refund, Adjustment"
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({ amount: '', type: 'credit', description: '' });
                }}
                disabled={submitting}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Submit'}
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
                className={`flex items-start space-x-3 p-4 rounded-lg border ${getTransactionColor(transaction.transactionType || 'credit')}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getTransactionIcon(transaction.transactionType || 'credit')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {transaction.transactionType?.replace(/_/g, ' ') || 'Transaction'}
                      </p>
                      <p className="text-xs text-gray-900 mt-1">{transaction.description || 'No description'}</p>
                      <p className="text-xs text-gray-900 mt-1">{transaction.createdAt ? formatDate(transaction.createdAt) : 'Date not available'}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        transaction.transactionType === 'credit' || !transaction.transactionType ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {(transaction.transactionType === 'credit' || !transaction.transactionType) ? '+' : '-'}
                        {formatCurrency(Math.abs(transaction.amount || 0))}
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-2 text-sm text-gray-900">No advance transactions yet</p>
            <p className="text-xs text-gray-400">Advance payments (prepaid rent) will appear here and are automatically applied to future invoices</p>
          </div>
        )}
      </div>
    </div>
  );
}

