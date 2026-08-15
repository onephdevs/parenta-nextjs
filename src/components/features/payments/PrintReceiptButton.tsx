'use client';

import { useState } from 'react';
import { Printer } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

interface PrintReceiptButtonProps {
  paymentId: string;
  className?: string;
}

/**
 * Opens the same generated PDF as Download, then triggers the browser print dialog.
 */
export default function PrintReceiptButton({
  paymentId,
  className,
}: PrintReceiptButtonProps) {
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotifications();

  const handlePrint = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/payments/${paymentId}/print?inline=1`,
        { credentials: 'include' }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load receipt for printing');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = url;
      document.body.appendChild(iframe);

      const cleanup = () => {
        URL.revokeObjectURL(url);
        iframe.remove();
      };

      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          // Fallback: open PDF in a new tab for manual print
          window.open(url, '_blank', 'noopener,noreferrer');
        }
        // Keep blob alive briefly so the print dialog can read it
        window.setTimeout(cleanup, 60_000);
      };
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Print failed',
        message:
          error instanceof Error ? error.message : 'Unable to print receipt',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => {
        void handlePrint();
      }}
      disabled={loading}
      className={
        className ||
        'inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50'
      }
    >
      <Printer className="mr-2 h-4 w-4" aria-hidden />
      {loading ? 'Preparing…' : 'Print'}
    </button>
  );
}
