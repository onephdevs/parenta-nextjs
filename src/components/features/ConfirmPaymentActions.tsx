'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useNotifications } from '@/hooks/useNotifications';

interface ConfirmPaymentActionsProps {
  paymentId: string;
  referenceNumber?: string | null;
  amountLabel: string;
}

function normalizeTxn(value: string | null | undefined): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

export default function ConfirmPaymentActions({
  paymentId,
  referenceNumber,
  amountLabel,
}: ConfirmPaymentActionsProps) {
  const router = useRouter();
  const { showNotification } = useNotifications();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const runAction = async (
    action: 'confirm' | 'reject',
    confirmedReference?: string
  ) => {
    if (action === 'confirm') {
      const expected = normalizeTxn(referenceNumber);
      const entered = normalizeTxn(confirmedReference);
      if (!expected) {
        showNotification({
          type: 'error',
          title: 'Missing transaction ID',
          message:
            'This payment has no reference number. Ask the tenant to resubmit with a transaction ID.',
        });
        return;
      }
      if (!entered || entered !== expected) {
        showNotification({
          type: 'error',
          title: 'Transaction ID mismatch',
          message:
            'Entered reference does not match the tenant’s transaction ID. Check the receipt and try again.',
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          confirmedReference:
            action === 'confirm' ? String(confirmedReference || '').trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showNotification({
          type: 'error',
          title: `Could not ${action} payment`,
          message: data.error || data.message || 'Request failed',
        });
        return;
      }
      showNotification({
        type: 'success',
        title: action === 'confirm' ? 'Payment confirmed' : 'Payment rejected',
        message: data.message || `Payment ${action}ed successfully`,
      });
      setConfirmOpen(false);
      setRejectOpen(false);
      router.refresh();
    } catch (error) {
      showNotification({
        type: 'error',
        title: `Could not ${action} payment`,
        message: error instanceof Error ? error.message : 'Request failed',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        onClick={() => setConfirmOpen(true)}
        isLoading={isSubmitting}
        leftIcon={<CheckCircle2 className="h-4 w-4" />}
      >
        Confirm payment
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => setRejectOpen(true)}
        isDisabled={isSubmitting}
        leftIcon={<XCircle className="h-4 w-4" />}
      >
        Reject
      </Button>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={(value) => void runAction('confirm', value)}
        title="Confirm payment received"
        message={`Confirm ${amountLabel} was received.\n\nTenant transaction ID on file: ${
          referenceNumber || 'N/A'
        }\n\nType the transaction / reference number to verify it matches the receipt.`}
        confirmText="Confirm received"
        cancelText="Cancel"
        variant="success"
        mode="prompt"
        promptPlaceholder="Enter transaction ID"
        isLoading={isSubmitting}
      />

      <ConfirmDialog
        isOpen={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={() => void runAction('reject')}
        title="Reject payment claim"
        message={`Reject this payment claim of ${amountLabel}?\n\nTransaction ID: ${
          referenceNumber || 'N/A'
        }`}
        confirmText="Reject"
        cancelText="Cancel"
        variant="danger"
        isLoading={isSubmitting}
      />
    </div>
  );
}
