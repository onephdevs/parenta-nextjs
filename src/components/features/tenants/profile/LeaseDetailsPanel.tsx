'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Ban, Download, Pencil, RefreshCw } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import type { TenantProfileAssignment } from './types';
import { deriveLeaseRowStatus, formatDateRange, formatProfileDate } from './utils';

interface LeaseActivity {
  id: string;
  actorName: string;
  action: string;
  reason?: string | null;
  createdAt: string;
  viewHref?: string | null;
}

interface LeaseDetailsPanelProps {
  lease: TenantProfileAssignment;
  tenantId: string;
  onBack: () => void;
}

export function LeaseDetailsPanel({ lease, tenantId, onBack }: LeaseDetailsPanelProps) {
  const status = deriveLeaseRowStatus(lease);
  const [activity, setActivity] = useState<LeaseActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/leases/${encodeURIComponent(lease.id)}`, {
          credentials: 'include',
        });
        if (!res.ok) {
          // Fallback activity from assignment fields when lease API has no record
          if (!cancelled) {
            setActivity([
              {
                id: 'local-created',
                actorName: 'System',
                action: 'Created the lease.',
                createdAt: lease.startDate || new Date().toISOString(),
              },
            ]);
          }
          return;
        }
        const json = await res.json();
        const leaseData = json.data?.lease || json.lease || json.data || {};
        const rawActivity =
          json.data?.activity ||
          json.activity ||
          leaseData.activity ||
          [];
        const mapped: LeaseActivity[] = Array.isArray(rawActivity)
          ? rawActivity.map((a: Record<string, unknown>, i: number) => ({
              id: String(a.id || i),
              actorName: String(a.actorName || a.actor_name || a.userName || 'System'),
              action: String(a.action || a.description || a.message || 'Updated the lease.'),
              reason: (a.reason as string) || null,
              createdAt: String(a.createdAt || a.created_at || ''),
              viewHref: (a.viewHref as string) || null,
            }))
          : [];

        if (!cancelled) {
          setActivity(
            mapped.length
              ? mapped
              : [
                  {
                    id: 'local-created',
                    actorName: 'System',
                    action: 'Created the lease.',
                    createdAt: lease.startDate || new Date().toISOString(),
                  },
                ]
          );
        }
      } catch {
        if (!cancelled) {
          setActivity([
            {
              id: 'local-created',
              actorName: 'System',
              action: 'Created the lease.',
              createdAt: lease.startDate || new Date().toISOString(),
            },
          ]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lease.id, lease.startDate]);

  const deposit = lease.depositPaid ?? null;
  const advance = lease.advancePaid ?? null;
  const cashout =
    deposit != null || advance != null
      ? (deposit || 0) + (advance || 0) + (lease.utilityDepositPaid || 0)
      : null;

  const monthsHint = useMemo(() => {
    if (!lease.startDate || !lease.endDate) return null;
    const start = new Date(lease.startDate);
    const end = new Date(lease.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return months > 0 ? `${months} months` : null;
  }, [lease.startDate, lease.endDate]);

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="text-base font-bold text-gray-900">Lease Details</h3>
          <div className="flex items-center gap-1.5">
            <IconAction
              href={`/admin/tenants/${tenantId}/leases/${lease.id}/renew`}
              label="Renew"
              className="text-teal-600 hover:bg-teal-50"
            >
              <RefreshCw className="h-4 w-4" />
            </IconAction>
            <IconAction
              href={`/admin/leasing/${lease.id}?action=terminate`}
              label="Terminate"
              className="text-red-600 hover:bg-red-50"
            >
              <Ban className="h-4 w-4" />
            </IconAction>
            <IconAction
              href={`/admin/tenants/${tenantId}/leases/${lease.id}/edit`}
              label="Edit"
              className="text-gray-600 hover:bg-gray-50"
            >
              <Pencil className="h-4 w-4" />
            </IconAction>
            <IconAction
              href={`/admin/tenants/${tenantId}`}
              label="Download"
              className="text-gray-600 hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
            </IconAction>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
          <dl className="space-y-4">
            <Detail
              label="Property / Unit"
              value={`${lease.buildingName} - Unit ${lease.roomNumber}`}
            />
            <Detail
              label="Lease Duration"
              value={formatDateRange(lease.startDate, lease.endDate)}
            />
            <Detail label="Rent Amount" value={formatCurrency(lease.monthlyRate)} />
            <Detail
              label="Advance"
              value={
                advance != null ? (
                  <span>
                    {formatCurrency(advance)}
                    {lease.leasePackageAdvanceMonths != null ? (
                      <span className="ml-1 text-xs font-normal text-gray-500">
                        ({lease.leasePackageAdvanceMonths} month
                        {lease.leasePackageAdvanceMonths === 1 ? '' : 's'})
                      </span>
                    ) : null}
                  </span>
                ) : (
                  '—'
                )
              }
            />
            <Detail
              label="Deposit"
              value={
                deposit != null ? (
                  <span>
                    {formatCurrency(deposit)}
                    {lease.leasePackageDepositMonths != null ? (
                      <span className="ml-1 text-xs font-normal text-gray-500">
                        ({lease.leasePackageDepositMonths} month
                        {lease.leasePackageDepositMonths === 1 ? '' : 's'})
                      </span>
                    ) : null}
                  </span>
                ) : (
                  '—'
                )
              }
            />
            <Detail
              label="Initial Cashout"
              value={cashout != null ? formatCurrency(cashout) : '—'}
            />
          </dl>

          <dl className="space-y-4">
            <div>
              <dt className="text-xs text-gray-500">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={status} />
              </dd>
            </div>
            <Detail
              label="Lease Template"
              value={lease.leasePackageTemplateName || '—'}
            />
            <Detail
              label="Lease Term"
              value={
                lease.leasePackageTemplateName
                  ? lease.leasePackageTermMonths == null
                    ? 'No fixed term'
                    : `${lease.leasePackageTermMonths} months`
                  : monthsHint || '—'
              }
            />
            <Detail
              label="Grace Period"
              value={
                lease.leasePackageGracePeriodDays != null
                  ? `${lease.leasePackageGracePeriodDays} day${lease.leasePackageGracePeriodDays === 1 ? '' : 's'}`
                  : '—'
              }
            />
            <Detail
              label="Penalty Fee"
              value={
                lease.leasePackagePenaltyType == null || lease.leasePackagePenaltyFee == null
                  ? '—'
                  : lease.leasePackagePenaltyType === 'percentage'
                    ? `${lease.leasePackagePenaltyFee}% (Percentage)`
                    : `${formatCurrency(lease.leasePackagePenaltyFee)} (Flat Fee)`
              }
            />
          </dl>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h4 className="text-sm font-bold text-gray-900">Activity</h4>
        {loading ? (
          <p className="mt-4 text-sm text-gray-500">Loading activity…</p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-100">
            {activity.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <p className="text-sm text-gray-800">
                  <span className="font-bold">{entry.actorName}</span>{' '}
                  {entry.action}
                  {entry.reason ? (
                    <>
                      {' '}
                      Reason: &ldquo;{entry.reason}&rdquo;
                    </>
                  ) : null}
                  {entry.viewHref ? (
                    <>
                      {' '}
                      <Link
                        href={entry.viewHref}
                        className="font-semibold text-indigo-600 hover:underline"
                      >
                        View
                      </Link>
                    </>
                  ) : null}
                </p>
                <p className="flex-shrink-0 text-xs text-gray-500">
                  {formatActivityTimestamp(entry.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function IconAction({
  href,
  label,
  className,
  children,
}: {
  href: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 ${className || ''}`}
    >
      {children}
    </Link>
  );
}

function formatActivityTimestamp(value: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return formatProfileDate(value);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
}
