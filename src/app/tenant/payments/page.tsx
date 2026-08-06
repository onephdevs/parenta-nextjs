'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  CreditCard, 
  Download, 
  Calendar, 
  DollarSign, 
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  X,
  Printer,
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import ReceiptUpload from '@/components/features/tenant/ReceiptUpload';
import { ReceiptUploadPanel, type ReceiptLinkOption } from '@/components/features/tenant/ReceiptUploadPanel';
import PaymentForm from '@/components/features/tenant/PaymentForm';
import DepositPaymentForm from '@/components/features/tenant/DepositPaymentForm';
import UtilityDepositForm from '@/components/features/tenant/UtilityDepositForm';
import ManualPaymentForm from '@/components/features/tenant/ManualPaymentForm';
import { TenantStatementsPanel } from '@/components/features/tenant/TenantStatementsPanel';
import { TenantPageSkeleton } from '@/components/features/tenant/TenantPageSkeleton';
import { useTenantPortalGate } from '@/hooks/useTenantPortalGate';
import {
  useTenantData,
  fetchTenantPayments,
  fetchTenantBalance,
} from '@/hooks/useTenantPortalData';
import { useTenantTheme } from '@/hooks/useTenantTheme';
import { cn } from '@/lib/utils';
import { formatPaymentNotesLabel } from '@/lib/format-payment-notes';

type PaymentTab = 'overview' | 'pay' | 'upload' | 'history' | 'statements';

const PAYMENT_TABS: { id: PaymentTab; label: string }[] = [
  { id: 'overview', label: 'Overview & balance' },
  { id: 'pay', label: 'Pay online' },
  { id: 'upload', label: 'Upload receipt' },
  { id: 'history', label: 'History' },
  { id: 'statements', label: 'Statements' },
];

const VALID_TABS: PaymentTab[] = ['overview', 'pay', 'upload', 'history', 'statements'];

interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  status: string;
  type: string;
  method?: string;
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

interface UtilityBillItem {
  id: string;
  utilityType: string;
  amount: number;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string;
  status: string;
  providerName?: string;
  notes?: string;
  roomNumber?: string;
  buildingName?: string;
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
  utilityBills: UtilityBillItem[];
}

interface BalanceData {
  outstanding: number;
  pastDue: number;
  pastDueCount: number;
  upcoming: number;
  lateFees: number;
  total: number;
  pastDueTotal: number;
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

function mapPaymentSummary(paymentsData: Record<string, unknown>): PaymentSummary {
  const summary = (paymentsData.summary || {}) as Record<string, unknown>;
  const schedule = (paymentsData.schedule || []) as PaymentScheduleItem[];
  const history = (paymentsData.history || []) as Record<string, unknown>[];
  const utilityBillsRaw = (paymentsData.utilityBills || []) as Record<string, unknown>[];

  const recentPayments: Payment[] = history.map((p) => ({
    id: String(p.id),
    amount: Number(p.amount) || 0,
    paymentDate: String(p.paymentDate || p.payment_date || ''),
    status: String(p.status || p.payment_status || 'pending'),
    type: String(p.paymentType || p.payment_type || 'other'),
    method: String(p.paymentMethod || p.payment_method || 'cash'),
    reference: (p.referenceNumber || p.reference_number || null) as string | undefined,
    description: (p.notes || null) as string | undefined,
    roomNumber: (p.roomNumber || p.room_number) as string | undefined,
    buildingName: (p.buildingName || p.building_name) as string | undefined,
    invoiceNumbers: (p.invoiceNumbers || p.invoice_numbers) as string | undefined,
  }));

  const utilityBills: UtilityBillItem[] = utilityBillsRaw.map((b) => ({
    id: String(b.id),
    utilityType: String(b.utilityType || b.utility_type || ''),
    amount: Number(b.amount) || 0,
    billingPeriodStart: String(b.billingPeriodStart || b.billing_period_start || ''),
    billingPeriodEnd: String(b.billingPeriodEnd || b.billing_period_end || ''),
    dueDate: String(b.dueDate || b.due_date || ''),
    status: String(b.status || b.bill_status || 'pending'),
    providerName: (b.providerName || b.provider_name) as string | undefined,
    notes: b.notes as string | undefined,
    roomNumber: (b.roomNumber || b.room_number) as string | undefined,
    buildingName: (b.buildingName || b.building_name) as string | undefined,
  }));

  return {
    totalPaid: Number(summary.totalPaid) || 0,
    nextDueDate: schedule.length > 0 ? schedule[0].dueDate : '',
    nextAmount: schedule.length > 0 ? schedule[0].balanceDue : 0,
    outstandingBalance: Number(summary.outstandingBalance) || 0,
    totalPending: Number(summary.totalPending) || 0,
    totalOverdue: Number(summary.totalOverdue) || 0,
    upcomingInvoices: Number(summary.upcomingInvoices) || 0,
    recentPayments,
    schedule,
    utilityBills,
  };
}

export default function PaymentsPage() {
  const { data: session, status } = useSession();
  const { canAccess, isPreview, isLoading: gateLoading } = useTenantPortalGate();
  const { load, getCached, isLoading: cacheLoading, invalidate } = useTenantData();
  const theme = useTenantTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: PaymentTab =
    tabParam && VALID_TABS.includes(tabParam as PaymentTab)
      ? (tabParam as PaymentTab)
      : 'overview';

  const setTab = (tab: PaymentTab) => {
    router.replace(`/tenant/payments?tab=${tab}`);
  };

  const [paymentData, setPaymentData] = useState<PaymentSummary | null>(() => {
    const cached = getCached<Record<string, unknown>>('payments');
    return cached ? mapPaymentSummary(cached) : null;
  });
  const [balanceData, setBalanceData] = useState<BalanceData | null>(
    () => getCached<BalanceData>('balance') ?? null
  );
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<string | null>(null);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [showUtilityDepositForm, setShowUtilityDepositForm] = useState(false);
  const [showManualPaymentForm, setShowManualPaymentForm] = useState(false);
  const [depositBalance, setDepositBalance] = useState<number | null>(null);
  const [advanceBalance, setAdvanceBalance] = useState<number | null>(null);
  const [utilityDepositData, setUtilityDepositData] = useState<any>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [payDraft, setPayDraft] = useState<{
    invoiceId?: string;
    amount?: number;
    preferPartial?: boolean;
  } | null>(null);
  const { showNotification } = useNotifications();

  useEffect(() => {
    if (gateLoading || status === 'loading') return;
    if (canAccess) {
      fetchPaymentData();
      fetchDepositData();
      fetchUtilityDepositData();
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin?role=tenant');
    }
  }, [status, session, router, canAccess, gateLoading]);

  // When landing on Pay tab, surface the rent payment CTA (form stays closed until Pay Now)
  useEffect(() => {
    if (activeTab === 'pay') {
      setShowDepositForm(false);
      setShowUtilityDepositForm(false);
      setShowManualPaymentForm(false);
    }
  }, [activeTab]);

  const fetchPaymentData = async (force = false) => {
    try {
      const cachedBalance = getCached<BalanceData>('balance');
      const balanceNeedsRefresh =
        force || cachedBalance == null || typeof cachedBalance.pastDue !== 'number';
      const [paymentsRaw, balanceRaw] = await Promise.all([
        load('payments', fetchTenantPayments, { force }),
        load('balance', fetchTenantBalance, { force: balanceNeedsRefresh }),
      ]);
      setPaymentData(mapPaymentSummary(paymentsRaw));
      setBalanceData(balanceRaw as unknown as BalanceData);
    } catch (error) {
      console.error('Error fetching payment data:', error);
      if (!getCached('payments')) {
        showNotification({
          type: 'error',
          title: 'Error',
          message: error instanceof Error ? error.message : 'Failed to load payment data',
        });
      }
    }
  };

  const refreshFinancials = () => {
    invalidate('payments');
    invalidate('balance');
    void fetchPaymentData(true);
  };

  const handleMakePayment = (opts?: {
    invoiceId?: string;
    amount?: number;
    preferPartial?: boolean;
  }) => {
    setPayDraft(opts || null);
    setShowDepositForm(false);
    setShowUtilityDepositForm(false);
    setShowManualPaymentForm(false);
    setShowPaymentForm(true);
    setTab('pay');
  };

  const handlePaymentComplete = () => {
    setShowPaymentForm(false);
    setPayDraft(null);
    refreshFinancials();
  };

  const fetchDepositData = async () => {
    try {
      const response = await fetch('/api/tenant/deposits');
      const data = await response.json();
      if (data.success) {
        setDepositBalance(data.data.balance || 0);
        setAdvanceBalance(data.data.advanceBalance || 0);
      } else {
        // If API fails, set balance to 0 (non-critical)
        console.warn('Failed to fetch deposit data:', data.error);
        setDepositBalance(0);
        setAdvanceBalance(0);
      }
    } catch (error) {
      // Non-critical error - page can still function without deposit data
      console.warn('Error fetching deposit data (non-critical):', error);
      setDepositBalance(0);
      setAdvanceBalance(0);
    }
  };

  const fetchUtilityDepositData = async () => {
    try {
      const response = await fetch('/api/tenant/utility-deposits');
      const data = await response.json();
      if (data.success) {
        setUtilityDepositData(data.data);
      } else {
        // If API fails, set to null (non-critical)
        console.warn('Failed to fetch utility deposit data:', data.error);
        setUtilityDepositData(null);
      }
    } catch (error) {
      // Non-critical error - page can still function without utility deposit data
      console.warn('Error fetching utility deposit data (non-critical):', error);
      setUtilityDepositData(null);
    }
  };

  const handleDepositComplete = () => {
    setShowDepositForm(false);
    fetchDepositData();
    refreshFinancials();
  };

  const handleUtilityDepositComplete = () => {
    setShowUtilityDepositForm(false);
    fetchUtilityDepositData();
    refreshFinancials();
  };

  const handleManualPaymentComplete = () => {
    setShowManualPaymentForm(false);
    refreshFinancials();
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
    refreshFinancials();
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

  if (status === 'loading' || gateLoading || (!paymentData && cacheLoading('payments'))) {
    return <TenantPageSkeleton variant="payments" />;
  }

  if (!canAccess) {
    return null;
  }

  const summaryCardClass = theme.card;
  const panelClass = cn(theme.formPanel, 'overflow-hidden');

  const receiptLinkOptions: ReceiptLinkOption[] = [];
  if (paymentData?.schedule?.length) {
    for (const item of paymentData.schedule) {
      receiptLinkOptions.push({
        value: `invoice:${item.id}`,
        label: `Invoice due ${formatDate(item.dueDate)} · ${formatCurrency(item.balanceDue)} (${item.invoiceNumber || 'invoice'})`,
        kind: 'invoice',
        invoiceId: item.id,
        defaultAmount: item.balanceDue,
        defaultDate: item.dueDate,
      });
    }
  }
  if (paymentData?.recentPayments?.length) {
    for (const payment of paymentData.recentPayments) {
      receiptLinkOptions.push({
        value: `payment:${payment.id}`,
        label: `Payment ${formatDate(payment.paymentDate)} · ${formatCurrency(payment.amount)} · ${payment.type || 'payment'}`,
        kind: 'payment',
        paymentId: payment.id,
        defaultAmount: payment.amount,
        defaultDate: payment.paymentDate,
      });
    }
  }

  const paymentScheduleSection =
    paymentData && paymentData.schedule && paymentData.schedule.length > 0 ? (
      <div className={panelClass}>
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Payment Schedule</h3>
            <span className="text-sm text-gray-500">
              {paymentData.schedule.length}{' '}
              {paymentData.schedule.length === 1 ? 'invoice' : 'invoices'} due
            </span>
          </div>

          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Amount Due
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Property
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {paymentData.schedule.map((item) => {
                  const isOverdue =
                    new Date(item.dueDate) < new Date() && item.status === 'overdue';
                  return (
                    <tr key={item.id} className={isOverdue ? 'bg-red-50' : 'hover:bg-gray-50'}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {item.invoiceNumber}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="mr-1 h-4 w-4 text-gray-400" />
                          {formatDate(item.dueDate)}
                          {isOverdue && (
                            <span className="ml-2 text-xs font-medium text-red-600">Overdue</span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900">
                        {formatCurrency(item.balanceDue)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(item.status)}`}
                        >
                          {getStatusIcon(item.status)}
                          <span className="ml-1 capitalize">{item.status}</span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {item.buildingName && item.roomNumber ? (
                          <div>
                            <div className="font-medium">{item.buildingName}</div>
                            <div className="text-xs text-gray-500">Room {item.roomNumber}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        {item.balanceDue > 0 ? (
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                handleMakePayment({
                                  invoiceId: item.id,
                                  amount: item.balanceDue,
                                  preferPartial: false,
                                })
                              }
                            >
                              Pay
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleMakePayment({
                                  invoiceId: item.id,
                                  amount: 0,
                                  preferPartial: true,
                                })
                              }
                            >
                              Pay partial
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
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
    ) : null;

  const paymentHistorySection = (
    <div className={panelClass}>
      <div className="px-4 py-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Payment History</h3>
          <div className="flex flex-wrap items-center gap-3">
            <FormField htmlFor="payment-search" className="mb-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="payment-search"
                  type="text"
                  placeholder="Search payments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 pl-10"
                />
              </div>
            </FormField>
            <FormField htmlFor="payment-status-filter" className="mb-0">
              <Select
                id="payment-status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Payments</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
              </Select>
            </FormField>
          </div>
        </div>

        {filteredPayments.length > 0 ? (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {formatDate(payment.paymentDate)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {payment.method ? (
                        <span className="capitalize">
                          {String(payment.method).replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span className="italic text-gray-400">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {payment.type ? (
                        <span className="capitalize">{String(payment.type).replace(/_/g, ' ')}</span>
                      ) : (
                        <span className="italic text-gray-400">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {payment.status ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(payment.status)}`}
                        >
                          {getStatusIcon(payment.status)}
                          <span className="ml-1 capitalize">{String(payment.status)}</span>
                        </span>
                      ) : (
                        <span className="italic text-gray-400">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {formatPaymentNotesLabel(payment.description)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handlePrintReceipt(payment.id)}
                          className="flex items-center text-green-600 hover:text-green-900"
                          title="Print Receipt"
                        >
                          <Printer className="mr-1 h-4 w-4" />
                          Print
                        </button>
                        <button
                          onClick={() => setSelectedPaymentForReceipt(payment.id)}
                          className="flex items-center text-blue-600 hover:text-blue-900"
                          title="Upload Receipt"
                        >
                          <Download className="mr-1 h-4 w-4" />
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
          <div className="py-8 text-center">
            <CreditCard className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="text-gray-900">
              {searchTerm || filterStatus !== 'all'
                ? 'No payments found matching your criteria.'
                : 'No payment history available.'}
            </p>
            {(searchTerm || filterStatus !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                }}
                className="mt-2"
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={theme.pagePad}>
      <h1 className={theme.title}>Payments</h1>

      <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Payment sections">
        {PAYMENT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={theme.tabClass(activeTab === tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'statements' && <TenantStatementsPanel />}

      {paymentData && activeTab !== 'statements' && (
        <div className="space-y-6">
          {/* Overview: summary cards + balance breakdown + schedule */}
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 lg:grid-cols-5">
                <div className={summaryCardClass}>
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <DollarSign className="h-6 w-6 text-emerald-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className={theme.label}>Total Paid</dt>
                          <dd className={theme.value}>
                            {formatCurrency(paymentData?.totalPaid)}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={summaryCardClass}>
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Calendar className="h-6 w-6 text-sky-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className={theme.label}>Next Due</dt>
                          <dd className={theme.value}>
                            {formatCurrency(paymentData?.nextAmount)}
                          </dd>
                          <dd className={theme.subtle}>
                            Due: {formatDate(paymentData?.nextDueDate)}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={summaryCardClass}>
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <AlertCircle
                          className={`h-6 w-6 ${(balanceData?.pastDueTotal ?? balanceData?.total ?? 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}
                        />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className={theme.label}>Past due</dt>
                          <dd className={theme.value}>
                            {formatCurrency(
                              balanceData?.pastDueTotal ??
                                balanceData?.total ??
                                paymentData?.totalOverdue ??
                                0
                            )}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={summaryCardClass}>
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className={theme.label}>Deposit</dt>
                          <dd className={theme.value}>
                            {formatCurrency(depositBalance || 0)}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={summaryCardClass}>
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Clock className="h-6 w-6 text-amber-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className={theme.label}>Advance</dt>
                          <dd className={theme.value}>
                            {formatCurrency(advanceBalance || 0)}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {!isPreview && (
                <div className="flex justify-end">
                  <Button
                    variant="success"
                    size="lg"
                    onClick={() => setTab('pay')}
                    leftIcon={<CreditCard className="h-5 w-5" />}
                    className={theme.primaryButton}
                  >
                    Pay now
                  </Button>
                </div>
              )}

              {paymentScheduleSection}
            </>
          )}

          {/* Pay: payment options forms */}
          {activeTab === 'pay' && (
            <div className={panelClass}>
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex" aria-label="Tabs">
                  <button
                    onClick={() => {
                      setShowPaymentForm(false);
                      setShowDepositForm(false);
                      setShowUtilityDepositForm(false);
                      setShowManualPaymentForm(false);
                    }}
                    className={`flex-1 border-b-2 px-6 py-4 text-center text-sm font-medium ${
                      !showPaymentForm &&
                      !showDepositForm &&
                      !showUtilityDepositForm &&
                      !showManualPaymentForm
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <CreditCard className="mx-auto mb-1 h-5 w-5" />
                    Rent Payment
                  </button>
                  <button
                    onClick={() => {
                      setShowPaymentForm(false);
                      setShowDepositForm(true);
                      setShowUtilityDepositForm(false);
                      setShowManualPaymentForm(false);
                    }}
                    className={`flex-1 border-b-2 px-6 py-4 text-center text-sm font-medium ${
                      showDepositForm
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <DollarSign className="mx-auto mb-1 h-5 w-5" />
                    Deposit & Advance
                  </button>
                  <button
                    onClick={() => {
                      setShowPaymentForm(false);
                      setShowDepositForm(false);
                      setShowUtilityDepositForm(true);
                      setShowManualPaymentForm(false);
                    }}
                    className={`flex-1 border-b-2 px-6 py-4 text-center text-sm font-medium ${
                      showUtilityDepositForm
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <AlertCircle className="mx-auto mb-1 h-5 w-5" />
                    Utility Deposit
                  </button>
                  <button
                    onClick={() => {
                      setShowPaymentForm(false);
                      setShowDepositForm(false);
                      setShowUtilityDepositForm(false);
                      setShowManualPaymentForm(true);
                    }}
                    className={`flex-1 border-b-2 px-6 py-4 text-center text-sm font-medium ${
                      showManualPaymentForm
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <CreditCard className="mx-auto mb-1 h-5 w-5" />
                    Manual Entry
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {!showPaymentForm &&
                  !showDepositForm &&
                  !showUtilityDepositForm &&
                  !showManualPaymentForm && (
                    <div>
                      <div className="mb-6 flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">Make a Payment</h3>
                          <p className="text-sm text-gray-900">
                            Send via GCash or bank transfer using the office number, then upload
                            your receipt screenshot
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="mb-2 text-2xl font-bold text-gray-900">
                            {formatCurrency(
                              balanceData?.nextAmount || paymentData?.nextAmount || 0
                            )}
                          </div>
                          <div className="mb-4 text-sm text-gray-900">
                            Due:{' '}
                            {formatDate(
                              balanceData?.nextDueDate || paymentData?.nextDueDate || ''
                            )}
                          </div>
                          {!isPreview && (
                            <Button
                              variant="success"
                              size="lg"
                              onClick={() => handleMakePayment()}
                              leftIcon={<CreditCard className="h-5 w-5" />}
                            >
                              Pay Now
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                {showPaymentForm && (
                  <div>
                    <div className="mb-6 flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">Make a Payment</h3>
                      <button
                        onClick={() => setShowPaymentForm(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <PaymentForm
                      key={`${payDraft?.invoiceId || 'any'}-${payDraft?.preferPartial ? 'partial' : 'full'}`}
                      invoices={
                        paymentData?.schedule?.map((item) => ({
                          id: item.id,
                          invoiceNumber: item.invoiceNumber,
                          dueDate: item.dueDate,
                          balanceDue: item.balanceDue,
                          totalAmount: item.totalAmount,
                          status: item.status,
                        })) || []
                      }
                      initialInvoiceId={payDraft?.invoiceId}
                      initialAmount={payDraft?.amount}
                      preferPartial={payDraft?.preferPartial}
                      onPaymentComplete={handlePaymentComplete}
                      onCancel={() => {
                        setShowPaymentForm(false);
                        setPayDraft(null);
                      }}
                    />
                  </div>
                )}

                {showDepositForm && (
                  <div>
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          Add Deposit or Advance
                        </h3>
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

                {showUtilityDepositForm && (
                  <div>
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">Add Utility Deposit</h3>
                        {utilityDepositData && utilityDepositData.hasAssignment && (
                          <p className="mt-1 text-sm text-gray-600">
                            Current Utility Deposit:{' '}
                            {formatCurrency(utilityDepositData.utilityDepositPaid)} | Room:{' '}
                            {utilityDepositData.roomNumber} | Building:{' '}
                            {utilityDepositData.buildingName}
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
                      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                        <p className="text-yellow-800">
                          You don&apos;t have an active room assignment. Please contact admin to
                          assign you to a room first.
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

                {showManualPaymentForm && (
                  <div>
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          Manual Payment Entry
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">
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
          )}

          {/* Upload: dedicated panel to attach receipt + link payment date */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              <ReceiptUploadPanel
                options={receiptLinkOptions}
                onUploadComplete={handleReceiptUploadComplete}
              />
              {paymentData.recentPayments.length > 0 && (
                <div className={cn(theme.cardPad, 'text-sm', theme.body)}>
                  You can also upload against an existing payment from History after it appears below.
                </div>
              )}
            </div>
          )}

          {/* History: schedule + utilities + payments */}
          {activeTab === 'history' && (
            <>
              {paymentScheduleSection}
              {paymentData && paymentData.utilityBills.length > 0 && (
                <div className={cn(panelClass, 'mt-6')}>
                  <div className="px-4 py-5 sm:p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-medium leading-6 text-gray-900">
                        Utility bills
                      </h3>
                      <span className="text-sm text-gray-500">
                        {paymentData.utilityBills.length} bill
                        {paymentData.utilityBills.length === 1 ? '' : 's'} for your unit
                      </span>
                    </div>
                    <div className="overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                              Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                              Period
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                              Due
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                              Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {paymentData.utilityBills.map((bill) => (
                            <tr key={bill.id}>
                              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium capitalize text-gray-900">
                                {bill.utilityType}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                {formatDate(bill.billingPeriodStart)} –{' '}
                                {formatDate(bill.billingPeriodEnd)}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                {formatDate(bill.dueDate)}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                                {formatCurrency(bill.amount)}
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 text-sm">
                                <span
                                  className={cn(
                                    'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize',
                                    bill.status === 'paid'
                                      ? 'bg-green-100 text-green-800'
                                      : bill.status === 'pending'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-red-100 text-red-800'
                                  )}
                                >
                                  {bill.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              {paymentHistorySection}
            </>
          )}
        </div>
      )}

      {/* Receipt Upload Modal — shared across tabs */}
      {selectedPaymentForReceipt && (
        <div className={cn('fixed inset-0 z-50 flex h-full w-full items-center justify-center overflow-y-auto', theme.shellOverlay)}>
          <div className={cn('relative m-4 w-full max-w-2xl shadow-xl', theme.formPanel)}>
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
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
    </div>
  );
} 