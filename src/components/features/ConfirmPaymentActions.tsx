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
  onDone?: () => void;
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
  onDone,
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
      if (expected && entered && entered !== expected) {
        showNotification({
          type: 'error',
          title: 'Transaction ID mismatch',
          message:
            'Entered reference does not match the one on file. Leave it blank to confirm without a match.',
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
      onDone?.();
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
        onConfirm={() => void runAction('confirm')}
        title="Confirm payment received"
        message={`Confirm ${amountLabel} was received? Reference number is optional for now${
          referenceNumber ? ` (on file: ${referenceNumber})` : ''
        }.`}
        confirmText="Confirm received"
        cancelText="Cancel"
        variant="success"
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
