'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAppDialog } from '@/hooks/useAppDialog';

interface AssetTrackQuickActionsProps {
  assetId: string;
  assetName: string;
  buildingId?: string;
}

export default function AssetTrackQuickActions({
  assetId,
  assetName,
  buildingId,
}: AssetTrackQuickActionsProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const { prompt, dialog } = useAppDialog();

  const runAction = async (action: 'report_issue' | 'request_maintenance' | 'update_location') => {
    setBusy(action);
    setMessage('');
    try {
      let location: string | undefined;
      if (action === 'update_location') {
        const input = await prompt({
          title: 'Update location',
          message: 'Enter new location description:',
          defaultValue: '',
        });
        if (input === null) {
          setBusy(null);
          return;
        }
        location = input.trim();
        if (!location) {
          setMessage('Location is required.');
          setBusy(null);
          return;
        }
      }

      const response = await fetch(`/api/track/asset/${assetId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, location, buildingId, assetName }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Action failed');
      }
      setMessage(result.message || 'Action completed');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card padding="none" className="mt-8">
      {dialog}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Button
            variant="outline"
            disabled={!!busy}
            isLoading={busy === 'report_issue'}
            onClick={() => runAction('report_issue')}
            className="w-full"
          >
            {busy === 'report_issue' ? 'Submitting…' : 'Report Issue'}
          </Button>
          <Button
            variant="outline"
            disabled={!!busy}
            isLoading={busy === 'request_maintenance'}
            onClick={() => runAction('request_maintenance')}
            className="w-full"
          >
            {busy === 'request_maintenance' ? 'Submitting…' : 'Request Maintenance'}
          </Button>
          <Button
            variant="outline"
            disabled={!!busy}
            isLoading={busy === 'update_location'}
            onClick={() => runAction('update_location')}
            className="w-full"
          >
            {busy === 'update_location' ? 'Updating…' : 'Update Location'}
          </Button>
        </div>
        {message && <p className="mt-4 text-sm text-gray-800">{message}</p>}
      </div>
    </Card>
  );
}
