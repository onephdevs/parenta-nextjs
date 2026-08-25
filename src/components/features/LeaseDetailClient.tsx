'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Download,
  ExternalLink,
  Eye,
  FileText,
  Pencil,
  UserRound,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { FileAttachmentChip } from '@/components/ui/FileAttachmentChip';
import { StatBlock } from '@/components/ui/StatBlock';
import { ActionDropdown } from '@/components/ui/ActionDropdown';
import {
  InvoiceStatusBadge,
  LeaseStatusBadge,
} from '@/components/domain/StatusBadges';
import {
  addMonthsToDate,
  formatLeaseFormDate,
  formatLeaseMoney,
} from '@/components/features/tenants/profile/leaseTemplates';
import {
  formatAdvanceLabel,
  formatDepositLabel,
  formatGraceLabel,
  formatPenaltyFeeLabel,
  formatPenaltyTypeLabel,
  formatTermLabel,
  type LeasePackagePenaltyType,
} from '@/lib/lease-package-templates-shared';
import { withReturnTo } from '@/lib/navigation';
import { getImageUrl } from '@/lib/format/image-url';
import { cn, formatDateTime } from '@/lib/utils';
import type { LeaseDetail } from '@/lib/leases-shared';

interface OccupantRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  relationship: string;
}

interface PaymentRow {
  id: string;
  invoiceNumber: string;
  dueDate: string | null;
  totalAmount: number;
  amountPaid: number;
  status: string;
}

interface DocumentRow {
  id: string;
  fileName: string;
  fileUrl: string | null;
  category: string | null;
}

interface ActivityRow {
  id: string;
  description: string;
  createdAt: string;
  actorName: string | null;
  reason?: string | null;
}

interface TenantSnapshot {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  dateOfBirth?: string | Date | null;
  previousAddress?: string | null;
  profilePictureUrl?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelationship?: string | null;
}

interface LeaseDetailPayload {
  lease: LeaseDetail;
  occupants: OccupantRow[];
  payments: PaymentRow[];
  documents: DocumentRow[];
  activity: ActivityRow[];
}

interface LeaseDetailClientProps {
  leaseId: string;
}

function formatUnitLabel(roomNumber: string): string {
  const raw = roomNumber.trim();
  if (!raw) return '—';
  if (/^(room|unit)\b/i.test(raw)) return raw;
  return `Room ${raw}`;
}

function splitName(full?: string | null): { first: string; middle: string; last: string } {
  const parts = String(full || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return { first: '', middle: '', last: '' };
  if (parts.length === 1) return { first: parts[0], middle: '', last: '' };
  if (parts.length === 2) return { first: parts[0], middle: '', last: parts[1] };
  return {
    first: parts[0],
    middle: parts.slice(1, -1).join(' '),
    last: parts[parts.length - 1],
  };
}

function toPenaltyType(value?: string | null): LeasePackagePenaltyType | null {
  if (!value) return null;
  if (value === 'percentage') return 'percentage';
  return 'flat_fee';
}

function matchesDoc(doc: DocumentRow, needles: string[]): boolean {
  const haystack = `${doc.category || ''} ${doc.fileName || ''}`.toLowerCase();
  return needles.some((needle) => haystack.includes(needle));
}

function isFilled(value?: string | null): boolean {
  const text = String(value || '').trim();
  return text.length > 0 && text !== '—';
}

function formatDueDate(value?: string | null): string {
  if (!value) return '—';
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function Field({
  label,
  value,
  emphasize,
}: {
  label: string;
  value?: string | null;
  emphasize?: boolean;
}) {
  if (!isFilled(value)) return null;
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd
        className={cn(
          'mt-0.5 truncate text-sm text-gray-900',
          emphasize ? 'text-base font-bold tabular-nums' : 'font-semibold'
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function PairRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-semibold text-gray-900">{value}</dd>
    </div>
  );
}

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
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

export default function LeaseDetailClient({ leaseId }: LeaseDetailClientProps) {
  const [data, setData] = useState<LeaseDetailPayload | null>(null);
  const [tenant, setTenant] = useState<TenantSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEmptyTenant, setShowEmptyTenant] = useState(false);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/leases/${leaseId}`, { credentials: 'include' });
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Failed to load lease');
        }
        if (cancelled) return;
        const payload = result.data as LeaseDetailPayload;
        setData(payload);

        if (payload.lease.tenantId) {
          const tenantRes = await fetch(`/api/tenants/${payload.lease.tenantId}`, {
            credentials: 'include',
          });
          const tenantJson = await tenantRes.json();
          if (!cancelled && tenantRes.ok && tenantJson.success) {
            setTenant(tenantJson.data || null);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load lease');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [leaseId]);

  const lease = data?.lease;
  const rent = Number(lease?.monthlyRate || 0);
  const depositMonths = lease?.leasePackageDepositMonths ?? null;
  const advanceMonths = lease?.leasePackageAdvanceMonths ?? 1;
  const termMonths = lease?.leasePackageTermMonths ?? null;
  const penaltyType = toPenaltyType(lease?.leasePackagePenaltyType);
  const depositAmount =
    depositMonths != null
      ? depositMonths * rent
      : Number(lease?.depositPaid || lease?.securityDeposit || 0);
  const advanceAmount =
    lease?.leasePackageAdvanceMonths != null
      ? advanceMonths * rent
      : Number(lease?.advancePaid || 0);
  const initialCashout = depositAmount + advanceAmount;
  const firstDueDate = lease?.startDate
    ? addMonthsToDate(lease.startDate, Math.max(advanceMonths || 1, 1))
    : null;

  const tenantName = useMemo(() => {
    const first = tenant?.firstName || lease?.tenantFirstName || '';
    const last = tenant?.lastName || lease?.tenantLastName || '';
    return `${first} ${last}`.trim() || 'Tenant';
  }, [tenant, lease]);

  const emergency = splitName(tenant?.emergencyContactName);
  const photoUrl = tenant?.profilePictureUrl ? getImageUrl(tenant.profilePictureUrl) : null;
  const birthRaw = tenant?.dateOfBirth ? String(tenant.dateOfBirth).slice(0, 10) : '';
  const birthDate = birthRaw ? formatLeaseFormDate(birthRaw) : '';

  const documents = data?.documents || [];
  const leaseContract =
    lease?.agreementDocumentUrl
      ? {
          id: lease.agreementDocumentId || 'agreement',
          fileName: lease.agreementDocumentName || 'Lease contract',
          fileUrl: lease.agreementDocumentUrl,
          category: 'lease',
        }
      : documents.find((doc) => matchesDoc(doc, ['lease', 'agreement', 'contract'])) || null;
  const idDoc =
    documents.find((doc) => matchesDoc(doc, ['id', 'passport', 'license', 'umid'])) || null;
  const residencyDoc =
    documents.find((doc) =>
      matchesDoc(doc, ['residency', 'barangay', 'background', 'utility', 'proof'])
    ) || null;
  const featuredIds = new Set(
    [leaseContract?.id, idDoc?.id, residencyDoc?.id].filter(Boolean) as string[]
  );
  const otherDocs = documents.filter((doc) => !featuredIds.has(doc.id));
  const uploadedDocs = [
    leaseContract ? { label: 'Lease contract', doc: leaseContract } : null,
    idDoc ? { label: 'ID', doc: idDoc } : null,
    residencyDoc ? { label: 'Proof of residency', doc: residencyDoc } : null,
    ...otherDocs.map((doc) => ({ label: doc.category || 'Document', doc })),
  ].filter(Boolean) as Array<{ label: string; doc: DocumentRow }>;

  const sortedPayments = useMemo(() => {
    const rows = [...(data?.payments || [])];
    rows.sort((a, b) => {
      const aTime = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const bTime = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return sortDir === 'asc' ? aTime - bTime : bTime - aTime;
    });
    return rows;
  }, [data?.payments, sortDir]);

  const hasEmergency =
    isFilled(emergency.first) ||
    isFilled(emergency.last) ||
    isFilled(tenant?.emergencyContactPhone) ||
    isFilled(tenant?.emergencyContactRelationship);
  const hasAddress = isFilled(tenant?.previousAddress);
  const hasBirth = isFilled(birthDate);

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading lease...</div>;
  }

  if (error || !data || !lease) {
    return (
      <div className="p-6">
        <EmptyState
          title="Lease not found"
          description={error || 'This lease could not be loaded.'}
          action={
            <Link href="/admin/leasing">
              <Button variant="outline">Back to leases</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const returnHere = `/admin/leasing/${lease.id}`;
  const tenantEditHref = lease.tenantId
    ? withReturnTo(`/admin/tenants/${lease.tenantId}/edit?tab=lease`, returnHere)
    : null;
  const recordPaymentHref = lease.tenantId
    ? `/admin/financial/payments/new?tenantId=${encodeURIComponent(lease.tenantId)}`
    : null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Avatar name={tenantName} src={photoUrl} size="lg" className="h-12 w-12" />
          <div>
            <p className="text-sm text-gray-500">
              {lease.buildingName} · {formatUnitLabel(lease.roomNumber)}
            </p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900">{tenantName}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LeaseStatusBadge status={lease.uiStatus} />
          {tenantEditHref ? (
            <Link href={tenantEditHref}>
              <Button variant="outline" leftIcon={<Pencil className="h-4 w-4" />}>
                Edit
              </Button>
            </Link>
          ) : (
            <Button variant="outline" leftIcon={<Pencil className="h-4 w-4" />} isDisabled>
              Edit
            </Button>
          )}
          {lease.agreementDocumentUrl ? (
            <a href={lease.agreementDocumentUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" leftIcon={<Download className="h-4 w-4" />}>
                Download
              </Button>
            </a>
          ) : (
            <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} isDisabled>
              Download
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <StatBlock label="Rent" value={formatLeaseMoney(rent)} size="lg" />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <StatBlock label="Deposit" value={formatLeaseMoney(depositAmount)} size="lg" />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <StatBlock label="Advance" value={formatLeaseMoney(advanceAmount)} size="lg" />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <StatBlock
            label="First due date"
            value={formatLeaseFormDate(firstDueDate)}
            size="lg"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Lease">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Property" value={lease.buildingName} />
            <Field label="Unit" value={formatUnitLabel(lease.roomNumber)} />
            <Field label="Template" value={lease.leasePackageTemplateName} />
            <Field label="Term" value={formatTermLabel(termMonths)} />
            <Field label="Start" value={formatLeaseFormDate(lease.startDate)} />
            <Field label="End" value={formatLeaseFormDate(lease.endDate)} />
          </dl>
          <dl className="mt-3 border-t border-gray-100 pt-2">
            <PairRow label="Deposit period" value={formatDepositLabel(depositMonths)} />
            <PairRow label="Advance period" value={formatAdvanceLabel(advanceMonths)} />
            <PairRow
              label="Grace period"
              value={formatGraceLabel(lease.leasePackageGracePeriodDays)}
            />
            <PairRow label="Penalty" value={formatPenaltyTypeLabel(penaltyType)} />
            <PairRow
              label="Penalty fee"
              value={formatPenaltyFeeLabel(penaltyType, lease.leasePackagePenaltyFee)}
            />
            <PairRow label="Initial cashout" value={formatLeaseMoney(initialCashout)} />
          </dl>
        </Panel>

        <Panel title="Tenant">
          <div className="flex items-start gap-3">
            <Avatar name={tenantName} src={photoUrl} size="md" />
            <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-3">
              <Field
                label="Name"
                value={`${tenant?.firstName || lease.tenantFirstName || ''} ${
                  tenant?.lastName || lease.tenantLastName || ''
                }`.trim()}
              />
              <Field label="Phone" value={tenant?.phone || lease.tenantPhone} />
              <Field
                label="Email"
                value={tenant?.email || lease.tenantEmail}
              />
              {showEmptyTenant || hasBirth ? <Field label="Birth date" value={birthDate} /> : null}
              {showEmptyTenant || hasAddress ? (
                <Field label="Address" value={tenant?.previousAddress} />
              ) : null}
            </dl>
          </div>

          {(showEmptyTenant || hasEmergency) && (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-gray-100 pt-3">
              <Field
                label="Emergency contact"
                value={[emergency.first, emergency.middle, emergency.last]
                  .filter(Boolean)
                  .join(' ')}
              />
              <Field label="Relationship" value={tenant?.emergencyContactRelationship} />
              <Field label="Emergency phone" value={tenant?.emergencyContactPhone} />
            </dl>
          )}

          {!hasEmergency || !hasAddress || !hasBirth ? (
            <button
              type="button"
              onClick={() => setShowEmptyTenant((open) => !open)}
              className="mt-3 text-xs font-semibold text-indigo-600 hover:underline"
            >
              {showEmptyTenant ? 'Hide empty fields' : 'Show more'}
            </button>
          ) : null}

          {data.occupants.length > 0 ? (
            <ul className="mt-3 divide-y divide-gray-100 border-t border-gray-100 pt-2">
              {data.occupants.map((occ) => {
                const name = `${occ.firstName} ${occ.lastName}`.trim();
                return (
                  <li key={occ.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar name={name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{name}</p>
                        <p className="truncate text-xs text-gray-500">{occ.email || 'No email'}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium capitalize text-gray-700">
                      {occ.relationship || 'Occupant'}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </Panel>
      </div>

      <Panel
        title="Payments"
        action={
          recordPaymentHref ? (
            <Link
              href={recordPaymentHref}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Record payment
            </Link>
          ) : null
        }
      >
        {sortedPayments.length === 0 ? (
          <p className="text-sm text-gray-500">No invoices yet for this lease.</p>
        ) : (
          <div className="-mx-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2.5">
                    <button
                      type="button"
                      className="font-semibold uppercase tracking-wide hover:text-gray-800"
                      onClick={() => setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))}
                    >
                      Due date {sortDir === 'asc' ? '↑' : '↓'}
                    </button>
                  </th>
                  <th className="px-4 py-2.5">Invoice #</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50/80">
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-800">
                      {formatDueDate(payment.dueDate)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/admin/financial/invoices/${payment.id}`}
                        className="font-semibold text-indigo-600 hover:underline"
                      >
                        {payment.invoiceNumber || '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums text-gray-900">
                      {formatLeaseMoney(Number(payment.totalAmount || 0))}
                    </td>
                    <td className="px-4 py-2.5">
                      <InvoiceStatusBadge status={payment.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <ActionDropdown
                        label="Actions"
                        align="right"
                        items={[
                          {
                            id: 'view',
                            label: 'View invoice',
                            icon: <Eye className="h-3.5 w-3.5" />,
                            href: `/admin/financial/invoices/${payment.id}`,
                          },
                          {
                            id: 'pay',
                            label: 'Record payment',
                            icon: <Wallet className="h-3.5 w-3.5" />,
                            href: lease.tenantId
                              ? `/admin/financial/payments/new?tenantId=${encodeURIComponent(
                                  lease.tenantId
                                )}&invoiceId=${encodeURIComponent(payment.id)}`
                              : undefined,
                            disabled: !lease.tenantId,
                          },
                          {
                            id: 'open',
                            label: 'Open in new tab',
                            icon: <ExternalLink className="h-3.5 w-3.5" />,
                            href: `/admin/financial/invoices/${payment.id}`,
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Documents">
        {uploadedDocs.length === 0 ? (
          <p className="text-sm text-gray-500">No documents uploaded.</p>
        ) : (
          <ul className="space-y-2.5">
            {uploadedDocs.map(({ label, doc }) => (
              <li key={doc.id} className="flex flex-wrap items-center gap-3">
                <span className="w-36 shrink-0 text-xs font-medium uppercase tracking-wide text-gray-500">
                  {label}
                </span>
                <DocumentChip doc={doc} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Recent activity">
        {(data.activity || []).length === 0 ? (
          <div className="flex items-start gap-2.5 text-sm text-gray-500">
            <UserRound className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Lease marked {lease.uiStatus.replace('_', ' ')}
              {lease.startDate ? ` — ${formatLeaseFormDate(lease.startDate)}` : ''}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {(data.activity || []).map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <p className="min-w-0 text-sm text-gray-800">
                  {item.actorName ? (
                    <span className="font-semibold text-gray-900">{item.actorName} </span>
                  ) : null}
                  {item.description}
                  {item.reason ? (
                    <span className="text-gray-500"> Reason: “{item.reason}”</span>
                  ) : null}
                </p>
                {item.createdAt ? (
                  <p className="shrink-0 text-xs text-gray-500">
                    {formatDateTime(item.createdAt)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function DocumentChip({ doc }: { doc: DocumentRow }) {
  const href = doc.fileUrl || `/api/documents/${doc.id}/download`;
  if (href) {
    return <FileAttachmentChip fileName={doc.fileName} href={href} />;
  }
  return (
    <div className="inline-flex items-center gap-2 text-sm text-gray-800">
      <FileText className="h-4 w-4 text-gray-500" />
      <span>{doc.fileName}</span>
    </div>
  );
}
