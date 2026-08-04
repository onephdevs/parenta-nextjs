'use client';

import { Badge, BadgeTone } from '@/components/ui/Badge';

function formatLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeTone> = {
    paid: 'success',
    completed: 'success',
    pending: 'warning',
    partial: 'info',
    failed: 'danger',
    refunded: 'neutral',
    cancelled: 'neutral',
  };
  return <Badge tone={map[status.toLowerCase()] ?? 'neutral'}>{formatLabel(status)}</Badge>;
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeTone> = {
    paid: 'success',
    issued: 'info',
    sent: 'info',
    partial: 'warning',
    pending: 'warning',
    due: 'warning',
    overdue: 'danger',
    draft: 'neutral',
    cancelled: 'neutral',
    void: 'neutral',
  };
  const labels: Record<string, string> = {
    due: 'Due',
    overdue: 'Overdue',
    sent: 'Sent',
    partial: 'Partial',
  };
  const key = status.toLowerCase();
  return <Badge tone={map[key] ?? 'neutral'}>{labels[key] ?? formatLabel(status)}</Badge>;
}

function RoomStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeTone> = {
    available: 'success',
    vacant: 'success',
    occupied: 'info',
    reserved: 'warning',
    maintenance: 'warning',
    unavailable: 'danger',
  };
  return <Badge tone={map[status.toLowerCase()] ?? 'neutral'}>{formatLabel(status)}</Badge>;
}

function TenantStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeTone> = {
    active: 'success',
    pending: 'warning',
    inactive: 'neutral',
    former: 'neutral',
    terminated: 'danger',
    evicted: 'danger',
  };
  return <Badge tone={map[status.toLowerCase()] ?? 'neutral'}>{formatLabel(status)}</Badge>;
}

function AssetStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeTone> = {
    available: 'success',
    assigned: 'info',
    maintenance: 'warning',
    disposed: 'danger',
  };
  return <Badge tone={map[status.toLowerCase()] ?? 'neutral'}>{formatLabel(status)}</Badge>;
}

function AssetConditionBadge({ condition }: { condition: string }) {
  const map: Record<string, BadgeTone> = {
    excellent: 'success',
    good: 'info',
    fair: 'warning',
    poor: 'warning',
    damaged: 'danger',
  };
  return (
    <Badge tone={map[condition.toLowerCase()] ?? 'neutral'}>
      {formatLabel(condition)}
    </Badge>
  );
}

function MaintenanceStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeTone> = {
    open: 'warning',
    pending: 'neutral',
    scheduled: 'warning',
    in_progress: 'info',
    completed: 'success',
    cancelled: 'neutral',
  };
  return <Badge tone={map[status.toLowerCase()] ?? 'neutral'}>{formatLabel(status)}</Badge>;
}

function ReservationStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeTone> = {
    active: 'success',
    converted: 'info',
    expired: 'neutral',
    cancelled: 'danger',
  };
  return <Badge tone={map[status.toLowerCase()] ?? 'neutral'}>{formatLabel(status)}</Badge>;
}

function BuildingStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge tone={isActive ? 'success' : 'neutral'}>
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  );
}

function LeaseStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeTone> = {
    active: 'success',
    expiring_soon: 'warning',
    draft: 'neutral',
    pending: 'neutral',
    terminated: 'danger',
  };
  const labels: Record<string, string> = {
    active: 'Active',
    expiring_soon: 'Expiring soon',
    draft: 'Draft',
    pending: 'Draft',
    terminated: 'Terminated',
  };
  const key = status.toLowerCase();
  return <Badge tone={map[key] ?? 'neutral'}>{labels[key] ?? formatLabel(status)}</Badge>;
}

function DocumentStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeTone> = {
    signed: 'success',
    on_file: 'neutral',
    expiring_soon: 'warning',
    needs_review: 'danger',
  };
  const labels: Record<string, string> = {
    signed: 'Signed',
    on_file: 'On file',
    expiring_soon: 'Expiring soon',
    needs_review: 'Needs review',
  };
  const key = status.toLowerCase();
  return <Badge tone={map[key] ?? 'neutral'}>{labels[key] ?? formatLabel(status)}</Badge>;
}

export {
  PaymentStatusBadge,
  InvoiceStatusBadge,
  RoomStatusBadge,
  TenantStatusBadge,
  BuildingStatusBadge,
  AssetStatusBadge,
  AssetConditionBadge,
  MaintenanceStatusBadge,
  ReservationStatusBadge,
  LeaseStatusBadge,
  DocumentStatusBadge,
};
