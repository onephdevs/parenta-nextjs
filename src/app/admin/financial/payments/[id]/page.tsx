import { getServerSession } from 'next-auth/next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getPaymentById } from '@/lib/api/payments';
import DownloadReceiptButton from '@/components/features/DownloadReceiptButton';
import ConfirmPaymentActions from '@/components/features/ConfirmPaymentActions';
import { formatPaymentNotesDisplay } from '@/lib/format-payment-notes';
import {
  Alert,
  DetailSection,
  DescriptionItem,
  DescriptionList,
  PageHeader,
} from '@/components/ui';
import {
  PaymentStatusBadge,
  PaymentTypeBadge,
} from '@/components/domain/StatusBadges';
import { formatPaymentMethodLabel } from '@/lib/constants/payment-methods';
import { EntityNotesPanel } from '@/components/features/notes/EntityNotesModal';

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

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateOnly(date: Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getPaymentMethodDisplay(method: string) {
  return formatPaymentMethodLabel(method);
}

export default async function PaymentDetailPage({ params }: PaymentDetailPageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || !['admin','caretaker'].includes(session.user.role)) {
    redirect('/auth/signin');
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

  const { label: descriptionLabel, billingPeriodLabel } = formatPaymentNotesDisplay(
    payment.notes
  );
  const lateFeeAmount = (payment as { lateFeeAmount?: number }).lateFeeAmount;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Payment Details"
        description={`Payment #${payment.id}`}
        backHref="/admin/financial/payments"
        backLabel="Back to payments"
        actions={
          <>
            {payment.paymentStatus === 'pending' && (
              <ConfirmPaymentActions
                paymentId={payment.id}
                referenceNumber={payment.referenceNumber}
                amountLabel={formatCurrency(payment.amount)}
              />
            )}
            <DownloadReceiptButton
              paymentId={payment.id}
              hasReceipt={Boolean(payment.receiptFilePath)}
            />
          </>
        }
      />

      {payment.paymentStatus === 'pending' && (
        <Alert variant="warning" title="Awaiting verification">
          <p>
            Cross-check the tenant&apos;s Transaction ID against their bank/GCash receipt,
            then confirm or reject this claim. Invoice balances stay unchanged until you confirm.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="rounded-md bg-white/80 px-3 py-2 text-sm text-gray-900">
              <span className="font-medium text-gray-600">Transaction ID: </span>
              <span className="font-mono font-semibold">
                {payment.referenceNumber || 'Not provided'}
              </span>
            </div>
            <ConfirmPaymentActions
              paymentId={payment.id}
              referenceNumber={payment.referenceNumber}
              amountLabel={formatCurrency(payment.amount)}
            />
          </div>
        </Alert>
      )}

      <DetailSection title="Overview">
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-sm font-medium text-gray-500">Description</p>
              <h2 className="text-xl font-semibold text-gray-900">
                {descriptionLabel || 'No description'}
              </h2>
              {billingPeriodLabel && (
                <p className="mt-2 text-sm text-gray-600">
                  Billing period: {billingPeriodLabel}
                </p>
              )}
              <p className="mt-3 text-2xl font-bold text-gray-900">
                {formatCurrency(payment.amount)}
              </p>
              <p className="text-sm text-gray-600">
                Paid on {formatDateOnly(payment.paymentDate)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <PaymentStatusBadge status={payment.paymentStatus} />
              <PaymentTypeBadge type={payment.paymentType} />
            </div>
          </div>
        </div>
      </DetailSection>

      <DetailSection title="Payment Details">
        <DescriptionList>
          <DescriptionItem label="Payment Method">
            {getPaymentMethodDisplay(payment.paymentMethod || '')}
          </DescriptionItem>
          <DescriptionItem label="Payment Date">
            {formatDateOnly(payment.paymentDate)}
          </DescriptionItem>
          <DescriptionItem label="Due Date">
            {payment.dueDate ? formatDateOnly(payment.dueDate) : 'N/A'}
          </DescriptionItem>
          <DescriptionItem label="Transaction ID">
            <span className="font-mono font-semibold">
              {payment.referenceNumber || 'N/A'}
            </span>
          </DescriptionItem>
          <DescriptionItem label="Created">{formatDate(payment.createdAt)}</DescriptionItem>
          <DescriptionItem label="Last Updated">{formatDate(payment.updatedAt)}</DescriptionItem>
        </DescriptionList>
      </DetailSection>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DetailSection title="Tenant Information">
          <DescriptionList>
            <DescriptionItem label="Name">{payment.tenantName}</DescriptionItem>
            <DescriptionItem label="Email">{payment.tenantEmail}</DescriptionItem>
            <DescriptionItem label="Phone">{payment.tenantPhone || 'N/A'}</DescriptionItem>
          </DescriptionList>
          <div className="border-t border-gray-200 px-4 py-4 sm:px-6">
            <Link
              href={`/admin/tenants/${payment.tenantId}`}
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              View Tenant Profile →
            </Link>
          </div>
        </DetailSection>

        <DetailSection title="Room Information">
          <DescriptionList>
            <DescriptionItem label="Building">
              {payment.buildingName || 'N/A'}
            </DescriptionItem>
            <DescriptionItem label="Room Number">
              {payment.roomNumber || 'N/A'}
            </DescriptionItem>
            <DescriptionItem label="Monthly Rent">
              {payment.monthlyRate ? formatCurrency(payment.monthlyRate) : 'N/A'}
            </DescriptionItem>
          </DescriptionList>
          <div className="border-t border-gray-200 px-4 py-4 sm:px-6">
            {payment.roomId ? (
              <Link
                href={`/admin/rooms/${payment.roomId}`}
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                View Room Details →
              </Link>
            ) : payment.roomNumber ? (
              <p className="text-sm italic text-gray-600">
                No room assignment linked to this payment
              </p>
            ) : null}
          </div>
        </DetailSection>
      </div>

      {lateFeeAmount != null && lateFeeAmount > 0 && (
        <Alert variant="warning" title="Late Fee Applied">
          A late fee of {formatCurrency(lateFeeAmount)} was applied to this payment.
        </Alert>
      )}

      <EntityNotesPanel
        entityType="payment"
        entityId={String(payment.id)}
        entityLabel={`Payment ${formatCurrency(Number(payment.amount) || 0)}`}
        title="Payment notes"
      />
    </div>
  );
}
