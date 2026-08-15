'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/hooks/useNotifications';
import { useTenantTheme } from '@/hooks/useTenantTheme';
import { ReceiptImageField } from '@/components/features/tenant/ReceiptImageField';

interface TenantReplaceReceiptFormProps {
  paymentId: string;
  onUploaded?: () => void;
}

export function TenantReplaceReceiptForm({
  paymentId,
  onUploaded,
}: TenantReplaceReceiptFormProps) {
  const theme = useTenantTheme();
  const { showNotification } = useNotifications();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      showNotification({
        type: 'error',
        title: 'Missing image',
        message: 'Take a photo or choose a clearer receipt screenshot.',
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('paymentId', paymentId);
      const response = await fetch('/api/tenant/payments/upload-receipt', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!data.success) {
        showNotification({
          type: 'error',
          title: 'Could not send screenshot',
          message: data.error || 'Try again',
        });
        return;
      }
      showNotification({
        type: 'success',
        title: 'New screenshot sent',
        message: 'The office will review this same request again.',
      });
      setFile(null);
      onUploaded?.();
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Could not send screenshot',
        message: error instanceof Error ? error.message : 'Try again',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <ReceiptImageField
        file={file}
        onChange={setFile}
        disabled={isUploading}
        label="New receipt screenshot"
      />
      <Button
        type="submit"
        isLoading={isUploading}
        disabled={isUploading || !file}
        leftIcon={<Upload className="h-4 w-4" />}
        className={theme.primaryButton}
      >
        Send new screenshot
      </Button>
    </form>
  );
}
