import { getServerSession } from 'next-auth/next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import PrintInvoiceButton from '@/components/features/PrintInvoiceButton';
import { InvoiceNegotiationPanel } from '@/components/features/InvoiceNegotiationPanel';
import { formatPaymentMethodLabel } from '@/lib/constants/payment-methods';
import {
  Button,
  Card,
  DetailSection,
  DescriptionItem,
  DescriptionList,
  EmptyState,
  PageHeader,
  Progress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { InvoiceStatusBadge } from '@/components/domain/StatusBadges';
import { getEffectiveDueDate, getDaysUntilDue } from '@/lib/billing/invoice-due';
import { formatPaymentNotesForPeople } from '@/lib/format-payment-notes';

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

function formatCurrency(amount: string | number | null | undefined) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(Number(amount || 0));
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const session = await getServerSession(authOptions);

  if (!session || !['admin','caretaker'].includes(session.user.role)) {
    redirect('/auth/signin');
  }

  const { id } = await params;

  try {
    const invoiceResult = await pool.query(
      `SELECT
        i.*,
        t.first_name,
        t.last_name,
        t.email,
        r.room_number,
        b.name as building_name
      FROM invoices i
      LEFT JOIN tenants t ON i.tenant_id = t.id
      LEFT JOIN tenant_room_assignments tra
        ON tra.tenant_id = i.tenant_id AND tra.assignment_status = 'active'
      LEFT JOIN rooms r ON tra.room_id = r.id
      LEFT JOIN buildings b ON r.building_id = b.id
      WHERE i.id = $1`,
      [id]
    );

    if (invoiceResult.rows.length === 0) {
      notFound();
    }

    const invoice = invoiceResult.rows[0];

    const itemsResult = await pool.query(
      `SELECT *
       FROM invoice_line_items
       WHERE invoice_id = $1
       ORDER BY created_at ASC, id ASC`,
      [id]
    );
    const lineItems = itemsResult.rows;

    const allocationsResult = await pool.query(
      `SELECT
        pa.*,
        p.amount as payment_amount,
        p.payment_date,
        p.payment_method,
        p.notes as payment_description
      FROM payment_allocations pa
      LEFT JOIN payments p ON pa.payment_id = p.id
      WHERE pa.invoice_id = $1
      ORDER BY pa.created_at DESC`,
      [id]
    );

    const allocations = allocationsResult.rows;

    const totalAmount = Number(invoice.total_amount || 0);
    const amountPaid = Number(invoice.amount_paid || 0);
    const balanceDue = Number(invoice.balance_due ?? totalAmount - amountPaid);
    const progressPercentage = totalAmount > 0 ? (amountPaid / totalAmount) * 100 : 0;
    const status = invoice.invoice_status || 'draft';
    const billStatus = String(invoice.bill_status || '').toUpperCase() || null;
    const adjustmentAmount = Number(invoice.adjustment_amount || 0);
    const effectiveDue = getEffectiveDueDate({
      due_date: invoice.due_date,
      negotiated_due_date: invoice.negotiated_due_date,
    });
    const daysToDue = getDaysUntilDue({
      due_date: invoice.due_date,
      negotiated_due_date: invoice.negotiated_due_date,
    });
    const canNegotiate =
      balanceDue > 0.009 && status !== 'cancelled' && status !== 'paid';

    return (
      <div className="space-y-8">
        <PageHeader
          title={`Invoice ${invoice.invoice_number}`}
          description={`${invoice.first_name} ${invoice.last_name}`}
          backHref="/admin/financial/invoices"
          backLabel="Back to invoices"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <InvoiceStatusBadge status={status} />
              {billStatus && (
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    billStatus === 'PAID'
                      ? 'bg-green-100 text-green-800'
                      : billStatus === 'PARTIAL'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {billStatus === 'PAID'
                    ? 'Paid'
                    : billStatus === 'PARTIAL'
                      ? 'Partial'
                      : 'Unpaid'}
                </span>
              )}
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <DetailSection title="Invoice Details">
              <DescriptionList>
                <DescriptionItem label="Invoice Number">
                  <span className="font-semibold">{invoice.invoice_number}</span>
                </DescriptionItem>
                <DescriptionItem label="Tenant">
                  <Link
                    href={`/admin/tenants/${invoice.tenant_id}`}
                    className="font-medium text-gray-700 hover:text-gray-900"
                  >
                    {invoice.first_name} {invoice.last_name}
                  </Link>
                </DescriptionItem>
                <DescriptionItem label="Room">
                  {invoice.building_name && invoice.room_number
                    ? `${invoice.building_name} - Room ${invoice.room_number}`
                    : 'No active room assignment'}
                </DescriptionItem>
                <DescriptionItem label="Issue Date">
                  {formatDate(invoice.issue_date)}
                </DescriptionItem>
                <DescriptionItem label="Scheduled due date">
                  {formatDate(invoice.due_date)}
                </DescriptionItem>
                <DescriptionItem label="Effective due date">
                  <span className="font-medium">
                    {formatDate(effectiveDue || invoice.due_date)}
                  </span>
                  {invoice.negotiated_due_date && (
                    <span className="mt-0.5 block text-xs font-normal text-gray-500">
                      Renegotiated
                      {invoice.negotiated_due_reason
                        ? `: ${invoice.negotiated_due_reason}`
                        : ''}
                    </span>
                  )}
                </DescriptionItem>
                <DescriptionItem label="Period">
                  {formatDate(invoice.billing_period_start)} -{' '}
                  {formatDate(invoice.billing_period_end)}
                </DescriptionItem>
                {invoice.notes && (
                  <DescriptionItem label="Notes">
                    {formatPaymentNotesForPeople(invoice.notes)}
                  </DescriptionItem>
                )}
              </DescriptionList>
            </DetailSection>

            <DetailSection title="Line Items">
              {lineItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="capitalize">{item.item_type}</TableCell>
                        <TableCell className="text-right">
                          {Number(item.quantity)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unit_price)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.line_total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState title="No line items on this invoice." />
              )}
            </DetailSection>

            <DetailSection
              title="Payment History"
              description="All payments that have been allocated to this invoice"
            >
              {allocations.length > 0 ? (
                <div className="space-y-3 border-t border-gray-200 px-4 py-5 sm:px-6">
                  {allocations.map((allocation) => (
                    <div
                      key={allocation.id}
                      className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Payment allocated:{' '}
                            {formatCurrency(allocation.allocated_amount)}
                          </p>
                          <p className="mt-1 text-xs text-gray-600">
                            Date:{' '}
                            {formatDate(
                              allocation.payment_date || allocation.allocation_date
                            )}{' '}
                            · Method:{' '}
                            {formatPaymentMethodLabel(allocation.payment_method)}{' '}
                            · Total: {formatCurrency(allocation.payment_amount)}
                          </p>
                          {allocation.payment_description && (
                            <p className="mt-1 text-xs text-gray-600">
                              {allocation.payment_description}
                            </p>
                          )}
                        </div>
                        <Link
                          href={`/admin/financial/payments/${allocation.payment_id}`}
                          className="shrink-0 text-sm font-medium text-gray-700 hover:text-gray-900"
                        >
                          View →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No payments allocated yet"
                  description="Payments will be automatically allocated when recorded"
                />
              )}
            </DetailSection>
          </div>

          <div className="space-y-6">
            <Card>
              <h3 className="mb-4 text-lg font-medium text-gray-900">Amount Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                {Number(invoice.tax_amount) > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span>{formatCurrency(invoice.tax_amount)}</span>
                  </div>
                )}
                {Number(invoice.discount_amount) > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Discount</span>
                    <span>-{formatCurrency(invoice.discount_amount)}</span>
                  </div>
                )}
                {adjustmentAmount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      Adjustment
                      {invoice.adjustment_reason ? (
                        <span className="mt-0.5 block text-xs font-normal text-gray-500">
                          {invoice.adjustment_reason}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-amber-800">-{formatCurrency(adjustmentAmount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
                  <span className="font-medium">Total Amount</span>
                  <span className="text-lg font-bold">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Amount Paid</span>
                  <span className="text-lg font-semibold text-green-700">
                    {formatCurrency(amountPaid)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                  <span className="font-medium">Remaining</span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatCurrency(balanceDue)}
                  </span>
                </div>
                <div className="pt-2">
                  <Progress
                    value={progressPercentage}
                    size="lg"
                    label="Payment Progress"
                    showValue
                  />
                </div>
              </div>
            </Card>

            <InvoiceNegotiationPanel
              invoiceId={invoice.id}
              dueDate={
                invoice.due_date
                  ? String(invoice.due_date).slice(0, 10)
                  : null
              }
              negotiatedDueDate={
                invoice.negotiated_due_date
                  ? String(invoice.negotiated_due_date).slice(0, 10)
                  : null
              }
              negotiatedDueReason={invoice.negotiated_due_reason || null}
              adjustmentAmount={adjustmentAmount}
              adjustmentReason={invoice.adjustment_reason || null}
              balanceDue={balanceDue}
              canEdit={canNegotiate}
            />

            <Card>
              <h3 className="mb-4 text-lg font-medium text-gray-900">Quick Actions</h3>
              <div className="flex flex-col gap-3">
                {balanceDue > 0 && status !== 'cancelled' ? (
                  <Link
                    href={`/admin/financial/payments/new?tenantId=${encodeURIComponent(invoice.tenant_id)}&invoiceId=${encodeURIComponent(invoice.id)}&amount=${encodeURIComponent(String(balanceDue))}`}
                  >
                    <Button className="w-full" leftIcon={<Plus className="h-4 w-4" />}>
                      Record Payment
                    </Button>
                  </Link>
                ) : (
                  <Button className="w-full" isDisabled>
                    {status === 'paid' || balanceDue <= 0 ? 'Fully paid' : 'Record Payment'}
                  </Button>
                )}
                <Link href={`/admin/tenants/${invoice.tenant_id}`}>
                  <Button variant="outline" className="w-full">
                    View Tenant Profile
                  </Button>
                </Link>
                <PrintInvoiceButton />
              </div>
            </Card>

            <Card>
              <h3 className="mb-4 text-sm font-medium text-gray-900">Invoice Statistics</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Payments Received</span>
                  <span className="font-semibold">{allocations.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Days Since Issue</span>
                  <span className="font-semibold">
                    {Math.floor(
                      (new Date().getTime() - new Date(invoice.issue_date).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )}{' '}
                    days
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Days Until Due</span>
                  <span
                    className={`font-semibold ${
                      daysToDue != null && daysToDue < 0
                        ? 'text-red-600'
                        : 'text-gray-900'
                    }`}
                  >
                    {daysToDue == null
                      ? '—'
                      : daysToDue < 0
                        ? `${Math.abs(daysToDue)} days overdue`
                        : daysToDue === 0
                          ? 'Due today'
                          : `${daysToDue} days`}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading invoice:', error);
    notFound();
  }
}
