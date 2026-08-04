'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/forms/FormField';
import { CircleDollarSign, Plus } from 'lucide-react';

interface CreditTransaction {
  id: string | number;
  amount: number;
  transactionType: 'credit' | 'debit' | 'applied_to_invoice';
  description: string;
  relatedInvoiceId?: string | number;
  createdAt: string;
}

interface TenantCreditsManagerProps {
  tenantId: string;
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
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadCreditData = async () => {
    try {
      const [balanceRes, historyRes] = await Promise.all([
        fetch(`/api/tenant-credits/${tenantId}?type=balance`),
        fetch(`/api/tenant-credits/${tenantId}?type=history`),
      ]);

      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        const balance =
          typeof balanceData.data === 'number'
            ? balanceData.data
            : balanceData.data?.balance || balanceData.balance || 0;
        setBalance(balance);
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        const rawHistory = Array.isArray(historyData.data)
          ? historyData.data
          : historyData.history || [];

        const history: CreditTransaction[] = rawHistory.map((item: any) => {
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
          description:
            formData.description || `Manual ${formData.type === 'credit' ? 'advance' : 'deduction'} by admin`,
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
        minute: '2-digit',
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
      <Card>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-purple-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Advance</h3>
            <p className="mt-1 text-sm text-gray-900">Manage prepaid rent advance for {tenantName}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-900">Available advance</p>
            <p className="text-3xl font-bold text-purple-600">{formatCurrency(balance)}</p>
            <p className="mt-1 text-xs text-gray-500">Prepaid rent left to apply</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        {!showAddForm ? (
          <Button variant="primary" onClick={() => setShowAddForm(true)} leftIcon={<Plus className="h-4 w-4" />}>
            Add/Deduct Advance
          </Button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField htmlFor="amount" label="Amount" required>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-900 text-sm">
                    ₱
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    required
                    className="pl-8"
                  />
                </div>
              </FormField>

              <FormField htmlFor="type" label="Transaction Type" required>
                <Select
                  id="type"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as 'credit' | 'debit' })
                  }
                  required
                >
                  <option value="credit">Add Advance</option>
                  <option value="debit">Deduct Advance</option>
                </Select>
              </FormField>

              <FormField htmlFor="description" label="Description (Optional)">
                <Input
                  id="description"
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Refund, Adjustment"
                />
              </FormField>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({ amount: '', type: 'credit', description: '' });
                }}
                isDisabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={submitting}>
                Submit
              </Button>
            </div>
          </form>
        )}
      </div>

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
                        {transaction.transactionType === 'credit'
                          ? 'Advance'
                          : transaction.transactionType === 'debit'
                            ? 'Deduction'
                            : transaction.transactionType?.replace(/_/g, ' ') || 'Transaction'}
                      </p>
                      <p className="text-xs text-gray-900 mt-1">
                        {transaction.description || 'No description'}
                      </p>
                      <p className="text-xs text-gray-900 mt-1">
                        {transaction.createdAt ? formatDate(transaction.createdAt) : 'Date not available'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${
                          transaction.transactionType === 'credit' || !transaction.transactionType
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {transaction.transactionType === 'credit' || !transaction.transactionType ? '+' : '-'}
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
            <CircleDollarSign className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
            <p className="mt-2 text-sm text-gray-900">No advance transactions yet</p>
            <p className="text-xs text-gray-400">
              Advance payments (prepaid rent) will appear here and are automatically applied to future invoices
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
