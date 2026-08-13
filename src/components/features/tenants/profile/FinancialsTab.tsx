'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Pagination from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatBlock } from '@/components/ui/StatBlock';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatPaymentNotesLabel } from '@/lib/format-payment-notes';
import { formatProfileDate } from './utils';

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  dueDate: string;
  type: string;
  amountDue: number;
  status: string;
  paidDate?: string | null;
}

interface PaymentRow {
  id: string;
  paymentDate: string;
  amount: number;
  status: string;
  method: string;
  receiptNo?: string | null;
  orNo?: string | null;
}

const BILL_PAGE = 10;
const PAY_PAGE = 10;

function mapInvoiceStatus(raw: string, dueDate?: string): string {
  const s = raw.toLowerCase();
  if (s === 'paid' || s === 'completed') return 'paid';
  if (s === 'overdue') return 'overdue';
  if (s === 'draft' || s === 'upcoming') return 'upcoming';
  if (dueDate) {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!Number.isNaN(due.getTime()) && due < today && s !== 'paid') return 'overdue';
    if (!Number.isNaN(due.getTime()) && due > today && (s === 'pending' || s === 'unpaid' || s === 'sent')) {
      return 'upcoming';
    }
  }
  if (s === 'pending' || s === 'sent' || s === 'partial' || s === 'unpaid') return 'unpaid';
  return s || 'unpaid';
}

export function FinancialsTab({ tenantId }: { tenantId: string }) {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [deposits, setDeposits] = useState(0);
  const [advances, setAdvances] = useState(0);
  const [loading, setLoading] = useState(true);
  const [billPage, setBillPage] = useState(1);
  const [payPage, setPayPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const [invRes, payRes, creditsRes, depositsRes] = await Promise.all([
          fetch(`/api/invoices?tenantId=${encodeURIComponent(tenantId)}`, {
            credentials: 'include',
          }),
          fetch(`/api/payments?tenantId=${encodeURIComponent(tenantId)}`, {
            credentials: 'include',
          }),
          fetch(`/api/tenant-credits/${encodeURIComponent(tenantId)}?type=balance`, {
            credentials: 'include',
          }),
          fetch(`/api/deposit-ledger/${encodeURIComponent(tenantId)}?type=balance`, {
            credentials: 'include',
          }),
        ]);

        if (invRes.ok) {
          const data = await invRes.json();
          const raw = Array.isArray(data.invoices)
            ? data.invoices
            : Array.isArray(data.data)
              ? data.data
              : Array.isArray(data.data?.invoices)
                ? data.data.invoices
                : [];
          const mapped: InvoiceRow[] = raw.map((inv: Record<string, unknown>) => {
            const total = Number(inv.totalAmount ?? inv.amount ?? inv.total_amount ?? 0);
            const paid = Number(inv.paidAmount ?? inv.amount_paid ?? 0);
            const remaining = Number(
              inv.balanceDue ?? inv.remainingAmount ?? inv.balance_due ?? total - paid
            );
            const dueDate = String(inv.dueDate ?? inv.due_date ?? '');
            const statusRaw = String(inv.status ?? inv.invoice_status ?? 'unpaid');
            return {
              id: String(inv.id),
              invoiceNumber: String(inv.invoiceNumber ?? inv.invoice_number ?? inv.id),
              dueDate,
              type: String(inv.description || inv.invoiceType || inv.type || 'Rent'),
              amountDue: Number.isFinite(remaining) ? remaining : total,
              status: mapInvoiceStatus(statusRaw, dueDate),
              paidDate:
                statusRaw.toLowerCase() === 'paid'
                  ? String(inv.paidAt ?? inv.paid_at ?? inv.updatedAt ?? '')
                  : null,
            };
          });
          if (!cancelled) setInvoices(mapped);
        }

        if (payRes.ok) {
          const data = await payRes.json();
          const raw = Array.isArray(data.payments)
            ? data.payments
            : Array.isArray(data.data)
              ? data.data
              : Array.isArray(data.data?.payments)
                ? data.data.payments
                : [];
          const mapped: PaymentRow[] = raw.map((p: Record<string, unknown>) => ({
            id: String(p.id),
            paymentDate: String(p.paymentDate ?? p.payment_date ?? ''),
            amount: Number(p.amount ?? 0) || 0,
            status: String(p.paymentStatus ?? p.payment_status ?? p.status ?? 'completed'),
            method: String(p.paymentMethod ?? p.payment_method ?? '—'),
            receiptNo: (p.receiptNumber as string) || (p.receipt_number as string) || null,
            orNo: (p.orNumber as string) || (p.or_number as string) || null,
            notes: p.notes as string | undefined,
          }));
          if (!cancelled) setPayments(mapped);
        }

        if (creditsRes.ok) {
          const response = await creditsRes.json();
          const balance =
            typeof response.data === 'number'
              ? response.data
              : Number(response.data?.balance ?? response.balance ?? 0);
          if (!cancelled) setAdvances(Number.isFinite(balance) ? balance : 0);
        }

        if (depositsRes.ok) {
          const response = await depositsRes.json();
          const balance =
            typeof response.data === 'number'
              ? response.data
              : Number(response.data?.balance ?? response.balance ?? 0);
          if (!cancelled) setDeposits(Number.isFinite(balance) ? balance : 0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const outstanding = useMemo(
    () =>
      invoices.reduce((sum, inv) => {
        if (inv.status === 'paid') return sum;
        return sum + (inv.amountDue || 0);
      }, 0),
    [invoices]
  );

  const lastPaymentDate = payments[0]?.paymentDate || null;

  const billTotalPages = Math.max(1, Math.ceil(invoices.length / BILL_PAGE));
  const payTotalPages = Math.max(1, Math.ceil(payments.length / PAY_PAGE));
  const billRows = invoices.slice((billPage - 1) * BILL_PAGE, billPage * BILL_PAGE);
  const payRows = payments.slice((payPage - 1) * PAY_PAGE, payPage * PAY_PAGE);

  if (loading) {
    return <p className="py-10 text-center text-sm text-gray-500">Loading financials…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Outstanding Balance', value: formatCurrency(outstanding) },
          { label: 'Total Deposits', value: formatCurrency(deposits) },
          { label: 'Total Advances', value: formatCurrency(advances) },
          {
            label: 'Last Payment Date',
            value: lastPaymentDate ? formatProfileDate(lastPaymentDate) : '—',
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm"
          >
            <StatBlock label={s.label} value={s.value} size="lg" />
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-3.5">
          <h3 className="text-sm font-bold text-gray-900">Billing Overview</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3">Due Date</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Amount Due</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Invoice No.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {billRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-500">
                    No invoices yet.
                  </td>
                </tr>
              ) : (
                billRows.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/80">
                    <td className="px-5 py-3.5 text-gray-800">
                      {formatProfileDate(inv.dueDate)}
                    </td>
                    <td className="px-5 py-3.5 text-gray-700">{inv.type}</td>
                    <td className="px-5 py-3.5 font-medium text-gray-900">
                      {formatCurrency(inv.amountDue)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge
                        status={inv.status}
                        subtext={
                          inv.status === 'paid' && inv.paidDate
                            ? formatProfileDate(inv.paidDate)
                            : undefined
                        }
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/financial/invoices/${inv.id}`}
                        className="font-semibold text-indigo-600 hover:underline"
                      >
                        #{inv.invoiceNumber}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={billPage}
          totalPages={billTotalPages}
          totalItems={invoices.length}
          itemsPerPage={BILL_PAGE}
          onPageChange={setBillPage}
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5">
          <h3 className="text-sm font-bold text-gray-900">Payment History</h3>
          <Link
            href={`/admin/financial/payments/new?tenantId=${tenantId}&type=refund`}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50"
          >
            Make a Refund
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3">Payment Date</th>
                <th className="px-5 py-3">Amount Paid</th>
                <th className="px-5 py-3">Payment Status</th>
                <th className="px-5 py-3">Mode of Payment</th>
                <th className="px-5 py-3">Receipt No.</th>
                <th className="px-5 py-3">OR No.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-500">
                    No payments recorded.
                  </td>
                </tr>
              ) : (
                payRows.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/80">
                    <td className="px-5 py-3.5 text-gray-800">
                      {formatProfileDate(p.paymentDate)}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-gray-900">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge
                        status={p.status}
                        tone="success"
                        label={
                          ['completed', 'paid', 'success'].includes(p.status.toLowerCase())
                            ? 'Completed'
                            : undefined
                        }
                      />
                    </td>
                    <td className="px-5 py-3.5 text-gray-700">
                      {formatPaymentNotesLabel(p.method) || p.method}
                    </td>
                    <td className="px-5 py-3.5">
                      {p.receiptNo ? (
                        <Link
                          href={`/admin/financial/payments/${p.id}`}
                          className="font-semibold text-indigo-600 hover:underline"
                        >
                          #{p.receiptNo}
                        </Link>
                      ) : (
                        <Link
                          href={`/admin/financial/payments/${p.id}`}
                          className="font-semibold text-indigo-600 hover:underline"
                        >
                          #{String(p.id).slice(0, 8)}
                        </Link>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-gray-700">{p.orNo || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={payPage}
          totalPages={payTotalPages}
          totalItems={payments.length}
          itemsPerPage={PAY_PAGE}
          onPageChange={setPayPage}
        />
      </section>
    </div>
  );
}
