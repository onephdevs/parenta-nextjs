'use client';

import Link from 'next/link';
import { Building2, Home } from 'lucide-react';
import {
  Button,
  DescriptionItem,
  DescriptionList,
  DetailSection,
  PageHeader,
} from '@/components/ui';
import type { LeasePackageTemplateDetail } from '@/lib/lease-package-templates-shared';
import {
  formatAdvanceLabel,
  formatDepositLabel,
  formatGraceLabel,
  formatPenaltyFeeLabel,
  formatPenaltyTypeLabel,
  formatTermLabel,
} from '@/lib/lease-package-templates-shared';

function unitLabel(roomNumber: string): string {
  const trimmed = (roomNumber || '').trim();
  if (!trimmed) return 'Unit';
  if (/^(room|unit)\b/i.test(trimmed)) return trimmed;
  return `Unit ${trimmed}`;
}

function formatDate(value: string | null): string {
  if (!value) return 'Open-ended';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface LeaseTemplateDetailViewProps {
  detail: LeasePackageTemplateDetail;
}

export default function LeaseTemplateDetailView({ detail }: LeaseTemplateDetailViewProps) {
  const unitCount = detail.appliedUnitCount ?? 0;
  const buildingCount = detail.appliedBuildingCount ?? 0;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={detail.name}
        description="Preview this lease package and see where it is currently applied."
        backHref="/admin/leasing"
        backLabel="Back to leasing"
        actions={
          <Link href={`/admin/leasing/${detail.id}/edit`}>
            <Button>Edit template</Button>
          </Link>
        }
      />

      <DetailSection
        title="Lease details"
        description="Commercial terms used when this package is assigned to a tenant."
      >
        <DescriptionList>
          <DescriptionItem label="Template name">{detail.name}</DescriptionItem>
          <DescriptionItem label="Lease term">
            {formatTermLabel(detail.termMonths)}
          </DescriptionItem>
          <DescriptionItem label="Deposit period">
            {formatDepositLabel(detail.depositMonths)}
          </DescriptionItem>
          <DescriptionItem label="Advance period">
            {formatAdvanceLabel(detail.advanceMonths)}
          </DescriptionItem>
          <DescriptionItem label="Grace period">
            {formatGraceLabel(detail.gracePeriodDays)}
          </DescriptionItem>
          <DescriptionItem label="Penalty type">
            {formatPenaltyTypeLabel(detail.penaltyType)}
          </DescriptionItem>
          <DescriptionItem label="Penalty fee">
            {formatPenaltyFeeLabel(detail.penaltyType, detail.penaltyFee)}
          </DescriptionItem>
        </DescriptionList>
      </DetailSection>

      <DetailSection
        title="Applied to"
        description={
          unitCount > 0
            ? `${unitCount} ${unitCount === 1 ? 'unit' : 'units'} across ${buildingCount} ${
                buildingCount === 1 ? 'building' : 'buildings'
              }`
            : 'No active leases are using this template yet.'
        }
      >
        {detail.appliedBuildings.length === 0 ? (
          <div className="border-t border-gray-200 px-4 py-10 text-center sm:px-6">
            <p className="text-sm text-gray-500">
              Assign this template when creating or editing a tenant lease to see buildings and
              rooms here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 border-t border-gray-200">
            {detail.appliedBuildings.map((building) => (
              <div key={building.buildingId} className="px-4 py-5 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/admin/properties?buildingId=${building.buildingId}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 hover:underline"
                  >
                    <Building2 className="h-4 w-4 text-gray-500" />
                    {building.buildingName}
                  </Link>
                  <span className="text-xs font-medium text-gray-500">
                    {building.rooms.length}{' '}
                    {building.rooms.length === 1 ? 'unit' : 'units'}
                  </span>
                </div>
                <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200">
                  {building.rooms.map((room) => (
                    <li
                      key={room.roomId}
                      className="flex flex-wrap items-center justify-between gap-2 bg-white px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/admin/rooms?roomId=${room.roomId}`}
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 hover:underline"
                        >
                          <Home className="h-3.5 w-3.5 text-gray-400" />
                          {unitLabel(room.roomNumber)}
                        </Link>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {room.tenantId && room.tenantName ? (
                            <Link
                              href={`/admin/tenants/${room.tenantId}`}
                              className="hover:underline"
                            >
                              {room.tenantName}
                            </Link>
                          ) : (
                            'No tenant'
                          )}
                          {' · '}
                          {formatDate(room.startDate)}
                          {room.endDate ? ` – ${formatDate(room.endDate)}` : ' – Open-ended'}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </DetailSection>
    </div>
  );
}
