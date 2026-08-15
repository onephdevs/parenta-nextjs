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
  invoiceNumber?: string | null;
  parentaTxnId?: string | null;
  amountLabel: string;
  onDone?: (action: 'confirm' | 'reject') => void;
  compact?: boolean;
}

function normalizeTxn(value: string | null | undefined): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function claimDecisionMessage({
  action,
  amountLabel,
  invoiceNumber,
  parentaTxnId,
  referenceNumber,
}: {
  action: 'confirm' | 'reject';
  amountLabel: string;
  invoiceNumber?: string | null;
  parentaTxnId?: string | null;
  referenceNumber?: string | null;
}): string {
  const intro =
    action === 'confirm'
      ? `Confirm this payment claim of ${amountLabel} was received?`
      : `Reject this payment claim of ${amountLabel}?`;
  const details = [
    invoiceNumber?.trim() ? `Invoice: ${invoiceNumber.trim()}` : null,
    parentaTxnId?.trim() ? `Transaction: ${parentaTxnId.trim()}` : null,
    referenceNumber?.trim()
      ? `GCash / bank reference: ${referenceNumber.trim()}`
      : null,
  ].filter(Boolean);
  const extra =
    action === 'confirm'
      ? 'You can enter a GCash or bank reference below if you want it on the record.'
      : null;
  return [intro, details.join('\n'), extra].filter(Boolean).join('\n\n');
}

function ConfirmPaymentActions({
  paymentId,
  referenceNumber,
  invoiceNumber,
  parentaTxnId,
  amountLabel,
  onDone,
  compact = false,
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
          title: 'Reference mismatch',
          message:
            'Entered GCash / bank reference does not match the one on file. Leave it blank to confirm without a match.',
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
      onDone?.(action);
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
        size={compact ? 'sm' : 'md'}
        onClick={() => setConfirmOpen(true)}
        isLoading={isSubmitting}
        leftIcon={<CheckCircle2 className="h-4 w-4" />}
      >
        {compact ? 'Confirm' : 'Confirm payment'}
      </Button>
      <Button
        type="button"
        size={compact ? 'sm' : 'md'}
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
        message={claimDecisionMessage({
          action: 'confirm',
          amountLabel,
          invoiceNumber,
          parentaTxnId,
          referenceNumber,
        })}
        confirmText="Confirm received"
        cancelText="Cancel"
        variant="success"
        mode="prompt"
        promptPlaceholder="GCash / bank reference (optional)"
        isLoading={isSubmitting}
      />

      <ConfirmDialog
        isOpen={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={() => void runAction('reject')}
        title="Reject payment claim"
        message={claimDecisionMessage({
          action: 'reject',
          amountLabel,
          invoiceNumber,
          parentaTxnId,
          referenceNumber,
        })}
        confirmText="Reject"
        cancelText="Cancel"
        variant="danger"
        isLoading={isSubmitting}
      />
    </div>
  );
}

export { ConfirmPaymentActions };
export default ConfirmPaymentActions;
