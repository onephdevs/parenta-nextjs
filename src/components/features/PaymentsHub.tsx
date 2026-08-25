'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  EmptyState,
  FilterBar,
  Pagination,
  SearchInput,
  Select,
  TableCard,
  WorkItemRow,
} from '@/components/ui';
import { FormField } from '@/components/forms/FormField';
import { Button } from '@/components/ui/Button';
import { useListQuery } from '@/hooks/useListQuery';
import { formatPaymentMethodLabel } from '@/lib/constants/payment-methods';
import { extractInvoiceNumberFromNotes } from '@/lib/format/payment-claim-display';
import type { PaymentWithDetails } from '@/lib/api/payments';
import type {
  PaymentPeriodOption,
  PaymentsHubRow,
} from '@/lib/api/payments-hub';
import { formatShortDate } from '@/lib/utils';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { WorkItemTone } from '@/components/ui/WorkItemRow';

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

function typeBadgeKey(label: string): string {
  const key = label.trim().toLowerCase();
  if (key === 'penalty' || key === 'late fee') return 'fee';
  return key;
}

function typeTone(label: string): WorkItemTone {
  const key = typeBadgeKey(label);
  if (key === 'rent') return 'info';
  if (key === 'deposit') return 'purple';
  if (key === 'fee') return 'warning';
  if (key === 'utilities') return 'success';
  return 'neutral';
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
  const { navigateList } = useListQuery();
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
    navigateList(`/admin/financial/payments?${params.toString()}`);
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

  const activeFilterCount = [
    dueDateDraft && dueDateDraft !== 'upcoming_month' ? dueDateDraft : '',
    buildingDraft,
    typeDraft,
    statusDraft,
    periodDraft,
  ].filter(Boolean).length;

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
    navigateList(`/admin/financial/payments?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <TableCard
        title={`Pending verification (${pendingClaims.length})`}
        description="Cross-check the receipt if one is attached, then confirm. Reference number is optional for now — ledger imports often have none."
        className="border-amber-200"
      >
        {pendingClaims.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-500">
            No payments waiting for verification.
          </p>
        ) : (
          pendingClaims.map((payment) => {
            const invoiceNumber = extractInvoiceNumberFromNotes(payment.notes);
            const method = formatPaymentMethodLabel(payment.paymentMethod);
            const location =
              [payment.buildingName, payment.roomNumber].filter(Boolean).join(' · ') || null;
            return (
              <WorkItemRow
                key={payment.id}
                href={`/admin/financial/payments/${payment.id}`}
                title={payment.tenantName || 'Payment'}
                subtitle={location || invoiceNumber}
                badges={[
                  { key: 'status', label: 'Pending', tone: 'warning' },
                  ...(method ? [{ key: 'method', label: method, tone: 'neutral' as const }] : []),
                  ...(invoiceNumber
                    ? [{ key: 'invoice', label: invoiceNumber, tone: 'info' as const }]
                    : []),
                ]}
                date={formatShortDate(payment.createdAt || payment.paymentDate)}
                metaLabel="Awaiting verification"
                metaDetail={formatCurrency(payment.amount)}
                metaTone="warning"
                dotTone="warning"
                trailingIcon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
              />
            );
          })
        )}
      </TableCard>

      <FilterBar
        columns={5}
        collapsible
        activeCount={activeFilterCount}
        search={
          <SearchInput
            id="payments-search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Tenant, unit, or invoice"
            aria-label="Search payments"
          />
        }
        footer={
          <p className="text-sm text-gray-600">
            Showing {rows.length} of {total} payments
          </p>
        }
      >
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
      </FilterBar>

      <TableCard
        title="Collections"
        description="Open invoices and paid collections for the selected period."
      >
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
            {rows.map((row) => {
              const status = statusPresentation(row);
              const location =
                [row.buildingName, row.roomNumber].filter(Boolean).join(' · ') || null;
              return (
                <WorkItemRow
                  key={row.id}
                  href={row.uiStatus === 'paid' ? receiptHref(row) : payNowHref(row)}
                  title={row.tenantName || 'Payment'}
                  subtitle={location || row.invoiceNumber}
                  badges={[
                    { key: 'status', label: status.label, tone: status.tone },
                    {
                      key: 'type',
                      label: row.typeLabel,
                      tone: typeTone(row.typeLabel),
                    },
                    ...(row.invoiceNumber
                      ? [{ key: 'invoice', label: row.invoiceNumber, tone: 'neutral' as const }]
                      : []),
                  ]}
                  date={formatShortDate(row.dueDate)}
                  metaLabel={status.label}
                  metaDetail={formatCurrency(row.balance > 0 ? row.balance : row.amountDue)}
                  metaTone={
                    status.tone === 'danger'
                      ? 'danger'
                      : status.tone === 'warning'
                        ? 'warning'
                        : 'muted'
                  }
                  dotTone={status.tone}
                  trailingIcon={
                    status.status === 'paid' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : status.tone === 'danger' ? (
                      <AlertTriangle className="h-4 w-4 text-rose-500" />
                    ) : null
                  }
                />
              );
            })}

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
      </TableCard>
    </div>
  );
}
