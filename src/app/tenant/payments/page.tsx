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
  X,
  Printer,
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import {
  Button,
  EmptyState,
  SearchInput,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { FormField } from '@/components/forms/FormField';
import {
  InvoiceStatusBadge,
  PaymentStatusBadge,
  PaymentTypeBadge,
} from '@/components/domain/StatusBadges';
import ReceiptUpload from '@/components/features/tenant/ReceiptUpload';
import { ReceiptUploadPanel, type ReceiptLinkOption } from '@/components/features/tenant/ReceiptUploadPanel';
import PaymentForm from '@/components/features/tenant/PaymentForm';
import DepositPaymentForm from '@/components/features/tenant/DepositPaymentForm';
import UtilityDepositForm from '@/components/features/tenant/UtilityDepositForm';
import { formatPaymentMethodLabel } from '@/lib/constants/payment-methods';
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
import { looksLikeImage, useImageLightbox } from '@/components/ui/ImageLightbox';

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
  upcoming: PaymentScheduleItem[];
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
  const upcoming = (paymentsData.upcoming || []) as PaymentScheduleItem[];
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
    upcoming,
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
  const [advanceCollected, setAdvanceCollected] = useState<number>(0);
  const [advanceRemaining, setAdvanceRemaining] = useState<number>(0);
  const [advanceApplied, setAdvanceApplied] = useState<number>(0);
  const [advanceAppliedPeriod, setAdvanceAppliedPeriod] = useState<string | null>(null);
  const [utilityDepositData, setUtilityDepositData] = useState<any>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [payDraft, setPayDraft] = useState<{
    invoiceId?: string;
    amount?: number;
    preferPartial?: boolean;
  } | null>(null);
  const { showNotification } = useNotifications();
  const { open: openLightbox } = useImageLightbox();

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
        setAdvanceCollected(Number(data.data.advanceCollected) || 0);
        setAdvanceRemaining(
          Number(data.data.advanceRemaining ?? data.data.advanceBalance) || 0
        );
        setAdvanceApplied(Number(data.data.advanceApplied) || 0);
        setAdvanceAppliedPeriod(data.data.advanceAppliedPeriod || null);
      } else {
        console.warn('Failed to fetch deposit data:', data.error);
        setDepositBalance(0);
        setAdvanceCollected(0);
        setAdvanceRemaining(0);
        setAdvanceApplied(0);
        setAdvanceAppliedPeriod(null);
      }
    } catch (error) {
      // Non-critical error - page can still function without deposit data
      console.warn('Error fetching deposit data (non-critical):', error);
      setDepositBalance(0);
      setAdvanceCollected(0);
      setAdvanceRemaining(0);
      setAdvanceApplied(0);
      setAdvanceAppliedPeriod(null);
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

  const handleDownloadReceipt = async (paymentId: string, fileName?: string) => {
    const receiptUrl = `/api/tenant/payments/${paymentId}/receipt`;
    if (looksLikeImage({ fileName, url: receiptUrl })) {
      openLightbox({
        src: receiptUrl,
        alt: fileName || 'Payment receipt',
        title: fileName || 'Payment receipt',
      });
      return;
    }

    try {
      const response = await fetch(receiptUrl);
      if (!response.ok) {
        window.open(receiptUrl, '_blank');
        return;
      }
      const blob = await response.blob();
      if (looksLikeImage({ mimeType: blob.type, fileName })) {
        const objectUrl = URL.createObjectURL(blob);
        openLightbox({
          src: objectUrl,
          alt: fileName || 'Payment receipt',
          title: fileName || 'Payment receipt',
        });
        return;
      }
      window.open(receiptUrl, '_blank');
    } catch {
      window.open(receiptUrl, '_blank');
    }
  };

  const handlePrintReceipt = (paymentId: string) => {
    // Open printable receipt PDF in new tab
    window.open(`/api/tenant/payments/${paymentId}/print`, '_blank');
  };

  const handleReceiptUploadComplete = () => {
    refreshFinancials();
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
      day: 'numeric',
    });
  };

  const formatPeriod = (item: PaymentScheduleItem) => {
    const raw = item.billingPeriodStart || item.dueDate;
    if (!raw) return 'Rent';
    return new Date(raw).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const toFormInvoice = (item: PaymentScheduleItem, payAhead: boolean) => ({
    id: item.id,
    invoiceNumber: item.invoiceNumber,
    dueDate: item.dueDate,
    balanceDue: item.balanceDue,
    totalAmount: item.totalAmount,
    status: item.status,
    periodLabel: formatPeriod(item),
    payAhead,
  });

  const dueNowInvoices = (paymentData?.schedule || []).map((item) =>
    toFormInvoice(item, false)
  );
  const payAheadInvoices = (paymentData?.upcoming || []).map((item) =>
    toFormInvoice(item, true)
  );
  const payableInvoices = [...dueNowInvoices, ...payAheadInvoices];

  const advanceHint = (() => {
    if (advanceCollected <= 0) return 'No advance on file';
    if (advanceRemaining > 0 && advanceApplied > 0) {
      const period = advanceAppliedPeriod ? ` to ${advanceAppliedPeriod} rent` : '';
      return `${formatCurrency(advanceRemaining)} left · ${formatCurrency(advanceApplied)} applied${period}`;
    }
    if (advanceRemaining > 0) return 'Available for upcoming rent';
    if (advanceApplied > 0) {
      return advanceAppliedPeriod
        ? `Applied to ${advanceAppliedPeriod} rent`
        : 'Applied to rent';
    }
    return 'On file';
  })();

  const nextDueHint = paymentData?.nextDueDate
    ? `Due ${formatDate(paymentData.nextDueDate)}`
    : 'No invoice issued yet';
  const nextDueValue =
    paymentData?.nextAmount && paymentData.nextAmount > 0
      ? formatCurrency(paymentData.nextAmount)
      : 'None';
  const pastDueAmount =
    balanceData?.pastDueTotal ?? balanceData?.total ?? paymentData?.totalOverdue ?? 0;
  const paidHistoryCount = (paymentData?.recentPayments || []).filter(
    (payment) => payment.status === 'paid' || payment.status === 'partial'
  ).length;

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
  for (const item of payableInvoices) {
    receiptLinkOptions.push({
      value: `invoice:${item.id}`,
      label: `${item.payAhead ? 'Pay ahead' : 'Due'} ${item.periodLabel} · ${formatCurrency(item.balanceDue)} (${item.invoiceNumber || 'invoice'})`,
      kind: 'invoice',
      invoiceId: item.id,
      defaultAmount: item.balanceDue,
      defaultDate: item.dueDate,
    });
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentData.schedule.map((item) => {
                  const isOverdue =
                    new Date(item.dueDate) < new Date() && item.status === 'overdue';
                  return (
                    <TableRow
                      key={item.id}
                      className={isOverdue ? 'bg-red-50 hover:bg-red-50' : undefined}
                    >
                      <TableCell className="font-medium">{item.invoiceNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="mr-1 h-4 w-4 text-gray-400" />
                          {formatDate(item.dueDate)}
                          {isOverdue && (
                            <span className="ml-2 text-xs font-medium text-red-600">Overdue</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(item.balanceDue)}
                      </TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={item.status} />
                      </TableCell>
                      <TableCell>
                        {item.buildingName && item.roomNumber ? (
                          <div>
                            <div className="font-medium">{item.buildingName}</div>
                            <div className="text-xs text-gray-500">Room {item.roomNumber}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
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
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
              <SearchInput
                id="payment-search"
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell>
                    {payment.method ? (
                      <span>
                        {formatPaymentMethodLabel(payment.method)}
                      </span>
                    ) : (
                      <span className="italic text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {payment.type ? (
                      <PaymentTypeBadge type={payment.type} />
                    ) : (
                      <span className="italic text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {payment.status ? (
                      <PaymentStatusBadge status={payment.status} />
                    ) : (
                      <span className="italic text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>{formatPaymentNotesLabel(payment.description)}</TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            title={
              searchTerm || filterStatus !== 'all'
                ? 'No payments found matching your criteria.'
                : 'No payment history available.'
            }
            action={
              searchTerm || filterStatus !== 'all' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        )}
      </div>
    </div>
  );

  return (
    <div className={theme.pagePad}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className={theme.title}>Payments</h1>
        {!isPreview && activeTab === 'overview' && (
          <Button
            variant="success"
            size="lg"
            onClick={() => setTab('pay')}
            leftIcon={<CreditCard className="h-5 w-5" />}
            className={theme.primaryButton}
          >
            Pay now
          </Button>
        )}
      </div>

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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className={cn(summaryCardClass, 'p-4 sm:p-5')}>
                  <div className="flex items-start gap-3">
                    <DollarSign className={cn('h-5 w-5 shrink-0', theme.iconMoney)} />
                    <div className="min-w-0">
                      <p className={theme.label}>Total paid</p>
                      <p className={theme.value}>{formatCurrency(paymentData?.totalPaid)}</p>
                      <p className={theme.subtle}>
                        {paidHistoryCount === 1
                          ? '1 payment in history'
                          : `${paidHistoryCount} payments in history`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={cn(summaryCardClass, 'p-4 sm:p-5')}>
                  <div className="flex items-start gap-3">
                    <Calendar className={cn('h-5 w-5 shrink-0', theme.iconInfo)} />
                    <div className="min-w-0">
                      <p className={theme.label}>Next due</p>
                      <p className={theme.value}>{nextDueValue}</p>
                      <p className={theme.subtle}>{nextDueHint}</p>
                    </div>
                  </div>
                </div>

                <div className={cn(summaryCardClass, 'p-4 sm:p-5')}>
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      className={cn(
                        'h-5 w-5 shrink-0',
                        pastDueAmount > 0 ? theme.iconDanger : theme.iconSuccess
                      )}
                    />
                    <div className="min-w-0">
                      <p className={theme.label}>Past due</p>
                      <p className={theme.value}>{formatCurrency(pastDueAmount)}</p>
                      <p className={theme.subtle}>
                        {pastDueAmount > 0 ? 'Please pay as soon as you can' : "You're up to date"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className={cn(summaryCardClass, 'p-4 sm:p-5')}>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className={cn('h-5 w-5 shrink-0', theme.iconSuccess)} />
                    <div className="min-w-0">
                      <p className={theme.label}>Deposit held</p>
                      <p className={theme.value}>{formatCurrency(depositBalance || 0)}</p>
                      <p className={theme.subtle}>
                        {(depositBalance || 0) > 0
                          ? 'Security deposit on file'
                          : 'No deposit on file'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={cn(summaryCardClass, 'p-4 sm:p-5')}>
                  <div className="flex items-start gap-3">
                    <Clock className={cn('h-5 w-5 shrink-0', theme.iconPending)} />
                    <div className="min-w-0">
                      <p className={theme.label}>Advance paid</p>
                      <p className={theme.value}>{formatCurrency(advanceCollected)}</p>
                      <p className={theme.subtle}>{advanceHint}</p>
                    </div>
                  </div>
                </div>
              </div>

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
                    <div className="space-y-5">
                      <div>
                        <h3 className={theme.sectionTitle}>Make a payment</h3>
                        <p className={cn('mt-1', theme.muted)}>
                          Send via GCash or bank transfer using the office number, then upload
                          your receipt screenshot.
                        </p>
                      </div>

                      {dueNowInvoices.length === 0 && payAheadInvoices.length === 0 ? (
                        <div className={cn(theme.card, 'p-5')}>
                          <p className={theme.sectionTitle}>Nothing to pay right now</p>
                          <p className={cn('mt-2', theme.muted)}>
                            You have no open rent invoices.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {dueNowInvoices.length > 0 && (
                            <div className="space-y-3">
                              <h4 className={theme.sectionTitle}>Due now</h4>
                              <ul className="space-y-3">
                                {dueNowInvoices.map((item) => (
                                  <li
                                    key={item.id}
                                    className={cn(
                                      theme.card,
                                      'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between'
                                    )}
                                  >
                                    <div className="min-w-0">
                                      <p className={theme.value}>
                                        {formatCurrency(item.balanceDue)}
                                      </p>
                                      <p className={theme.muted}>
                                        {item.periodLabel} rent · due {formatDate(item.dueDate)}
                                      </p>
                                      <p className={theme.subtle}>{item.invoiceNumber}</p>
                                    </div>
                                    {!isPreview && (
                                      <Button
                                        variant="success"
                                        onClick={() =>
                                          handleMakePayment({
                                            invoiceId: item.id,
                                            amount: item.balanceDue,
                                          })
                                        }
                                        leftIcon={<CreditCard className="h-5 w-5" />}
                                        className={theme.primaryButton}
                                      >
                                        Pay this bill
                                      </Button>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {payAheadInvoices.length > 0 && (
                            <div className="space-y-3">
                              <div>
                                <h4 className={theme.sectionTitle}>Pay ahead</h4>
                                <p className={cn('mt-1', theme.muted)}>
                                  {dueNowInvoices.length === 0
                                    ? "You're current. You can pay upcoming rent now if you want."
                                    : 'Pay the next month before the invoice is issued. The office still confirms your receipt.'}
                                </p>
                              </div>
                              <ul className="space-y-3">
                                {payAheadInvoices.map((item) => (
                                  <li
                                    key={item.id}
                                    className={cn(
                                      theme.card,
                                      'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between'
                                    )}
                                  >
                                    <div className="min-w-0">
                                      <p className={theme.value}>
                                        {formatCurrency(item.balanceDue)}
                                      </p>
                                      <p className={theme.muted}>
                                        {item.periodLabel} rent · due {formatDate(item.dueDate)}
                                      </p>
                                      <p className={theme.subtle}>{item.invoiceNumber}</p>
                                    </div>
                                    {!isPreview && (
                                      <Button
                                        variant="outline"
                                        onClick={() =>
                                          handleMakePayment({
                                            invoiceId: item.id,
                                            amount: item.balanceDue,
                                          })
                                        }
                                        leftIcon={<CreditCard className="h-5 w-5" />}
                                      >
                                        Pay ahead
                                      </Button>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
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
                      invoices={payableInvoices}
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
                          {(depositBalance || 0) > 0 || advanceCollected > 0
                            ? 'Deposit & Advance'
                            : 'Add Deposit or Advance'}
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
                      depositHeld={depositBalance || 0}
                      advanceCollected={advanceCollected}
                      advanceHint={advanceHint}
                    />
                  </div>
                )}

                {showUtilityDepositForm && (
                  <div>
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {Number(utilityDepositData?.utilityDepositPaid) > 0
                            ? 'Utility Deposit'
                            : 'Add Utility Deposit'}
                        </h3>
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
                        amountPaid={Number(utilityDepositData?.utilityDepositPaid) || 0}
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
                          Choose the invoice this payment applies to, then enter the amount
                          and receipt.
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
                      invoices={payableInvoices}
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
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead>Due</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentData.utilityBills.map((bill) => (
                          <TableRow key={bill.id}>
                            <TableCell className="font-medium capitalize">
                              {bill.utilityType}
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {formatDate(bill.billingPeriodStart)} –{' '}
                              {formatDate(bill.billingPeriodEnd)}
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {formatDate(bill.dueDate)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(bill.amount)}
                            </TableCell>
                            <TableCell>
                              <InvoiceStatusBadge status={bill.status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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