'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/hooks/useNotifications';

interface PreviewTenantPortalButtonProps {
  tenantId: string;
  tenantName: string;
}

export function PreviewTenantPortalButton({
  tenantId,
  tenantName,
}: PreviewTenantPortalButtonProps) {
  const router = useRouter();
  const { showNotification, updateNotification } = useNotifications();
  const [loading, setLoading] = useState(false);

  const handlePreview = async () => {
    setLoading(true);
    const id = showNotification({
      type: 'loading',
      title: 'Opening tenant preview...',
      message: `Loading portal view for ${tenantName}`,
    });

    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}/preview`, {
        method: 'POST',
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.details || result.error || 'Failed to start preview');
      }

      updateNotification(id, {
        type: 'success',
        title: 'Tenant preview ready',
        message: 'Opening read-only portal view…',
      });

      router.push(result.data?.portalUrl || '/tenant');
    } catch (error) {
      updateNotification(id, {
        type: 'error',
        title: 'Could not open preview',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => void handlePreview()}
      isLoading={loading}
      className="inline-flex items-center"
    >
      <Eye className="mr-2 h-4 w-4" />
      Preview portal
    </Button>
  );
}
