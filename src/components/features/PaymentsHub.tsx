'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Banknote,
  Building2,
  CreditCard,
  Search,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { InvoiceStatusBadge } from '@/components/domain/StatusBadges';
import type { PaymentWithDetails } from '@/lib/api/payments';
import type { UpcomingDueItem } from '@/lib/api/payments-hub';

interface PaymentsHubProps {
  upcoming: UpcomingDueItem[];
  history: PaymentWithDetails[];
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

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (searchDraft.trim()) params.set('search', searchDraft.trim());
    if (statusDraft) params.set('status', statusDraft);
    if (buildingDraft) params.set('buildingId', buildingDraft);
    params.set('page', '1');
    router.push(`/admin/financial/payments?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    if (searchParams.search) params.set('search', searchParams.search);
    if (searchParams.status) params.set('status', searchParams.status);
    if (searchParams.buildingId) params.set('buildingId', searchParams.buildingId);
    params.set('page', String(page));
    router.push(`/admin/financial/payments?${params.toString()}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyFilters();
            }}
            placeholder="Search by tenant or unit"
            className="pl-9"
          />
        </div>
        <Select
          value={statusDraft}
          onChange={(e) => setStatusDraft(e.target.value)}
          className="sm:w-48"
          aria-label="Status"
        >
          <option value="">All statuses</option>
          <option value="due">Due</option>
          <option value="overdue">Overdue</option>
          <option value="paid">Paid</option>
        </Select>
        <Select
          value={buildingDraft}
          onChange={(e) => setBuildingDraft(e.target.value)}
          className="sm:w-56"
          aria-label="Property"
        >
          <option value="">All properties</option>
          {buildings.map((building) => (
            <option key={building.id} value={building.id}>
              {building.name}
            </option>
          ))}
        </Select>
        <Button variant="outline" onClick={applyFilters}>
          Apply
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Upcoming & due</h2>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="h-8 w-8" />}
            title="Nothing due right now"
            description="Open invoices with remaining balances will appear here."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant / Unit</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Penalty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcoming.map((item) => (
                  <TableRow key={item.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-gray-900">
                      {tenantUnitLabel(item.tenantName, item.roomNumber)}
                    </TableCell>
                    <TableCell className="text-gray-700">{formatDate(item.dueDate)}</TableCell>
                    <TableCell className="text-gray-900">
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
                      <Link href={payNowHref(item)}>
                        <Button size="sm" variant="outline">
                          Pay now
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Transaction history</h2>
        {history.length === 0 ? (
          <EmptyState
            icon={<Wallet className="h-8 w-8" />}
            title="No payments recorded"
            description="Recorded payments will show up in this history."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant / Unit</TableHead>
                  <TableHead>Paid on</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((payment) => {
                  const method = formatPaymentMethod(payment.paymentMethod);
                  const MethodIcon = method.Icon;
                  return (
                    <TableRow key={payment.id} className="hover:bg-gray-50">
                      <TableCell>
                        <Link
                          href={`/admin/financial/payments/${payment.id}`}
                          className="font-medium text-gray-900 hover:text-purple-700"
                        >
                          {tenantUnitLabel(payment.tenantName, payment.roomNumber)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {formatDate(payment.paymentDate)}
                      </TableCell>
                      <TableCell className="text-gray-900">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                          <MethodIcon className="h-3.5 w-3.5 text-gray-400" />
                          {method.label}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-gray-600">
                        {payment.referenceNumber || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {historyTotalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
                <p className="text-sm text-gray-600">
                  Showing page <span className="font-medium">{historyPage}</span> of{' '}
                  <span className="font-medium">{historyTotalPages}</span>
                  {' · '}
                  <span className="font-medium">{historyTotal}</span> payments
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(historyPage - 1)}
                    isDisabled={historyPage <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(historyPage + 1)}
                    isDisabled={historyPage >= historyTotalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
