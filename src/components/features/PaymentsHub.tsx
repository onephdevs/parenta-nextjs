'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  EmptyState,
  Pagination,
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
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatPaymentMethodLabel } from '@/lib/constants/payment-methods';
import { extractInvoiceNumberFromNotes } from '@/lib/format/payment-claim-display';
import type { PaymentWithDetails } from '@/lib/api/payments';
import type {
  PaymentPeriodOption,
  PaymentsHubRow,
} from '@/lib/api/payments-hub';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

interface PaymentsHubProps {
  rows: PaymentsHubRow[];
  pendingClaims?: PaymentWithDetails[];
  buildings: Array<{ id: string; name: string }>;
  periods: PaymentPeriodOption[];
  searchParams: Record<string, string | undefined>;
  total: number;
  page: number;
  totalPages: number;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function payNowHref(row: PaymentsHubRow) {
  const params = new URLSearchParams({
    tenantId: row.tenantId,
    amount: String(row.balance),
    invoiceId: row.id,
  });
  return `/admin/financial/payments/new?${params.toString()}`;
}

function receiptHref(row: PaymentsHubRow) {
  if (row.latestPaymentId) {
    return `/admin/financial/payments/${row.latestPaymentId}`;
  }
  return `/admin/financial/invoices/${row.id}`;
}

function statusPresentation(row: PaymentsHubRow) {
  if (row.uiStatus === 'paid') {
    return {
      status: 'paid' as const,
      label: 'Paid',
      tone: 'success' as const,
      subtext: row.paidAt ? formatDate(row.paidAt) : undefined,
    };
  }
  if (row.uiStatus === 'partially_paid') {
    return {
      status: 'partial' as const,
      label: 'Partially paid',
      tone: 'warning' as const,
      subtext: undefined,
    };
  }
  return {
    status: 'unpaid' as const,
    label: row.isOverdue ? 'Overdue' : 'Unpaid',
    tone: 'danger' as const,
    subtext: undefined,
  };
}

export default function PaymentsHub({
  rows,
  pendingClaims = [],
  buildings,
  periods,
  searchParams,
  total,
  page,
  totalPages,
}: PaymentsHubProps) {
  const router = useRouter();
  const [searchDraft, setSearchDraft] = useState(searchParams.search || '');
  const [dueDateDraft, setDueDateDraft] = useState(
    searchParams.dueDate || 'upcoming_month'
  );
  const [buildingDraft, setBuildingDraft] = useState(searchParams.buildingId || '');
  const [typeDraft, setTypeDraft] = useState(searchParams.type || '');
  const [statusDraft, setStatusDraft] = useState(searchParams.status || '');
  const [periodDraft, setPeriodDraft] = useState(searchParams.paymentPeriod || '');

  const applyFilters = (
    overrides: Partial<{
      search: string;
      dueDate: string;
      buildingId: string;
      type: string;
      status: string;
      paymentPeriod: string;
    }> = {}
  ) => {
    const next = {
      search: searchDraft,
      dueDate: dueDateDraft,
      buildingId: buildingDraft,
      type: typeDraft,
      status: statusDraft,
      paymentPeriod: periodDraft,
      ...overrides,
    };
    const params = new URLSearchParams();
    if (next.search.trim()) params.set('search', next.search.trim());
    if (next.dueDate) params.set('dueDate', next.dueDate);
    if (next.buildingId) params.set('buildingId', next.buildingId);
    if (next.type) params.set('type', next.type);
    if (next.status) params.set('status', next.status);
    if (next.paymentPeriod) params.set('paymentPeriod', next.paymentPeriod);
    params.set('page', '1');
    router.push(`/admin/financial/payments?${params.toString()}`);
  };

  useEffect(() => {
    setDueDateDraft(searchParams.dueDate || 'upcoming_month');
    setBuildingDraft(searchParams.buildingId || '');
    setTypeDraft(searchParams.type || '');
    setStatusDraft(searchParams.status || '');
    setPeriodDraft(searchParams.paymentPeriod || '');
  }, [
    searchParams.dueDate,
    searchParams.buildingId,
    searchParams.type,
    searchParams.status,
    searchParams.paymentPeriod,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchDraft === (searchParams.search || '')) return;
      applyFilters({ search: searchDraft });
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce search only
  }, [searchDraft]);

  const handlePageChange = (nextPage: number) => {
    const params = new URLSearchParams();
    if (searchParams.search) params.set('search', searchParams.search);
    if (searchParams.dueDate) params.set('dueDate', searchParams.dueDate);
    if (searchParams.buildingId) params.set('buildingId', searchParams.buildingId);
    if (searchParams.type) params.set('type', searchParams.type);
    if (searchParams.status) params.set('status', searchParams.status);
    if (searchParams.paymentPeriod) {
      params.set('paymentPeriod', searchParams.paymentPeriod);
    }
    params.set('page', String(nextPage));
    router.push(`/admin/financial/payments?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-amber-100 bg-amber-50 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-amber-950">
              Pending verification ({pendingClaims.length})
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-amber-900/80">
              Cross-check the receipt if one is attached, then confirm. Reference
              number is optional for now — ledger imports often have none.
            </p>
          </div>
        </div>
        {pendingClaims.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-500">
            No payments waiting for verification.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingClaims.map((payment) => {
                const invoiceNumber = extractInvoiceNumberFromNotes(payment.notes);
                const method = formatPaymentMethodLabel(payment.paymentMethod);
                return (
                  <TableRow key={payment.id} className="hover:bg-amber-50/60">
                    <TableCell>
                      <p className="font-medium text-gray-900">{payment.tenantName}</p>
                      <p className="text-xs text-gray-500">
                        {[payment.buildingName, payment.roomNumber]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-xs text-gray-500">{method}</p>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {invoiceNumber || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-gray-700">
                      {payment.referenceNumber || payment.parentaTxnId || '—'}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {formatDate(payment.createdAt || payment.paymentDate)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/financial/payments/${payment.id}`}>
                        <Button size="sm">Review</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Collections</h2>
          <p className="mt-1 text-sm text-gray-500">
            Open invoices and paid collections for the selected period.
          </p>
        </div>

        <div className="border-b border-gray-100 px-5 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Search" htmlFor="payments-search">
              <SearchInput
                id="payments-search"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="Tenant, unit, or invoice"
              />
            </FormField>
            <FormField label="Due date" htmlFor="payments-due-date">
              <Select
                id="payments-due-date"
                value={dueDateDraft}
                onChange={(e) => {
                  const value = e.target.value;
                  setDueDateDraft(value);
                  applyFilters({ dueDate: value });
                }}
              >
                <option value="upcoming_month">Upcoming month</option>
                <option value="overdue">Overdue</option>
                <option value="this_week">This week</option>
                <option value="this_month">This month</option>
                <option value="next_30">Next 30 days</option>
                <option value="past">Past due dates</option>
                <option value="all">All due dates</option>
              </Select>
            </FormField>
            <FormField label="Property" htmlFor="payments-building">
              <Select
                id="payments-building"
                value={buildingDraft}
                onChange={(e) => {
                  const value = e.target.value;
                  setBuildingDraft(value);
                  applyFilters({ buildingId: value });
                }}
              >
                <option value="">All properties</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Type" htmlFor="payments-type">
              <Select
                id="payments-type"
                value={typeDraft}
                onChange={(e) => {
                  const value = e.target.value;
                  setTypeDraft(value);
                  applyFilters({ type: value });
                }}
              >
                <option value="">All types</option>
                <option value="rent">Rent</option>
                <option value="utilities">Utilities</option>
                <option value="deposit">Deposit</option>
                <option value="penalty">Penalty</option>
                <option value="other">Other</option>
              </Select>
            </FormField>
            <FormField label="Status" htmlFor="payments-status">
              <Select
                id="payments-status"
                value={statusDraft}
                onChange={(e) => {
                  const value = e.target.value;
                  setStatusDraft(value);
                  applyFilters({ status: value });
                }}
              >
                <option value="">All statuses</option>
                <option value="unpaid">Unpaid</option>
                <option value="partially_paid">Partially paid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </Select>
            </FormField>
            <FormField label="Payment period" htmlFor="payments-period">
              <Select
                id="payments-period"
                value={periodDraft}
                onChange={(e) => {
                  const value = e.target.value;
                  setPeriodDraft(value);
                  applyFilters({ paymentPeriod: value });
                }}
              >
                <option value="">All payment periods</option>
                {periods.map((period) => (
                  <option key={period.value} value={period.value}>
                    {period.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="No payments found"
            description="Try adjusting filters, or process a payment for an open invoice."
            action={
              <Link href="/admin/financial/payments/new">
                <Button size="sm">Process Payment</Button>
              </Link>
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount due</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const status = statusPresentation(row);
                  return (
                    <TableRow
                      key={row.id}
                      className={cn(row.isOverdue && row.uiStatus !== 'paid' && 'bg-red-50/70')}
                    >
                      <TableCell>
                        <p className="font-medium text-gray-900">{row.tenantName}</p>
                        <p className="text-xs text-gray-500">
                          {[row.buildingName, row.roomNumber].filter(Boolean).join(' · ') ||
                            '—'}
                        </p>
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">
                        {row.invoiceNumber || '—'}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          {formatDate(row.dueDate)}
                          {row.isOverdue && row.uiStatus !== 'paid' ? (
                            <span
                              className="inline-block h-1.5 w-1.5 rounded-full bg-red-500"
                              aria-label="Overdue"
                            />
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-700">{row.typeLabel}</TableCell>
                      <TableCell className="text-right font-medium text-gray-900">
                        {formatCurrency(row.amountDue)}
                      </TableCell>
                      <TableCell className="text-right text-gray-700">
                        {formatCurrency(row.amountPaid)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-medium',
                          row.balance > 0 ? 'text-red-600' : 'text-gray-900'
                        )}
                      >
                        {formatCurrency(row.balance)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={status.status}
                          label={status.label}
                          tone={status.tone}
                          subtext={status.subtext}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {row.uiStatus === 'paid' ? (
                          <Link href={receiptHref(row)}>
                            <Button size="sm" variant="outline">
                              View Receipt
                            </Button>
                          </Link>
                        ) : (
                          <Link href={payNowHref(row)}>
                            <Button size="sm">Process Payment</Button>
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="border-t border-gray-100 px-2 py-2">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={total}
                itemsPerPage={PAGE_SIZE}
                onPageChange={handlePageChange}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
