'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Download,
  FileText,
  Pencil,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  InvoiceStatusBadge,
  LeaseStatusBadge,
} from '@/components/domain/StatusBadges';
import { withReturnTo } from '@/lib/navigation';
import {
  formatLeaseTerm,
  ordinalDay,
  type LeaseDetail,
} from '@/lib/leases-shared';
import { formatDate } from '@/lib/utils';

interface LeaseDetailPayload {
  lease: LeaseDetail;
  occupants: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    relationship: string;
  }>;
  payments: Array<{
    id: string;
    invoiceNumber: string;
    dueDate: string | null;
    totalAmount: number;
    amountPaid: number;
    status: string;
  }>;
  documents: Array<{
    id: string;
    fileName: string;
    fileUrl: string | null;
    category: string | null;
  }>;
  activity: Array<{
    id: string;
    description: string;
    createdAt: string;
    actorName: string | null;
  }>;
}

interface LeaseDetailClientProps {
  leaseId: string;
}

export default function LeaseDetailClient({ leaseId }: LeaseDetailClientProps) {
  const [data, setData] = useState<LeaseDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        if (!cancelled) setData(result.data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load lease');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [leaseId]);

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading lease...</div>;
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <EmptyState
          title="Lease not found"
          description={error || 'This lease could not be loaded.'}
          action={
            <Link href="/admin/lease-management">
              <Button variant="outline">Back to leases</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const { lease, occupants, payments, documents, activity } = data;
  const deposit = lease.securityDeposit ?? lease.depositPaid;
  const primaryName = `${lease.tenantFirstName} ${lease.tenantLastName}`.trim() || 'Tenant';

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {lease.buildingName} · Unit {lease.roomNumber}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Lease agreement</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LeaseStatusBadge status={lease.uiStatus} />
          <Link
            href={withReturnTo(
              `/admin/tenants/${lease.tenantId}/edit`,
              `/admin/lease-management/${lease.id}`
            )}
          >
            <Button variant="outline" leftIcon={<Pencil className="h-4 w-4" />}>
              Edit
            </Button>
          </Link>
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Monthly rent" value={`₱${Number(lease.monthlyRate || 0).toLocaleString()}`} />
        <Metric label="Lease term" value={formatLeaseTerm(lease.startDate, lease.endDate)} />
        <Metric label="Security deposit" value={`₱${Number(deposit || 0).toLocaleString()}`} />
        <Metric label="Rent due day" value={ordinalDay(lease.rentDueDay)} />
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Tenants</h2>
        <ul className="divide-y divide-gray-100">
          <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={primaryName} size="sm" />
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900">{primaryName}</p>
                <p className="truncate text-sm text-gray-500">{lease.tenantEmail || 'No email'}</p>
              </div>
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              Primary
            </span>
          </li>
          {occupants.map((occ) => {
            const name = `${occ.firstName} ${occ.lastName}`.trim();
            return (
              <li
                key={occ.id}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{name}</p>
                    <p className="truncate text-sm text-gray-500">{occ.email || 'No email'}</p>
                  </div>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-700">
                  {occ.relationship || 'Occupant'}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Payments</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-500">No invoices yet for this lease.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {payments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {payment.dueDate
                        ? new Date(payment.dueDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : payment.invoiceNumber}
                    </p>
                    <p className="text-xs text-gray-500">
                      ₱{Number(payment.totalAmount || 0).toLocaleString()}
                    </p>
                  </div>
                  <InvoiceStatusBadge status={payment.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Documents</h2>
          {documents.length === 0 && !lease.agreementDocumentUrl ? (
            <p className="text-sm text-gray-500">No documents attached.</p>
          ) : (
            <ul className="space-y-2">
              {lease.agreementDocumentUrl && (
                <li>
                  <a
                    href={lease.agreementDocumentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-800 hover:bg-gray-50"
                  >
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="truncate">
                      {lease.agreementDocumentName || 'Lease agreement'}
                    </span>
                  </a>
                </li>
              )}
              {documents.map((doc) => (
                <li key={doc.id}>
                  {doc.fileUrl ? (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-800 hover:bg-gray-50"
                    >
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="truncate">{doc.fileName}</span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-800">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="truncate">{doc.fileName}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Activity</h2>
        {activity.length === 0 ? (
          <div className="flex items-start gap-3 text-sm text-gray-500">
            <UserRound className="mt-0.5 h-4 w-4" />
            <p>
              Lease marked {lease.uiStatus.replace('_', ' ')}
              {lease.startDate ? ` — ${formatDate(lease.startDate)}` : ''}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {activity.map((item) => (
              <li key={item.id} className="text-sm text-gray-700">
                <span>{item.description}</span>
                {item.createdAt && (
                  <span className="text-gray-500"> — {formatDate(item.createdAt)}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}
