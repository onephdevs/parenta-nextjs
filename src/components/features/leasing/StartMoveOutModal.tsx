'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useNotifications } from '@/hooks/useNotifications';
import type { LeaseListItem } from '@/lib/leases-shared';

interface StartMoveOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Prefill when opened from a specific lease. */
  initialAssignmentId?: string;
  initialTenantId?: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function leaseLabel(lease: LeaseListItem): string {
  const name = `${lease.tenantFirstName} ${lease.tenantLastName}`.trim() || 'Tenant';
  return `${name} · ${lease.buildingName} · Room ${lease.roomNumber}`;
}

export default function StartMoveOutModal({
  isOpen,
  onClose,
  initialAssignmentId,
  initialTenantId,
}: StartMoveOutModalProps) {
  const router = useRouter();
  const { showNotification } = useNotifications();
  const [leases, setLeases] = useState<LeaseListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assignmentId, setAssignmentId] = useState(initialAssignmentId || '');
  const [moveoutDate, setMoveoutDate] = useState(todayIso());

  useEffect(() => {
    if (!isOpen) return;
    setAssignmentId(initialAssignmentId || '');
    setMoveoutDate(todayIso());
  }, [isOpen, initialAssignmentId]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const response = await fetch('/api/leases?status=all&limit=100&includeStats=false', {
          credentials: 'include',
        });
        const data = await response.json();
        if (cancelled) return;
        const list: LeaseListItem[] = Array.isArray(data.data) ? data.data : [];
        setLeases(list.filter((lease) => lease.assignmentStatus === 'active'));
      } catch {
        if (!cancelled) setLeases([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const options = useMemo(() => {
    if (initialAssignmentId && !leases.some((lease) => lease.id === initialAssignmentId)) {
      return leases;
    }
    return leases;
  }, [leases, initialAssignmentId]);

  const selected = options.find((lease) => lease.id === assignmentId);

  const handleSubmit = async () => {
    const lease = selected;
    const tenantId = lease?.tenantId || initialTenantId || '';
    const roomAssignmentId = assignmentId || initialAssignmentId || '';
    if (!tenantId || !roomAssignmentId || !moveoutDate) {
      showNotification({
        type: 'error',
        title: 'Missing details',
        message: 'Choose an occupied lease and a move-out date.',
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/lease/moveouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId,
          roomAssignmentId,
          moveoutDate,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to start move-out');
      }
      const moveoutId = data.data?.moveoutId;
      showNotification({
        type: 'success',
        title: 'Move-out started',
        message: 'Inspection worksheet is ready. The unit stays occupied until you finalize.',
      });
      onClose();
      if (moveoutId) {
        router.push(`/admin/leasing/moveouts/${moveoutId}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Could not start move-out',
        message: error instanceof Error ? error.message : 'Failed to start move-out',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Start move-out"
      description="Creates the inspection worksheet. The room stays occupied until you finalize move-out."
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} isDisabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} isLoading={saving}>
            Start move-out
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Occupied lease" htmlFor="moveout-lease" required>
          {initialAssignmentId ? (
            <p className="text-sm font-medium text-gray-900">
              {selected ? leaseLabel(selected) : 'This lease'}
            </p>
          ) : (
            <Select
              id="moveout-lease"
              value={assignmentId}
              onChange={(e) => setAssignmentId(e.target.value)}
              disabled={loading}
            >
              <option value="">
                {loading ? 'Loading leases…' : 'Select tenant and unit'}
              </option>
              {options.map((lease) => (
                <option key={lease.id} value={lease.id}>
                  {leaseLabel(lease)}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField
          label="Planned move-out date"
          htmlFor="moveout-date"
          required
          hint="This is the inspection target date, not the day the unit becomes vacant."
        >
          <Input
            id="moveout-date"
            type="date"
            value={moveoutDate}
            onChange={(e) => setMoveoutDate(e.target.value)}
          />
        </FormField>
      </div>
    </Dialog>
  );
}
