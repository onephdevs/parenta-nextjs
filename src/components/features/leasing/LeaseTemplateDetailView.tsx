'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StatBlock } from '@/components/ui/StatBlock';
import { formatDateTime } from '@/lib/utils';
import type { LeasePackageTemplateDetail } from '@/lib/lease-package-templates-shared';
import {
  formatAdvanceLabel,
  formatDepositLabel,
  formatGraceLabel,
  formatPenaltyFeeLabel,
  formatPenaltyTypeLabel,
  formatTermLabel,
} from '@/lib/lease-package-templates-shared';

function formatUnitLabel(roomNumber: string): string {
  const trimmed = (roomNumber || '').trim();
  if (!trimmed) return 'Unit';
  if (/^(room|unit)\b/i.test(trimmed)) return trimmed;
  return `Unit ${trimmed}`;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
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

function PairRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-semibold text-gray-900">{value}</dd>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  const text = String(value || '').trim();
  if (!text || text === '—') return null;
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-gray-900">{text}</dd>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 border-l-4 border-l-gray-900 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-2.5">
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        {action}
      </div>
      <div className="px-4 py-3.5">{children}</div>
    </section>
  );
}

interface LeaseTemplateDetailViewProps {
  detail: LeasePackageTemplateDetail;
}

export default function LeaseTemplateDetailView({ detail }: LeaseTemplateDetailViewProps) {
  const [showMeta, setShowMeta] = useState(false);
  const unitCount = detail.appliedUnitCount ?? 0;
  const buildingCount = detail.appliedBuildingCount ?? 0;
  const appliedRows = detail.appliedBuildings.flatMap((building) =>
    building.rooms.map((room) => ({
      buildingId: building.buildingId,
      buildingName: building.buildingName,
      ...room,
    }))
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">Lease template</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900">{detail.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={detail.isActive ? 'success' : 'neutral'}>
            {detail.isActive ? 'Active' : 'Inactive'}
          </Badge>
          <Link href={`/admin/lease-templates/${detail.id}/edit`}>
            <Button variant="outline" leftIcon={<Pencil className="h-4 w-4" />}>
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <StatBlock label="Term" value={formatTermLabel(detail.termMonths)} size="lg" />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <StatBlock label="Deposit" value={formatDepositLabel(detail.depositMonths)} size="lg" />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <StatBlock label="Advance" value={formatAdvanceLabel(detail.advanceMonths)} size="lg" />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <StatBlock
            label="Grace period"
            value={formatGraceLabel(detail.gracePeriodDays)}
            size="lg"
          />
        </div>
      </div>

      <Panel
        title="Terms"
        action={
          <button
            type="button"
            onClick={() => setShowMeta((v) => !v)}
            className="text-xs font-medium text-gray-500 hover:text-gray-800"
          >
            {showMeta ? 'Hide details' : 'Show more'}
          </button>
        }
      >
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="Template" value={detail.name} />
          <Field label="Penalty" value={formatPenaltyTypeLabel(detail.penaltyType)} />
        </dl>
        <dl className="mt-3 border-t border-gray-100 pt-2">
          <PairRow
            label="Penalty fee"
            value={formatPenaltyFeeLabel(detail.penaltyType, detail.penaltyFee)}
          />
          <PairRow
            label="In use"
            value={
              unitCount > 0
                ? `${unitCount} ${unitCount === 1 ? 'unit' : 'units'} · ${buildingCount} ${
                    buildingCount === 1 ? 'building' : 'buildings'
                  }`
                : 'Not assigned yet'
            }
          />
          {showMeta ? (
            <>
              <PairRow label="Created" value={formatDateTime(detail.createdAt)} />
              <PairRow label="Updated" value={formatDateTime(detail.updatedAt)} />
            </>
          ) : null}
        </dl>
      </Panel>

      <Panel title="Applied to">
        {appliedRows.length === 0 ? (
          <p className="text-sm text-gray-500">
            No active leases are using this template yet.
          </p>
        ) : (
          <div className="-mx-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2.5">Building</th>
                  <th className="px-4 py-2.5">Unit</th>
                  <th className="px-4 py-2.5">Tenant</th>
                  <th className="px-4 py-2.5">Start</th>
                  <th className="px-4 py-2.5">End</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appliedRows.map((row) => (
                  <tr key={row.roomId} className="hover:bg-gray-50/80">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/admin/properties?buildingId=${row.buildingId}`}
                        className="font-semibold text-gray-900 hover:underline"
                      >
                        {row.buildingName}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/admin/rooms?roomId=${row.roomId}`}
                        className="font-semibold text-indigo-600 hover:underline"
                      >
                        {formatUnitLabel(row.roomNumber)}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      {row.tenantId && row.tenantName ? (
                        <Link
                          href={`/admin/tenants/${row.tenantId}`}
                          className="font-medium text-gray-900 hover:underline"
                        >
                          {row.tenantName}
                        </Link>
                      ) : (
                        <span className="text-gray-500">No tenant</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-800">
                      {formatDate(row.startDate)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-800">
                      {row.endDate ? formatDate(row.endDate) : 'Open-ended'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
