'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Banknote,
  Building2,
  CreditCard,
  Eye,
  Search,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/forms/FormField';
import Pagination from '@/components/ui/Pagination';
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
      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Search" htmlFor="payments-search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="payments-search"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="Tenant, unit..."
                className="pl-10"
              />
            </div>
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
        </div>
      </Card>

      {pendingClaims.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-amber-200 bg-white shadow">
          <div className="border-b border-amber-100 bg-amber-50 px-6 py-3">
            <h2 className="text-sm font-semibold text-amber-950">
              Pending verification ({pendingClaims.length})
            </h2>
            <p className="text-xs text-amber-900">
              Cross-check Transaction ID against the receipt, then confirm.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Tenant / Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Transaction ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {pendingClaims.map((payment) => (
                  <tr key={payment.id} className="hover:bg-amber-50/60">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {tenantUnitLabel(payment.tenantName, payment.roomNumber)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-gray-900">
                      {payment.referenceNumber || '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {formatDate(payment.createdAt || payment.paymentDate)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <Link
                        href={`/admin/financial/payments/${payment.id}`}
                        className="inline-flex text-gray-500 hover:text-gray-900"
                        title="Review"
                      >
                        <Eye className="h-5 w-5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="border-b border-gray-100 px-6 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Upcoming & due</h2>
        </div>
        {upcoming.length === 0 ? (
          <div className="p-8 text-center text-gray-900">
            <p className="mb-2 text-lg font-medium">Nothing due right now</p>
            <p className="text-sm text-gray-600">
              Open invoices with remaining balances will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Tenant / Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Penalty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {upcoming.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {tenantUnitLabel(item.tenantName, item.roomNumber)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {formatDate(item.dueDate)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(item.remainingAmount)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {item.penaltyAmount > 0 ? (
                        <span className="font-medium text-red-600">
                          {formatCurrency(item.penaltyAmount)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <InvoiceStatusBadge status={item.uiStatus} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <Link
                        href={payNowHref(item)}
                        className="text-sm font-medium text-gray-700 hover:text-gray-900"
                      >
                        Pay now
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="border-b border-gray-100 px-6 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Transaction history</h2>
        </div>
        {history.length === 0 ? (
          <div className="p-8 text-center text-gray-900">
            <p className="mb-2 text-lg font-medium">No payments recorded</p>
            <p className="text-sm text-gray-600">
              Recorded payments will show up in this history.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      Tenant / Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      Paid On
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-900">
                      Reference
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {history.map((payment) => {
                    const method = formatPaymentMethod(payment.paymentMethod);
                    const MethodIcon = method.Icon;
                    return (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {tenantUnitLabel(payment.tenantName, payment.roomNumber)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {formatDate(payment.paymentDate)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          <span className="inline-flex items-center gap-1.5">
                            <MethodIcon className="h-3.5 w-3.5 text-gray-400" />
                            {method.label}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-gray-600">
                          {payment.referenceNumber || '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                          <Link
                            href={`/admin/financial/payments/${payment.id}`}
                            className="inline-flex text-gray-500 hover:text-gray-900"
                            title="View"
                          >
                            <Eye className="h-5 w-5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

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
