'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Banknote,
  Building2,
  CreditCard,
  Eye,
  Smartphone,
  Wallet,
} from 'lucide-react';
import {
  Alert,
  EmptyState,
  FilterBar,
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
import { InvoiceStatusBadge } from '@/components/domain/StatusBadges';
import type { PaymentWithDetails } from '@/lib/api/payments';
import type { UpcomingDueItem } from '@/lib/api/payments-hub';

const PAGE_SIZE = 20;

interface PaymentsHubProps {
  upcoming: UpcomingDueItem[];
  history: PaymentWithDetails[];
  pendingClaims?: PaymentWithDetails[];
  buildings: Array<{ id: string; name: string }>;
  searchParams: Record<string, string | undefined>;
  historyTotal: number;
  historyPage: number;
  historyTotalPages: number;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function tenantUnitLabel(tenantName: string, roomNumber?: string | null) {
  if (roomNumber) return `${tenantName} · ${roomNumber}`;
  return tenantName;
}

function formatPaymentMethod(method?: string | null) {
  switch ((method || '').toLowerCase()) {
    case 'bank_transfer':
      return { label: 'Bank transfer', Icon: Building2 };
    case 'credit_card':
    case 'online':
      return { label: 'Card (online)', Icon: CreditCard };
    case 'cash':
      return { label: 'Cash', Icon: Banknote };
    case 'check':
      return { label: 'Check', Icon: Wallet };
    case 'gcash':
      return { label: 'GCash', Icon: Smartphone };
    default:
      return { label: method ? method.replace(/_/g, ' ') : '—', Icon: Wallet };
  }
}

function payNowHref(item: UpcomingDueItem) {
  const params = new URLSearchParams({
    tenantId: item.tenantId,
    amount: String(item.remainingAmount),
    invoiceId: item.id,
  });
  return `/admin/financial/payments/new?${params.toString()}`;
}

export default function PaymentsHub({
  upcoming,
  history,
  pendingClaims = [],
  buildings,
  searchParams,
  historyTotal,
  historyPage,
  historyTotalPages,
}: PaymentsHubProps) {
  const router = useRouter();
  const [searchDraft, setSearchDraft] = useState(searchParams.search || '');
  const [statusDraft, setStatusDraft] = useState(searchParams.status || '');
  const [buildingDraft, setBuildingDraft] = useState(searchParams.buildingId || '');

  const applyFilters = (
    overrides: Partial<{ search: string; status: string; buildingId: string }> = {}
  ) => {
    const next = {
      search: searchDraft,
      status: statusDraft,
      buildingId: buildingDraft,
      ...overrides,
    };
    const params = new URLSearchParams();
    if (next.search.trim()) params.set('search', next.search.trim());
    if (next.status) params.set('status', next.status);
    if (next.buildingId) params.set('buildingId', next.buildingId);
    params.set('page', '1');
    router.push(`/admin/financial/payments?${params.toString()}`);
  };

  useEffect(() => {
    setStatusDraft(searchParams.status || '');
    setBuildingDraft(searchParams.buildingId || '');
  }, [searchParams.status, searchParams.buildingId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchDraft === (searchParams.search || '')) return;
      applyFilters({ search: searchDraft });
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce search only
  }, [searchDraft]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    if (searchParams.search) params.set('search', searchParams.search);
    if (searchParams.status) params.set('status', searchParams.status);
    if (searchParams.buildingId) params.set('buildingId', searchParams.buildingId);
    params.set('page', String(page));
    router.push(`/admin/financial/payments?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <FilterBar columns={4}>
        <FormField label="Search" htmlFor="payments-search">
          <SearchInput
            id="payments-search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Tenant, unit..."
          />
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
            <option value="">All Status</option>
            <option value="due">Due</option>
            <option value="overdue">Overdue</option>
            <option value="paid">Paid</option>
          </Select>
        </FormField>
        <FormField label="Building" htmlFor="payments-building">
          <Select
            id="payments-building"
            value={buildingDraft}
            onChange={(e) => {
              const value = e.target.value;
              setBuildingDraft(value);
              applyFilters({ buildingId: value });
            }}
          >
            <option value="">All Buildings</option>
            {buildings.map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
          </Select>
        </FormField>
      </FilterBar>

      {pendingClaims.length > 0 && (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <Alert
            variant="warning"
            title={`Pending verification (${pendingClaims.length})`}
            className="rounded-none border-x-0 border-t-0"
          >
            Cross-check Transaction ID against the receipt, then confirm.
          </Alert>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant / Unit</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingClaims.map((payment) => (
                <TableRow key={payment.id} className="hover:bg-amber-50/60">
                  <TableCell className="font-medium">
                    {tenantUnitLabel(payment.tenantName, payment.roomNumber)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell className="font-mono">
                    {payment.referenceNumber || '—'}
                  </TableCell>
                  <TableCell>
                    {formatDate(payment.createdAt || payment.paymentDate)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/financial/payments/${payment.id}`}
                      className="inline-flex text-gray-500 hover:text-gray-900"
                      title="Review"
                    >
                      <Eye className="h-5 w-5" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="border-b border-gray-100 px-6 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Upcoming & due</h2>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState
            title="Nothing due right now"
            description="Open invoices with remaining balances will appear here."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant / Unit</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Penalty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcoming.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {tenantUnitLabel(item.tenantName, item.roomNumber)}
                  </TableCell>
                  <TableCell>{formatDate(item.dueDate)}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(item.remainingAmount)}
                  </TableCell>
                  <TableCell>
                    {item.penaltyAmount > 0 ? (
                      <span className="font-medium text-red-600">
                        {formatCurrency(item.penaltyAmount)}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={item.uiStatus} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={payNowHref(item)}
                      className="text-sm font-medium text-gray-700 hover:text-gray-900"
                    >
                      Pay now
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="border-b border-gray-100 px-6 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Transaction history</h2>
        </div>
        {history.length === 0 ? (
          <EmptyState
            title="No payments recorded"
            description="Recorded payments will show up in this history."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant / Unit</TableHead>
                  <TableHead>Paid On</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((payment) => {
                  const method = formatPaymentMethod(payment.paymentMethod);
                  const MethodIcon = method.Icon;
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {tenantUnitLabel(payment.tenantName, payment.roomNumber)}
                      </TableCell>
                      <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          <MethodIcon className="h-3.5 w-3.5 text-gray-400" />
                          {method.label}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-gray-600">
                        {payment.referenceNumber || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/admin/financial/payments/${payment.id}`}
                          className="inline-flex text-gray-500 hover:text-gray-900"
                          title="View"
                        >
                          <Eye className="h-5 w-5" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <Pagination
              currentPage={historyPage}
              totalPages={historyTotalPages}
              totalItems={historyTotal}
              itemsPerPage={PAGE_SIZE}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </div>
  );
}
