import { getServerSession } from 'next-auth/next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getPaymentById } from '@/lib/api/payments';
import pool from '@/lib/db';
import DownloadReceiptButton from '@/components/features/DownloadReceiptButton';
import ConfirmPaymentActions from '@/components/features/ConfirmPaymentActions';
import PaymentRefundVoidActions from '@/components/features/payments/PaymentRefundVoidActions';
import {
  extractInvoiceIdFromNotes,
  formatPaymentNotesDisplay,
} from '@/lib/format-payment-notes';
import { Alert, Button } from '@/components/ui';
import {
  PaymentStatusBadge,
  PaymentTypeBadge,
} from '@/components/domain/StatusBadges';
import { formatPaymentMethodLabel } from '@/lib/constants/payment-methods';
import { EntityNotesPanel } from '@/components/features/notes/EntityNotesModal';
import { PaymentClaimThreadPanel } from '@/components/features/payments/PaymentClaimThreadPanel';
import { getImageUrl } from '@/lib/format/image-url';
import {
  extractInvoiceNumberFromNotes,
  paymentClaimDisplayFields,
} from '@/lib/format/payment-claim-display';
import { LightboxImage } from '@/components/ui/ImageLightbox';

interface PaymentDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

function formatDateOnly(date: Date | string | null | undefined) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

export default async function PaymentDetailPage({ params }: PaymentDetailPageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || !['admin', 'caretaker'].includes(session.user.role)) {
    redirect('/auth/signin');
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  let payment;
  try {
    payment = await getPaymentById(id);
    if (!payment) {
      notFound();
    }
  } catch (error) {
    console.error('Error fetching payment:', error);
    notFound();
  }

  const { billingPeriodLabel } = formatPaymentNotesDisplay(payment.notes);
  const lateFeeAmount = (payment as { lateFeeAmount?: number }).lateFeeAmount;
  const receiptNo =
    payment.parentaTxnId ||
    payment.orNumber ||
    payment.referenceNumber ||
    payment.id.slice(0, 8);
  const isPendingClaim = ['pending', 'failed'].includes(payment.paymentStatus);

  const allocationsResult = await pool.query(
    `
    SELECT
      pa.allocated_amount,
      i.id AS invoice_id,
      i.invoice_number,
      i.total_amount,
      i.amount_paid,
      i.balance_due,
      (
        SELECT ili.description
        FROM invoice_line_items ili
        WHERE ili.invoice_id = i.id
        ORDER BY ili.created_at ASC, ili.id ASC
        LIMIT 1
      ) AS line_description
    FROM payment_allocations pa
    JOIN invoices i ON i.id = pa.invoice_id
    WHERE pa.payment_id = $1
    ORDER BY pa.created_at ASC
    `,
    [id]
  );

  let primaryInvoice = allocationsResult.rows[0] || null;
  const claimedInvoiceId = extractInvoiceIdFromNotes(payment.notes);
  const claimedInvoiceNumber = extractInvoiceNumberFromNotes(payment.notes);

  if (!primaryInvoice && (claimedInvoiceId || claimedInvoiceNumber)) {
    const linked = claimedInvoiceId
      ? await pool.query(
          `SELECT
             i.id AS invoice_id,
             i.invoice_number,
             i.total_amount,
             i.amount_paid,
             i.balance_due
           FROM invoices i
           WHERE i.id = $1 AND i.tenant_id = $2
           LIMIT 1`,
          [claimedInvoiceId, payment.tenantId]
        )
      : await pool.query(
          `SELECT
             i.id AS invoice_id,
             i.invoice_number,
             i.total_amount,
             i.amount_paid,
             i.balance_due
           FROM invoices i
           WHERE i.invoice_number = $1 AND i.tenant_id = $2
           LIMIT 1`,
          [claimedInvoiceNumber, payment.tenantId]
        );
    primaryInvoice = linked.rows[0] || null;
  }

  const remainingBalance = primaryInvoice
    ? Number(primaryInvoice.balance_due || 0)
    : null;
  const invoiceNumber =
    primaryInvoice?.invoice_number || claimedInvoiceNumber || null;
  const claimRows = paymentClaimDisplayFields({
    amount: payment.amount,
    method: payment.paymentMethod,
    invoiceNumber,
    parentaTxnId: payment.parentaTxnId,
    referenceNumber: payment.referenceNumber,
    notes: payment.notes,
  }).filter((row) => row.label !== 'Status');
  const location = [
    payment.buildingName,
    payment.roomNumber ? `Unit ${payment.roomNumber}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const receiptUrl = payment.receiptFilePath
    ? getImageUrl(payment.receiptFilePath)
    : null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/admin/financial/payments"
            className="mb-3 inline-flex text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← Back to payments
          </Link>
          <p className="font-mono text-xs text-gray-400">#{receiptNo}</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            {formatCurrency(payment.amount)}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {[
              payment.tenantName,
              location,
              invoiceNumber,
              formatDateOnly(payment.paymentDate),
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PaymentStatusBadge status={payment.paymentStatus} />
          {payment.paymentType ? (
            <PaymentTypeBadge type={payment.paymentType} />
          ) : null}
          {payment.paymentStatus === 'pending' && (
            <ConfirmPaymentActions
              paymentId={payment.id}
              referenceNumber={payment.referenceNumber}
              invoiceNumber={invoiceNumber}
              parentaTxnId={payment.parentaTxnId}
              amountLabel={formatCurrency(payment.amount)}
            />
          )}
          {session.user.role === 'admin' && (
            <PaymentRefundVoidActions
              paymentId={payment.id}
              amountLabel={formatCurrency(payment.amount)}
              invoiceNumber={invoiceNumber}
              status={payment.paymentStatus}
            />
          )}
          <DownloadReceiptButton
            paymentId={payment.id}
            hasReceipt={Boolean(payment.receiptFilePath)}
            mode="generated"
            label="Download"
          />
        </div>
      </div>

      {payment.paymentStatus === 'pending' && (
        <Alert variant="warning" title="Awaiting verification">
          <p>
            Cross-check the tenant&apos;s reference against their bank/GCash receipt,
            then confirm or reject. Invoice balances stay unchanged until you confirm.
          </p>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900">Receipt details</h2>
            </div>
            <dl className="divide-y divide-gray-100">
              {claimRows.map((row) => (
                <div
                  key={`${row.label}-${row.value}`}
                  className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 px-5 py-3 sm:grid-cols-[9rem_minmax(0,1fr)]"
                >
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    {row.label}
                  </dt>
                  <dd className="min-w-0 text-sm font-medium text-gray-900">
                    {row.label === 'Invoice' && primaryInvoice ? (
                      <Link
                        href={`/admin/financial/invoices/${primaryInvoice.invoice_id}`}
                        className="text-indigo-600 hover:underline"
                      >
                        {row.value}
                      </Link>
                    ) : (
                      row.value
                    )}
                  </dd>
                </div>
              ))}
              <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 px-5 py-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Payment date
                </dt>
                <dd className="text-sm font-medium text-gray-900">
                  {formatDateOnly(payment.paymentDate)}
                </dd>
              </div>
              {payment.orNumber && (
                <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 px-5 py-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    OR No.
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">{payment.orNumber}</dd>
                </div>
              )}
              {payment.orDate && (
                <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 px-5 py-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    OR date
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {formatDateOnly(payment.orDate)}
                  </dd>
                </div>
              )}
              {billingPeriodLabel && (
                <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 px-5 py-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Billing period
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {billingPeriodLabel}
                  </dd>
                </div>
              )}
            </dl>

            <div className="border-t border-gray-100">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3">Applied to</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allocationsResult.rows.length > 0 ? (
                    allocationsResult.rows.map((row) => (
                      <tr key={row.invoice_id}>
                        <td className="px-5 py-3 text-gray-800">
                          <Link
                            href={`/admin/financial/invoices/${row.invoice_id}`}
                            className="font-medium text-indigo-600 hover:underline"
                          >
                            {row.invoice_number}
                          </Link>
                          {row.line_description ? (
                            <p className="mt-0.5 text-xs text-gray-500">
                              {row.line_description}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-gray-900">
                          {formatCurrency(Number(row.allocated_amount))}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-5 py-3 text-gray-600">
                        {isPendingClaim
                          ? invoiceNumber
                            ? `Not applied yet — waiting to confirm ${invoiceNumber}`
                            : 'Not applied to an invoice yet'
                          : 'No invoice allocation'}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </td>
                    </tr>
                  )}
                  {lateFeeAmount != null && lateFeeAmount > 0 && (
                    <tr>
                      <td className="px-5 py-3 text-gray-800">Late fee</td>
                      <td className="px-5 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(lateFeeAmount)}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200">
                    <td className="px-5 py-3 font-semibold text-gray-900">Amount paid</td>
                    <td className="px-5 py-3 text-right text-lg font-bold text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {isPendingClaim && (
            <PaymentClaimThreadPanel
              paymentId={payment.id}
              variant="admin"
              status={payment.paymentStatus}
              title="Tenant conversation"
              conversationClassName="max-h-[min(40vh,22rem)]"
              seedMessage={{
                authorName: payment.tenantName || 'Tenant',
                authorRole: 'tenant',
                details: paymentClaimDisplayFields({
                  amount: payment.amount,
                  method: payment.paymentMethod,
                  invoiceNumber,
                  parentaTxnId: payment.parentaTxnId,
                  referenceNumber: payment.referenceNumber,
                  notes: payment.notes,
                }),
                createdAt: new Date(
                  payment.createdAt || payment.paymentDate
                ).toISOString(),
                photos: receiptUrl
                  ? [
                      {
                        url: receiptUrl,
                        fileName: payment.receiptFileName || 'Receipt',
                      },
                    ]
                  : undefined,
              }}
            />
          )}

          <EntityNotesPanel
            entityType="payment"
            entityId={String(payment.id)}
            entityLabel={`Payment ${formatCurrency(Number(payment.amount) || 0)}`}
            title="Payment notes"
          />
        </div>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Amount summary</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Amount
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {formatCurrency(payment.amount)}
                </p>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-3">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Method
                </span>
                <span className="font-medium text-gray-900">
                  {formatPaymentMethodLabel(payment.paymentMethod || '')}
                </span>
              </div>
              {primaryInvoice && (
                <div className="flex justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Invoice
                  </span>
                  <Link
                    href={`/admin/financial/invoices/${primaryInvoice.invoice_id}`}
                    className="font-semibold text-indigo-600 hover:underline"
                  >
                    {primaryInvoice.invoice_number}
                  </Link>
                </div>
              )}
              {remainingBalance != null && (
                <div className="flex justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    {isPendingClaim ? 'Invoice balance' : 'Remaining balance'}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(remainingBalance)}
                  </span>
                </div>
              )}
              {isPendingClaim && remainingBalance != null && (
                <p className="text-xs text-amber-700">
                  Balance is not updated until this claim is confirmed.
                </p>
              )}
              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Status
                </span>
                <PaymentStatusBadge status={payment.paymentStatus} />
              </div>
            </div>
          </section>

          {receiptUrl && (
            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Uploaded receipt</h3>
              <LightboxImage
                src={receiptUrl}
                alt={payment.receiptFileName || 'Receipt'}
                title={payment.receiptFileName || 'Receipt'}
                wrapperClassName="block overflow-hidden rounded-lg border border-gray-200"
                className="h-48 w-full object-cover"
              />
              <div className="mt-3">
                <DownloadReceiptButton
                  paymentId={payment.id}
                  hasReceipt
                  mode="uploaded"
                  label="Download proof"
                />
              </div>
            </section>
          )}

          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Tenant</h3>
            <p className="text-sm font-semibold text-gray-900">{payment.tenantName}</p>
            {payment.tenantEmail && (
              <p className="text-sm text-gray-600">{payment.tenantEmail}</p>
            )}
            {location && <p className="text-sm text-gray-600">{location}</p>}
            <p className="mt-3 text-xs text-gray-500">
              Recorded {formatDateOnly(payment.createdAt)}
            </p>
          </section>

          <Link href={`/admin/tenants/${payment.tenantId}`}>
            <Button variant="outline" className="w-full">
              View tenant profile
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
