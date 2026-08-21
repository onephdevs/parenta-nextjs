'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import { Save, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/forms/FormField';
import { Select } from '@/components/ui/Select';
import {
  MaintenancePriorityBadge,
  MaintenanceStatusBadge,
} from '@/components/domain/StatusBadges';
import { MaintenanceThreadPanel } from '@/components/features/maintenance/MaintenanceThreadPanel';
import {
  formatMaintenanceCategory,
  formatMaintenancePriority,
  formatMaintenanceStatus,
} from '@/lib/constants/maintenance';

interface MaintenanceAttachment {
  id: string;
  fileName?: string;
  url: string;
  mimeType?: string;
}

interface MaintenanceDetail {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
  status?: string;
  notes?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  tenant_name?: string;
  tenant_email?: string;
  tenant_phone?: string;
  tenant_avatar_url?: string | null;
  tenantAvatarUrl?: string | null;
  room_number?: string;
  building_name?: string;
  request_date?: string | Date;
  created_at?: string | Date;
  attachments?: MaintenanceAttachment[];
}

interface AssigneeOption {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
}

interface MaintenanceFollowUpPanelProps {
  cardId: string;
  maintenanceRequestId?: string;
  buildingId?: string;
  roomId?: string;
  onUpdated?: () => void;
}

export interface MaintenanceFollowUpHandle {
  persist: () => Promise<void>;
}

function formatDate(value?: string | Date | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function toIso(value?: string | Date | null): string {
  if (!value) return new Date().toISOString();
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

export const MaintenanceFollowUpPanel = forwardRef<
  MaintenanceFollowUpHandle,
  MaintenanceFollowUpPanelProps
>(function MaintenanceFollowUpPanel(
  {
    maintenanceRequestId,
    onUpdated,
  },
  ref
) {
  const [request, setRequest] = useState<MaintenanceDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(maintenanceRequestId));
  const [error, setError] = useState<string | null>(null);
  const [savingFields, setSavingFields] = useState(false);
  const [status, setStatus] = useState('open');
  const [priority, setPriority] = useState('medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);

  const load = useCallback(async () => {
    if (!maintenanceRequestId) {
      setRequest(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/maintenance/${encodeURIComponent(maintenanceRequestId)}`
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load maintenance request');
      }
      const data = json.data as MaintenanceDetail;
      setRequest(data);
      setStatus(String(data.status || 'open'));
      setPriority(String(data.priority || 'medium'));
      setAssignedTo(data.assigned_to ? String(data.assigned_to) : '');
    } catch (err) {
      setRequest(null);
      setError(err instanceof Error ? err.message : 'Failed to load request');
    } finally {
      setLoading(false);
    }
  }, [maintenanceRequestId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetch('/api/pipeline/assignees')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setAssignees(json.data.assignees || []);
      })
      .catch(() => undefined);
  }, []);

  const persist = useCallback(async () => {
    if (!maintenanceRequestId) return;
    setSavingFields(true);
    setError(null);
    try {
      const res = await fetch('/api/maintenance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: maintenanceRequestId,
          status,
          priority,
          assignedTo: assignedTo || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update request');
      }
      onUpdated?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update request';
      setError(message);
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setSavingFields(false);
    }
  }, [assignedTo, maintenanceRequestId, onUpdated, priority, status]);

  useImperativeHandle(ref, () => ({ persist }), [persist]);

  if (!maintenanceRequestId) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
        No linked maintenance request yet.
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading maintenance request…</p>;
  }

  if (!request) {
    return (
      <div className="space-y-2">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-sm text-gray-500">Could not load this maintenance request.</p>
      </div>
    );
  }

  const unitLabel = [request.building_name, request.room_number]
    .filter(Boolean)
    .join(' · ');
  const isClosed =
    status === 'closed' ||
    status === 'completed' ||
    status === 'cancelled';

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 shrink-0 text-gray-500" />
              <p className="truncate text-base font-semibold text-gray-900">
                {request.title || 'Untitled request'}
              </p>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              {unitLabel || 'Unit not set'}
              {request.tenant_name ? ` · ${request.tenant_name}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <MaintenanceStatusBadge status={String(status || 'open')} />
            <MaintenancePriorityBadge
              priority={String(priority || 'medium')}
            />
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-gray-500">Category</dt>
            <dd className="font-medium text-gray-900">
              {formatMaintenanceCategory(request.category)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Opened</dt>
            <dd className="font-medium text-gray-900">
              {formatDate(request.request_date || request.created_at)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Priority</dt>
            <dd className="font-medium text-gray-900">
              {formatMaintenancePriority(priority)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Status</dt>
            <dd className="font-medium text-gray-900">
              {formatMaintenanceStatus(status)}
            </dd>
          </div>
          {request.tenant_email && (
            <div>
              <dt className="text-xs text-gray-500">Tenant email</dt>
              <dd className="font-medium text-gray-900">{request.tenant_email}</dd>
            </div>
          )}
          {request.tenant_phone && (
            <div>
              <dt className="text-xs text-gray-500">Tenant phone</dt>
              <dd className="font-medium text-gray-900">{request.tenant_phone}</dd>
            </div>
          )}
        </dl>
      </section>

      {!isClosed && (
        <section className="space-y-4 rounded-lg border border-gray-200 p-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Update request</h3>
            <p className="text-xs text-gray-500">
              Change status or assignee, then comment in the discussion below.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Status" htmlFor="maint-status">
              <Select
                id="maint-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Resolved</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </FormField>
            <FormField label="Priority" htmlFor="maint-priority">
              <Select
                id="maint-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            </FormField>
            <FormField label="Assigned To" htmlFor="maint-assigned" className="sm:col-span-2">
              <Select
                id="maint-assigned"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              >
                <option value="">Unassigned</option>
                {assignees.map((user) => (
                  <option key={user.id} value={user.id}>
                    {`${user.firstName} ${user.lastName}`.trim() || user.initials}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              leftIcon={<Save className="h-4 w-4" />}
              isLoading={savingFields}
              isDisabled={savingFields}
              onClick={() => void persist().catch(() => undefined)}
            >
              Save status
            </Button>
          </div>
        </section>
      )}

      <MaintenanceThreadPanel
        requestId={maintenanceRequestId}
        status={status}
        title="Discussion"
        fields={{
          status,
          priority,
          assignedTo: assignedTo || null,
        }}
        disabled={isClosed}
        seedMessage={{
          authorName: request.tenant_name || 'Tenant',
          authorRole: 'tenant',
          body: [request.title, request.description].filter(Boolean).join('\n\n'),
          createdAt: toIso(request.request_date || request.created_at),
          photos: (request.attachments || []).map((a) => ({
            url: a.url,
            fileName: a.fileName,
          })),
          avatarUrl: request.tenant_avatar_url || request.tenantAvatarUrl,
        }}
        tenantAvatarUrl={request.tenant_avatar_url || request.tenantAvatarUrl}
        onPosted={(result) => {
          if (result.request?.status) setStatus(String(result.request.status));
          if (result.request?.priority) setPriority(String(result.request.priority));
          if (result.request && 'assignedTo' in result.request) {
            setAssignedTo(
              result.request.assignedTo != null
                ? String(result.request.assignedTo)
                : ''
            );
          }
          onUpdated?.();
        }}
      />
    </div>
  );
});
