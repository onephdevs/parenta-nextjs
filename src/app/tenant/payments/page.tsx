'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  CreditCard, 
  Download, 
  Calendar, 
  DollarSign, 
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Filter,
  Search
} from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';

interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  status: string;
  type: string;
  reference?: string;
  description?: string;
}

interface PaymentSummary {
  totalPaid: number;
  nextDueDate: string;
  nextAmount: number;
  outstandingBalance: number;
  recentPayments: Payment[];
}

export default function PaymentsPage() {
  const { data: session, status } = useSession();
  const [paymentData, setPaymentData] = useState<PaymentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { showNotification } = useNotifications();

  useEffect(() => {
    if (status === 'authenticated' && session?.user.role === 'tenant') {
      fetchPaymentData();
    }
  }, [status, session]);

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated or not tenant
  if (!session || session.user.role !== 'tenant') {
    redirect('/auth/signin?role=tenant');
  }

  const fetchPaymentData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/tenant/payments');
      const data = await response.json();

      if (data.success) {
        setPaymentData(data.data);
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: 'Failed to load payment data'
        });
      }
    } catch (error) {
      console.error('Error fetching payment data:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load payment data'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMakePayment = () => {
    showNotification({
      type: 'info',
      title: 'Payment Portal',
      message: 'Payment processing integration will be available soon! You will be able to pay via credit card, bank transfer, and other secure methods.'
    });
  };

  const handleDownloadReceipt = (paymentId: string) => {
    showNotification({
      type: 'info',
      title: 'Download Receipt',
      message: 'Receipt download functionality will be available soon!'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'overdue':
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number | undefined | null) => {
    const value = amount || 0;
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(value);
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredPayments = (paymentData?.recentPayments || []).filter(payment => {
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
    const matchesSearch = payment.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.reference?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading payment information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link
                href="/tenant"
                className="flex items-center text-gray-500 hover:text-gray-700 mr-4"
              >
                <ArrowLeft className="h-5 w-5 mr-1" />
                Back to Dashboard
              </Link>
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">Payments</h1>
                <p className="text-sm text-gray-500">Manage your rent payments and history</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {paymentData && (
            <div className="space-y-6">
              {/* Payment Summary */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <DollarSign className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Paid</dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {formatCurrency(paymentData?.totalPaid)}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Calendar className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Next Due</dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {formatCurrency(paymentData?.nextAmount)}
                          </dd>
                          <dd className="text-xs text-gray-500">
                            Due: {formatDate(paymentData?.nextDueDate)}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <AlertCircle className={`h-6 w-6 ${(paymentData?.outstandingBalance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`} />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Outstanding</dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {formatCurrency(paymentData?.outstandingBalance)}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Outstanding Balance Alert */}
              {(paymentData?.outstandingBalance || 0) > 0 && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">
                        <strong>Outstanding Balance: {formatCurrency(paymentData?.outstandingBalance)}</strong>
                        <br />
                        Please make a payment to avoid late fees. Late payments may result in additional charges.
                      </p>
                      <div className="mt-3">
                        <button
                          onClick={handleMakePayment}
                          className="bg-red-100 text-red-800 rounded-md px-3 py-2 text-sm font-medium hover:bg-red-200"
                        >
                          Make Payment Now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Make Payment Section */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Make a Payment</h3>
                    <p className="text-sm text-gray-500">
                      Pay your rent securely online with multiple payment options
                    </p>
                    <div className="mt-2 text-sm text-gray-600">
                      <p>• Credit/Debit Cards (Visa, MasterCard, American Express)</p>
                      <p>• Bank Transfer (ACH)</p>
                      <p>• Online Banking</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900 mb-2">
                      {formatCurrency(paymentData?.nextAmount)}
                    </div>
                    <div className="text-sm text-gray-500 mb-4">
                      Due: {formatDate(paymentData?.nextDueDate)}
                    </div>
                    <button
                      onClick={handleMakePayment}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <CreditCard className="mr-2 h-5 w-5" />
                      Pay Now
                    </button>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Payment History</h3>
                    
                    {/* Filters */}
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search payments..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">All Status</option>
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                        <option value="overdue">Overdue</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>
                  </div>

                  {filteredPayments.length > 0 ? (
                    <div className="overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Reference
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredPayments.map((payment) => (
                            <tr key={payment.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatDate(payment.paymentDate)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {formatCurrency(payment.amount)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {payment.type}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                                  {getStatusIcon(payment.status)}
                                  <span className="ml-1">{payment.status}</span>
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                {payment.reference || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <button
                                  onClick={() => handleDownloadReceipt(payment.id)}
                                  className="text-blue-600 hover:text-blue-900 flex items-center"
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Receipt
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">
                        {searchTerm || filterStatus !== 'all' 
                          ? 'No payments found matching your criteria.' 
                          : 'No payment history available.'}
                      </p>
                      {(searchTerm || filterStatus !== 'all') && (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setFilterStatus('all');
                          }}
                          className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-blue-900 mb-4">Payment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-blue-800 mb-2">Payment Methods</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Credit/Debit Cards (Processing fee: 2.9%)</li>
                      <li>• Bank Transfer (ACH) - No fee</li>
                      <li>• Online Banking - No fee</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-800 mb-2">Important Notes</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Rent is due on the 1st of each month</li>
                      <li>• Late fee of $50 applies after the 5th</li>
                      <li>• Payments are processed within 1-2 business days</li>
                      <li>• Keep receipts for your records</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 