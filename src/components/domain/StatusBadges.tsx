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
    pending: 'warning',
    overdue: 'danger',
    draft: 'neutral',
    cancelled: 'neutral',
    void: 'neutral',
  };
  return <Badge tone={map[status.toLowerCase()] ?? 'neutral'}>{formatLabel(status)}</Badge>;
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

export {
  PaymentStatusBadge,
  InvoiceStatusBadge,
  RoomStatusBadge,
  TenantStatusBadge,
  AssetStatusBadge,
  AssetConditionBadge,
  MaintenanceStatusBadge,
  ReservationStatusBadge,
};
