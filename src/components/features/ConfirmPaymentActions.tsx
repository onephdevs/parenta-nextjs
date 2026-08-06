'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/hooks/useNotifications';

interface ConfirmPaymentActionsProps {
  paymentId: string;
  referenceNumber?: string | null;
  amountLabel: string;
}

export default function ConfirmPaymentActions({
  paymentId,
  referenceNumber,
  amountLabel,
}: ConfirmPaymentActionsProps) {
  const router = useRouter();
  const { showNotification } = useNotifications();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const runAction = async (action: 'confirm' | 'reject') => {
    const verb = action === 'confirm' ? 'confirm' : 'reject';
    const ok = window.confirm(
      action === 'confirm'
        ? `Confirm this payment of ${amountLabel}?\n\nCross-check Transaction ID: ${
            referenceNumber || 'N/A'
          }\n\nInvoice balances will update after confirmation.`
        : `Reject this payment claim of ${amountLabel}?\n\nTransaction ID: ${
            referenceNumber || 'N/A'
          }`
    );
    if (!ok) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showNotification({
          type: 'error',
          title: `Could not ${verb} payment`,
          message: data.error || data.message || 'Request failed',
        });
        return;
      }
      showNotification({
        type: 'success',
        title: action === 'confirm' ? 'Payment confirmed' : 'Payment rejected',
        message: data.message || `Payment ${verb}ed successfully`,
      });
      router.refresh();
    } catch (error) {
      showNotification({
        type: 'error',
        title: `Could not ${verb} payment`,
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
        onClick={() => void runAction('confirm')}
        isLoading={isSubmitting}
        leftIcon={<CheckCircle2 className="h-4 w-4" />}
      >
        Confirm payment
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => void runAction('reject')}
        isDisabled={isSubmitting}
        leftIcon={<XCircle className="h-4 w-4" />}
      >
        Reject
      </Button>
    </div>
  );
}
