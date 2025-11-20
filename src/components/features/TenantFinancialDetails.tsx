'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Invoice {
  id: number;
  tenantId: number;
  roomId: number;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  remainingAmount: number;
  status: 'pending' | 'partial' | 'completed' | 'overdue';
  description?: string;
}

interface Payment {
  id: number;
  tenantId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  type: string;
  status: string;
  description?: string;
}

interface TenantCredit {
  balance: number;
  history: {
    id: number;
    amount: number;
    transactionType: string;
    description: string;
    createdAt: string;
  }[];
}

interface DepositLedger {
  balance: number;
  history: {
    id: number;
    amount: number;
    transactionType: string;
    description: string;
    createdAt: string;
  }[];
}

interface TenantFinancialDetailsProps {
  tenantId: number;
}

export default function TenantFinancialDetails({ tenantId }: TenantFinancialDetailsProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [creditInfo, setCreditInfo] = useState<TenantCredit | null>(null);
  const [depositInfo, setDepositInfo] = useState<DepositLedger | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFinancialData = async () => {
      try {
        const [invoicesRes, paymentsRes, creditsRes, depositsRes] = await Promise.all([
          fetch(`/api/invoices?tenantId=${tenantId}`, { credentials: 'include' }),
          fetch(`/api/payments?tenantId=${tenantId}`, { credentials: 'include' }),
          fetch(`/api/tenant-credits/${tenantId}`, { credentials: 'include' }),
          fetch(`/api/deposit-ledger/${tenantId}`, { credentials: 'include' })
        ]);

        if (invoicesRes.ok) {
          const data = await invoicesRes.json();
          setInvoices(data.invoices || data.data || []);
        }

        if (paymentsRes.ok) {
          const data = await paymentsRes.json();
          setPayments(data.payments || data.data || []);
        }

        if (creditsRes.ok) {
          const data = await creditsRes.json();
          setCreditInfo(data);
        }

        if (depositsRes.ok) {
          const data = await depositsRes.json();
          setDepositInfo(data);
        }
      } catch (error) {
        console.error('Error loading financial data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFinancialData();
  }, [tenantId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Credit and Deposit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tenant Credit Card */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 shadow rounded-lg border-2 border-purple-200">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-purple-900">Tenant Credit</h3>
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-purple-900">
              {formatCurrency(creditInfo?.balance || 0)}
            </p>
            <p className="mt-2 text-xs text-purple-700">
              Available credit from advance payments
            </p>
          </div>
        </div>

        {/* Deposit Balance Card */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 shadow rounded-lg border-2 border-green-200">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-green-900">Security Deposit</h3>
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-green-900">
              {formatCurrency(depositInfo?.balance || 0)}
            </p>
            <p className="mt-2 text-xs text-green-700">
              Refundable security deposit on hand
            </p>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Invoices</h3>
        </div>
        <div className="px-6 py-4">
          {invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Issue Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remaining
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(invoice.issueDate)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(invoice.amount)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.remainingAmount)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getInvoiceStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/admin/financial/invoices/${invoice.id}`}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-sm text-gray-500">No invoices found</p>
              <p className="text-xs text-gray-400">Invoices will be automatically generated when the tenant is assigned to a room</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Payment History</h3>
        </div>
        <div className="px-6 py-4">
          {payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(payment.paymentDate)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                        {payment.paymentMethod.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                        {payment.type}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {payment.description || '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/admin/financial/payments/${payment.id}`}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="mt-2 text-sm text-gray-500">No payments recorded yet</p>
              <Link
                href={`/admin/financial/payments/new?tenantId=${tenantId}`}
                className="mt-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
              >
                Record First Payment
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

