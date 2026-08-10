'use client';

import { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { looksLikeImage, useImageLightbox } from '@/components/ui/ImageLightbox';

interface DownloadReceiptButtonProps {
  paymentId: string;
  hasReceipt: boolean;
}

export default function DownloadReceiptButton({
  paymentId,
  hasReceipt,
}: DownloadReceiptButtonProps) {
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotifications();
  const { open: openLightbox } = useImageLightbox();

  const handleDownload = async () => {
    if (!hasReceipt) {
      showNotification({
        type: 'error',
        title: 'No receipt',
        message: 'This payment does not have an uploaded receipt yet.',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/payments/${paymentId}/receipt`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to download receipt');
      }

      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="([^"]+)"/);
      const fileName = match?.[1] || `receipt-${paymentId}.pdf`;

      const url = URL.createObjectURL(blob);

      if (
        looksLikeImage({
          mimeType: blob.type,
          fileName,
        })
      ) {
        openLightbox({ src: url, alt: fileName, title: fileName });
        showNotification({
          type: 'success',
          title: 'Receipt opened',
          message: 'Use zoom controls in the viewer, or close when done.',
        });
        return;
      }

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      showNotification({
        type: 'success',
        title: 'Download started',
        message: 'Receipt download has started.',
      });
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Download failed',
        message: error instanceof Error ? error.message : 'Failed to download receipt',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
    >
      <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      {loading ? 'Opening…' : 'View / Download Receipt'}
    </button>
  );
}
