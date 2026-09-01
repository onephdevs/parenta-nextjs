'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useNotifications } from '@/hooks/useNotifications';

interface PaymentRefundVoidActionsProps {
  paymentId: string;
  amountLabel: string;
  invoiceNumber?: string | null;
  status: string;
}

function normalizeStatus(status: string): string {
  return String(status || '').toLowerCase();
}

export default function PaymentRefundVoidActions({
  paymentId,
  amountLabel,
  invoiceNumber,
  status,
}: PaymentRefundVoidActionsProps) {
  const router = useRouter();
  const { showNotification } = useNotifications();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);

  const key = normalizeStatus(status);
  const isReversed = key === 'refunded' || key === 'cancelled' || key === 'failed';
  const isPaid = key === 'paid' || key === 'completed';
  const canRefund = isPaid && !isReversed;
  const canVoid = !isReversed;

  if (!canRefund && !canVoid) {
    return null;
  }

  const invoiceLine = invoiceNumber?.trim()
    ? `Invoice ${invoiceNumber.trim()} will go back to unpaid/partial.`
    : 'Any invoices this payment was applied to will go back to unpaid/partial.';

  const runRefund = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/payments/${paymentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: 'refunded' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to refund payment');
      }
      showNotification({
        type: 'success',
        title: 'Payment refunded',
        message: 'Invoice balances were restored. The payment stays on the record as refunded.',
      });
      setRefundOpen(false);
      router.refresh();
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Refund failed',
        message: error instanceof Error ? error.message : 'Failed to refund payment',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const runVoid = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/payments/${paymentId}`, {
        method: 'DELETE',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to void payment');
      }
      showNotification({
        type: 'success',
        title: 'Payment voided',
        message: 'The payment was removed and invoice balances were restored.',
      });
      setVoidOpen(false);
      router.push('/admin/financial/payments');
      router.refresh();
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Void failed',
        message: error instanceof Error ? error.message : 'Failed to void payment',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {canRefund ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setRefundOpen(true)}
        >
          Refund
        </Button>
      ) : null}
      {canVoid ? (
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={() => setVoidOpen(true)}
        >
          Void
        </Button>
      ) : null}

      <ConfirmDialog
        isOpen={refundOpen}
        onClose={() => setRefundOpen(false)}
        onConfirm={() => void runRefund()}
        title="Refund this payment?"
        message={`Mark ${amountLabel} as refunded and restore the tenant’s invoice balance?\n\n${invoiceLine}\n\nThe payment record is kept (status Refunded). Use Void if this was recorded in error and should be removed.`}
        confirmText="Refund"
        cancelText="Cancel"
        variant="warning"
        isLoading={isSubmitting}
      />

      <ConfirmDialog
        isOpen={voidOpen}
        onClose={() => setVoidOpen(false)}
        onConfirm={() => void runVoid()}
        title="Void this payment?"
        message={`Remove this ${amountLabel} payment from the books?\n\n${invoiceLine}\n\nThis cannot be undone. Use Refund if you returned the money but want to keep the record.`}
        confirmText="Void payment"
        cancelText="Cancel"
        variant="danger"
        isLoading={isSubmitting}
      />
    </>
  );
}
