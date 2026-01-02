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
  Search,
  X,
  Printer,
  Zap,
  Droplet
} from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import SkeletonCard from '@/components/ui/SkeletonCard';
import ReceiptUpload from '@/components/features/tenant/ReceiptUpload';
import PaymentForm from '@/components/features/tenant/PaymentForm';
import DepositPaymentForm from '@/components/features/tenant/DepositPaymentForm';
import UtilityDepositForm from '@/components/features/tenant/UtilityDepositForm';
import ManualPaymentForm from '@/components/features/tenant/ManualPaymentForm';

interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  status: string;
  type: string;
  reference?: string;
  description?: string;
  roomNumber?: string;
  buildingName?: string;
  invoiceNumbers?: string;
}

interface PaymentScheduleItem {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: string;
  notes?: string;
  roomNumber?: string;
  buildingName?: string;
  address?: string;
}

interface PaymentSummary {
  totalPaid: number;
  nextDueDate: string;
  nextAmount: number;
  outstandingBalance: number;
  totalPending: number;
  totalOverdue: number;
  upcomingInvoices: number;
  recentPayments: Payment[];
  schedule: PaymentScheduleItem[];
}

interface BalanceData {
  outstanding: number;
  lateFees: number;
  total: number;
  outstandingCount: number;
  nextDueDate: string | null;
  nextAmount: number;
  lateFeeDetails?: Array<{
    invoiceId: string;
    daysOverdue: number;
    outstandingAmount: number;
    lateFee: number;
  }>;
}

export default function PaymentsPage() {
  const { data: session, status } = useSession();
  const [paymentData, setPaymentData] = useState<PaymentSummary | null>(null);
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<string | null>(null);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [showUtilityDepositForm, setShowUtilityDepositForm] = useState(false);
  const [showManualPaymentForm, setShowManualPaymentForm] = useState(false);
  const [depositBalance, setDepositBalance] = useState<number | null>(null);
  const [utilityDepositData, setUtilityDepositData] = useState<any>(null);
  const { showNotification } = useNotifications();

  useEffect(() => {
    if (status === 'authenticated' && session?.user.role === 'tenant') {
      fetchPaymentData();
      fetchDepositData();
      fetchUtilityDepositData();
    }
  }, [status, session]);

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-900">Loading...</p>
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
      
      // Fetch payment schedule and history
      const paymentsResponse = await fetch('/api/tenant/payments');
      const paymentsData = await paymentsResponse.json();

      // Fetch balance data
      const balanceResponse = await fetch('/api/tenant/balance');
      const balanceResult = await balanceResponse.json();

      if (paymentsData.success) {
        const summary = paymentsData.data.summary;
        const schedule = paymentsData.data.schedule || [];
        const history = paymentsData.data.history || [];
        
        // Map history to Payment format
        const recentPayments: Payment[] = history.map((p: any) => ({
          id: p.id,
          amount: p.amount,
          paymentDate: p.paymentDate,
          status: p.status,
          type: p.paymentType,
          reference: p.referenceNumber,
          description: p.notes,
          roomNumber: p.roomNumber,
          buildingName: p.buildingName,
          invoiceNumbers: p.invoiceNumbers,
        }));

        setPaymentData({
          totalPaid: summary.totalPaid || 0,
          nextDueDate: schedule.length > 0 ? schedule[0].dueDate : '',
          nextAmount: schedule.length > 0 ? schedule[0].balanceDue : 0,
          outstandingBalance: summary.outstandingBalance || 0,
          totalPending: summary.totalPending || 0,
          totalOverdue: summary.totalOverdue || 0,
          upcomingInvoices: summary.upcomingInvoices || 0,
          recentPayments,
          schedule,
        });
      } else {
        // Check if it's a "No tenant profile found" error
        if (paymentsData.error === 'No tenant profile found' || paymentsResponse.status === 404) {
          showNotification({
            type: 'error',
            title: 'Profile Not Found',
            message: 'No tenant profile found. Please contact admin to link your account to a tenant profile.'
          });
        } else {
          showNotification({
            type: 'error',
            title: 'Error',
            message: paymentsData.error || 'Failed to load payment data'
          });
        }
      }

      if (balanceResult.success) {
        setBalanceData(balanceResult.data);
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

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  
  const handleMakePayment = () => {
    setShowPaymentForm(true);
  };

  const handlePaymentComplete = () => {
    setShowPaymentForm(false);
    fetchPaymentData(); // Refresh payment data
  };

  const fetchDepositData = async () => {
    try {
      const response = await fetch('/api/tenant/deposits');
      const data = await response.json();
      if (data.success) {
        setDepositBalance(data.data.balance);
      }
    } catch (error) {
      console.error('Error fetching deposit data:', error);
    }
  };

  const fetchUtilityDepositData = async () => {
    try {
      const response = await fetch('/api/tenant/utility-deposits');
      const data = await response.json();
      if (data.success) {
        setUtilityDepositData(data.data);
      }
    } catch (error) {
      console.error('Error fetching utility deposit data:', error);
    }
  };

  const handleDepositComplete = () => {
    setShowDepositForm(false);
    fetchDepositData();
    fetchPaymentData();
  };

  const handleUtilityDepositComplete = () => {
    setShowUtilityDepositForm(false);
    fetchUtilityDepositData();
    fetchPaymentData();
  };

  const handleManualPaymentComplete = () => {
    setShowManualPaymentForm(false);
    fetchPaymentData();
    fetchDepositData();
  };

  const handleDownloadReceipt = (paymentId: string) => {
    // Open receipt download in new tab
    window.open(`/api/tenant/payments/${paymentId}/receipt`, '_blank');
  };

  const handlePrintReceipt = (paymentId: string) => {
    // Open printable receipt PDF in new tab
    window.open(`/api/tenant/payments/${paymentId}/print`, '_blank');
  };

  const handleReceiptUploadComplete = () => {
    // Refresh payment data after upload
    fetchPaymentData();
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

  // Filter payment history - only show completed payments (paid/partial)
  const filteredPayments = (paymentData?.recentPayments || [])
    .filter(payment => {
      // Payment history only shows completed payments
      const isCompleted = payment.status === 'paid' || payment.status === 'partial';
      if (!isCompleted) return false;
      
      const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
      const matchesSearch = payment.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           payment.reference?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse mr-4"></div>
                <div>
                  <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <SkeletonCard showHeader={false} lines={2} />
                <SkeletonCard showHeader={false} lines={2} />
                <SkeletonCard showHeader={false} lines={2} />
              </div>
              <SkeletonCard showHeader={true} lines={5} />
            </div>
          </div>
        </main>
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
                className="flex items-center text-gray-900 hover:text-gray-900 mr-4"
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
                <p className="text-sm text-gray-900">Manage your rent payments and history</p>
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
                          <dt className="text-sm font-medium text-gray-900 truncate">Total Paid</dt>
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
                          <dt className="text-sm font-medium text-gray-900 truncate">Next Due</dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {formatCurrency(paymentData?.nextAmount)}
                          </dd>
                          <dd className="text-xs text-gray-900">
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
                        <AlertCircle className={`h-6 w-6 ${(balanceData?.total || 0) > 0 ? 'text-red-600' : 'text-green-600'}`} />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-900 truncate">Total Balance</dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {formatCurrency(balanceData?.total || paymentData?.outstandingBalance || 0)}
                          </dd>
                          {balanceData && balanceData.lateFees > 0 && (
                            <dd className="text-xs text-red-600 mt-1">
                              (Includes ₱{formatCurrency(balanceData.lateFees).replace('₱', '')} late fees)
                            </dd>
                          )}
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Outstanding Balance Alert */}
              {(balanceData?.total || paymentData?.outstandingBalance || 0) > 0 && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">
                        <strong>Total Balance: {formatCurrency(balanceData?.total || paymentData?.outstandingBalance || 0)}</strong>
                        {balanceData && balanceData.lateFees > 0 && (
                          <span className="block mt-1">
                            Outstanding: {formatCurrency(balanceData.outstanding)} | 
                            Late Fees: {formatCurrency(balanceData.lateFees)}
                          </span>
                        )}
                        <br />
                        Please make a payment to avoid additional late fees. Late payments may result in additional charges.
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

              {/* Payment Options Tabs */}
              <div className="bg-white shadow rounded-lg">
                <div className="border-b border-gray-200">
                  <nav className="flex -mb-px" aria-label="Tabs">
                    <button
                      onClick={() => {
                        setShowPaymentForm(false);
                        setShowDepositForm(false);
                        setShowUtilityDepositForm(false);
                        setShowManualPaymentForm(false);
                      }}
                      className={`flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm ${
                        !showPaymentForm && !showDepositForm && !showUtilityDepositForm && !showManualPaymentForm
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <CreditCard className="h-5 w-5 mx-auto mb-1" />
                      Rent Payment
                    </button>
                    <button
                      onClick={() => {
                        setShowPaymentForm(false);
                        setShowDepositForm(true);
                        setShowUtilityDepositForm(false);
                        setShowManualPaymentForm(false);
                      }}
                      className={`flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm ${
                        showDepositForm
                          ? 'border-green-500 text-green-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <DollarSign className="h-5 w-5 mx-auto mb-1" />
                      Deposit
                    </button>
                    <button
                      onClick={() => {
                        setShowPaymentForm(false);
                        setShowDepositForm(false);
                        setShowUtilityDepositForm(true);
                        setShowManualPaymentForm(false);
                      }}
                      className={`flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm ${
                        showUtilityDepositForm
                          ? 'border-orange-500 text-orange-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <AlertCircle className="h-5 w-5 mx-auto mb-1" />
                      Utility Deposit
                    </button>
                    <button
                      onClick={() => {
                        setShowPaymentForm(false);
                        setShowDepositForm(false);
                        setShowUtilityDepositForm(false);
                        setShowManualPaymentForm(true);
                      }}
                      className={`flex-1 py-4 px-6 text-center border-b-2 font-medium text-sm ${
                        showManualPaymentForm
                          ? 'border-purple-500 text-purple-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <CreditCard className="h-5 w-5 mx-auto mb-1" />
                      Manual Entry
                    </button>
                  </nav>
                </div>

                <div className="p-6">
                  {/* Rent Payment Form */}
                  {!showPaymentForm && !showDepositForm && !showUtilityDepositForm && !showManualPaymentForm && (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">Make a Payment</h3>
                          <p className="text-sm text-gray-900">
                            Pay your rent securely online with multiple payment options
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900 mb-2">
                            {formatCurrency(balanceData?.nextAmount || paymentData?.nextAmount || 0)}
                          </div>
                          <div className="text-sm text-gray-900 mb-4">
                            Due: {formatDate(balanceData?.nextDueDate || paymentData?.nextDueDate || '')}
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
                  )}

                  {showPaymentForm && (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-medium text-gray-900">Make a Payment</h3>
                        <button
                          onClick={() => setShowPaymentForm(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <PaymentForm
                        invoices={paymentData?.schedule?.map(item => ({
                          id: item.id,
                          invoiceNumber: item.invoiceNumber,
                          dueDate: item.dueDate,
                          balanceDue: item.balanceDue,
                          totalAmount: item.totalAmount,
                          status: item.status,
                        })) || []}
                        onPaymentComplete={handlePaymentComplete}
                        onCancel={() => setShowPaymentForm(false)}
                      />
                    </div>
                  )}

                  {/* Deposit Payment Form */}
                  {showDepositForm && (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">Add Deposit Payment</h3>
                          {depositBalance !== null && (
                            <p className="text-sm text-gray-600 mt-1">
                              Current Deposit Balance: {formatCurrency(depositBalance)}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => setShowDepositForm(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <DepositPaymentForm
                        onPaymentComplete={handleDepositComplete}
                        onCancel={() => setShowDepositForm(false)}
                      />
                    </div>
                  )}

                  {/* Utility Deposit Form */}
                  {showUtilityDepositForm && (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">Add Utility Deposit</h3>
                          {utilityDepositData && utilityDepositData.hasAssignment && (
                            <p className="text-sm text-gray-600 mt-1">
                              Current Utility Deposit: {formatCurrency(utilityDepositData.utilityDepositPaid)} | 
                              Room: {utilityDepositData.roomNumber} | 
                              Building: {utilityDepositData.buildingName}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => setShowUtilityDepositForm(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      {utilityDepositData && !utilityDepositData.hasAssignment ? (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <p className="text-yellow-800">
                            You don't have an active room assignment. Please contact admin to assign you to a room first.
                          </p>
                        </div>
                      ) : (
                        <UtilityDepositForm
                          onPaymentComplete={handleUtilityDepositComplete}
                          onCancel={() => setShowUtilityDepositForm(false)}
                        />
                      )}
                    </div>
                  )}

                  {/* Manual Payment Form */}
                  {showManualPaymentForm && (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">Manual Payment Entry</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Enter payment amount you have paid manually
                          </p>
                        </div>
                        <button
                          onClick={() => setShowManualPaymentForm(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <ManualPaymentForm
                        onPaymentComplete={handleManualPaymentComplete}
                        onCancel={() => setShowManualPaymentForm(false)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Schedule - Upcoming Invoices */}
              {paymentData && paymentData.schedule && paymentData.schedule.length > 0 && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">Upcoming Payments</h3>
                      <span className="text-sm text-gray-500">
                        {paymentData.schedule.length} {paymentData.schedule.length === 1 ? 'invoice' : 'invoices'} due
                      </span>
                    </div>

                    <div className="overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                              Invoice #
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                              Due Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                              Amount Due
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                              Property
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {paymentData.schedule.map((item) => {
                            const isOverdue = new Date(item.dueDate) < new Date() && item.status === 'overdue';
                            return (
                              <tr key={item.id} className={isOverdue ? 'bg-red-50' : 'hover:bg-gray-50'}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {item.invoiceNumber}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  <div className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                                    {formatDate(item.dueDate)}
                                    {isOverdue && (
                                      <span className="ml-2 text-xs text-red-600 font-medium">Overdue</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                  {formatCurrency(item.balanceDue)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                                    {getStatusIcon(item.status)}
                                    <span className="ml-1 capitalize">{item.status}</span>
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {item.buildingName && item.roomNumber ? (
                                    <div>
                                      <div className="font-medium">{item.buildingName}</div>
                                      <div className="text-xs text-gray-500">Room {item.roomNumber}</div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">N/A</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

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
                        <option value="all">All Payments</option>
                        <option value="paid">Paid</option>
                        <option value="partial">Partial</option>
                      </select>
                    </div>
                  </div>

                  {filteredPayments.length > 0 ? (
                    <div className="overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                              Reference
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
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
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                                {payment.reference || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div className="flex items-center space-x-3">
                                  <button
                                    onClick={() => handlePrintReceipt(payment.id)}
                                    className="text-green-600 hover:text-green-900 flex items-center"
                                    title="Print Receipt"
                                  >
                                    <Printer className="h-4 w-4 mr-1" />
                                    Print
                                  </button>
                                  <button
                                    onClick={() => setSelectedPaymentForReceipt(payment.id)}
                                    className="text-blue-600 hover:text-blue-900 flex items-center"
                                    title="Upload Receipt"
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    Upload
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-900">
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

              {/* Receipt Upload Modal */}
              {selectedPaymentForReceipt && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                  <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full m-4">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Upload Receipt</h3>
                        <button
                          onClick={() => setSelectedPaymentForReceipt(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-6 w-6" />
                        </button>
                      </div>
                      <ReceiptUpload
                        paymentId={selectedPaymentForReceipt}
                        onUploadComplete={() => {
                          handleReceiptUploadComplete();
                          setSelectedPaymentForReceipt(null);
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

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