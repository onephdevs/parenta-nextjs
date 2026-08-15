'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/hooks/useNotifications';

interface EmailReceiptButtonProps {
  paymentId: string;
}

export default function EmailReceiptButton({ paymentId }: EmailReceiptButtonProps) {
  const { showNotification } = useNotifications();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}/email-receipt`, {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to email receipt');
      }
      showNotification({
        type: 'success',
        title: 'Email queued',
        message: 'Receipt email was queued for the tenant.',
      });
    } catch (err) {
      showNotification({
        type: 'error',
        title: 'Email failed',
        message: err instanceof Error ? err.message : 'Unable to email receipt',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      leftIcon={<Mail className="h-4 w-4" />}
      isLoading={loading}
      onClick={() => {
        void handleClick();
      }}
    >
      Email to Tenant
    </Button>
  );
}
