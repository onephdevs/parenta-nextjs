'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useNotifications } from '@/hooks/useNotifications';

interface TerminateLeaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  leaseId: string;
  tenantName?: string;
  initialDate?: string | null;
  onTerminated?: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function TerminateLeaseDialog({
  isOpen,
  onClose,
  leaseId,
  tenantName,
  initialDate,
  onTerminated,
}: TerminateLeaseDialogProps) {
  const { showNotification } = useNotifications();
  const [plannedMoveOutDate, setPlannedMoveOutDate] = useState(initialDate || todayIso());
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPlannedMoveOutDate(initialDate || todayIso());
    setReason('');
  }, [isOpen, initialDate]);

  const handleConfirm = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(plannedMoveOutDate)) {
      showNotification({
        type: 'error',
        title: 'Move-out date required',
        message: 'Set the planned move-out date so occupancy analytics can compare notice vs actual leave.',
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/leases/${leaseId}/terminate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          plannedMoveOutDate,
          reason: reason.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to terminate lease');
      }
      showNotification({
        type: 'success',
        title: 'Lease ended on paper',
        message: 'The unit stays occupied until End Assignment or Finalize move-out.',
      });
      onClose();
      onTerminated?.();
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Could not terminate',
        message: error instanceof Error ? error.message : 'Failed to terminate lease',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Terminate lease"
      description={
        tenantName
          ? `End ${tenantName}’s contract on paper. This does not empty the unit.`
          : 'End the contract on paper. This does not empty the unit.'
      }
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} isDisabled={saving}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={() => void handleConfirm()} isLoading={saving}>
            Terminate
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField
          label="Planned move-out date"
          htmlFor="planned-move-out"
          required
          hint="Flexible — not necessarily today. Used later to compare notice date vs the day the room actually became vacant."
        >
          <Input
            id="planned-move-out"
            type="date"
            value={plannedMoveOutDate}
            onChange={(e) => setPlannedMoveOutDate(e.target.value)}
          />
        </FormField>
        <FormField label="Reason (optional)" htmlFor="terminate-reason">
          <Textarea
            id="terminate-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. 30-day notice, end of term, owner request"
          />
        </FormField>
      </div>
    </Dialog>
  );
}
