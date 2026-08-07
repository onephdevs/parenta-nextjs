'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Mail,
  MapPin,
  Pencil,
  Phone,
  User,
  Wallet,
  X,
} from 'lucide-react';
import AppLoader from '@/components/ui/AppLoader';
import { Button } from '@/components/ui/Button';
import { getImageUrl } from '@/lib/format/image-url';
import { formatCurrency } from '@/lib/utils/formatCurrency';

interface TenantProfileAssignment {
  roomNumber?: string;
  buildingName?: string;
  monthlyRate?: number;
  startDate?: string | Date;
  endDate?: string | Date | null;
  depositPaid?: number | null;
  advancePaid?: number | null;
  utilityDepositPaid?: number | null;
}

interface TenantProfileData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  dateOfBirth?: string | Date | null;
  tenantStatus?: string;
  previousAddress?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelationship?: string | null;
  employmentStatus?: string | null;
  employerName?: string | null;
  monthlyIncome?: number | null;
  notes?: string | null;
  profilePictureUrl?: string | null;
  leaseStartDate?: string | Date | null;
  leaseEndDate?: string | Date | null;
  currentAssignment?: TenantProfileAssignment | null;
}

interface TenantProfileModalProps {
  isOpen: boolean;
  tenantId: string | null;
  onClose: () => void;
}

function formatDate(value?: string | Date | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value || '—'}</p>
    </div>
  );
}

export default function TenantProfileModal({
  isOpen,
  tenantId,
  onClose,
}: TenantProfileModalProps) {
  const [tenant, setTenant] = useState<TenantProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slidIn, setSlidIn] = useState(false);

  const loadTenant = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tenants/${id}`, { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load tenant');
      }
      setTenant(json.data as TenantProfileData);
    } catch (err) {
      setTenant(null);
      setError(err instanceof Error ? err.message : 'Failed to load tenant');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !tenantId) return;
    void loadTenant(tenantId);
  }, [isOpen, tenantId, loadTenant]);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setTenant(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSlidIn(false);
      return;
    }
    const frame = requestAnimationFrame(() => setSlidIn(true));
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  if (!isOpen || !tenantId) return null;

  const fullName = tenant
    ? `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim()
    : 'Tenant profile';
  const assignment = tenant?.currentAssignment;

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden">
      <div
        className={`absolute inset-0 bg-gray-900/50 transition-opacity duration-300 lg:left-64 ${
          slidIn ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex justify-end lg:left-64">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={fullName}
          className={`pointer-events-auto flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
            slidIn ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex-shrink-0 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to room
                </button>
                <h2 className="truncate text-lg font-bold text-gray-900">{fullName}</h2>
                {tenant?.email && (
                  <p className="truncate text-sm text-gray-500">{tenant.email}</p>
                )}
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                {tenant && (
                  <>
                    <Link href={`/admin/financial/payments/new?tenantId=${tenant.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Wallet className="h-4 w-4" />}
                      >
                        Payment
                      </Button>
                    </Link>
                    <Link href={`/admin/tenants/${tenant.id}/edit`}>
                      <Button size="sm" leftIcon={<Pencil className="h-4 w-4" />}>
                        Edit
                      </Button>
                    </Link>
                  </>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-800"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-[#E2E5F7]">
            <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
              {loading && (
                <AppLoader
                  variant="inline"
                  label="Loading tenant…"
                  size={96}
                  className="min-h-[16rem] bg-transparent"
                />
              )}

              {!loading && error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
                  {error}
                </div>
              )}

              {!loading && !error && tenant && (
                <>
                  <section className="overflow-hidden rounded-2xl bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.08)]">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                      <div className="flex h-28 w-28 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                        {tenant.profilePictureUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getImageUrl(tenant.profilePictureUrl)}
                            alt={fullName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <User className="h-10 w-10 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-bold text-gray-900">{fullName}</h3>
                          {tenant.tenantStatus && (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold capitalize text-emerald-700">
                              {tenant.tenantStatus}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                          {tenant.email && (
                            <span className="inline-flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5" />
                              {tenant.email}
                            </span>
                          )}
                          {tenant.phone && (
                            <span className="inline-flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5" />
                              {tenant.phone}
                            </span>
                          )}
                        </div>
                        {tenant.previousAddress && (
                          <p className="flex items-start gap-1.5 text-sm text-gray-600">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                            {tenant.previousAddress}
                          </p>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-2xl bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.08)]">
                    <h3 className="mb-4 text-sm font-bold text-gray-900">
                      Personal information
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <InfoRow label="Full name" value={fullName} />
                      <InfoRow label="Email" value={tenant.email || '—'} />
                      <InfoRow label="Phone" value={tenant.phone || '—'} />
                      <InfoRow
                        label="Date of birth"
                        value={formatDate(tenant.dateOfBirth)}
                      />
                      <InfoRow
                        label="Lease start"
                        value={formatDate(tenant.leaseStartDate)}
                      />
                      <InfoRow
                        label="Lease end"
                        value={formatDate(tenant.leaseEndDate)}
                      />
                    </div>
                  </section>

                  {assignment && (
                    <section className="overflow-hidden rounded-2xl bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.08)]">
                      <h3 className="mb-4 text-sm font-bold text-gray-900">
                        Current room
                      </h3>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-base font-semibold text-gray-900">
                              Room {assignment.roomNumber}
                            </p>
                            <p className="text-sm text-gray-600">
                              {assignment.buildingName}
                            </p>
                          </div>
                          <div className="sm:text-right">
                            <p className="text-base font-semibold text-gray-900">
                              {formatCurrency(assignment.monthlyRate || 0)}/mo
                            </p>
                            <p className="text-sm text-gray-600">
                              Since {formatDate(assignment.startDate)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  <section className="overflow-hidden rounded-2xl bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.08)]">
                    <h3 className="mb-4 text-sm font-bold text-gray-900">
                      Emergency contact
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <InfoRow
                        label="Contact person"
                        value={tenant.emergencyContactName || '—'}
                      />
                      <InfoRow
                        label="Phone"
                        value={tenant.emergencyContactPhone || '—'}
                      />
                      <InfoRow
                        label="Relationship"
                        value={tenant.emergencyContactRelationship || '—'}
                      />
                    </div>
                  </section>

                  {(tenant.employmentStatus ||
                    tenant.employerName ||
                    tenant.monthlyIncome != null) && (
                    <section className="overflow-hidden rounded-2xl bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.08)]">
                      <h3 className="mb-4 text-sm font-bold text-gray-900">
                        Employment
                      </h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InfoRow
                          label="Status"
                          value={tenant.employmentStatus || '—'}
                        />
                        <InfoRow
                          label="Employer"
                          value={tenant.employerName || '—'}
                        />
                        <InfoRow
                          label="Monthly income"
                          value={
                            tenant.monthlyIncome != null
                              ? formatCurrency(tenant.monthlyIncome)
                              : '—'
                          }
                        />
                      </div>
                    </section>
                  )}

                  {tenant.notes && (
                    <section className="overflow-hidden rounded-2xl bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.08)]">
                      <h3 className="mb-3 text-sm font-bold text-gray-900">Notes</h3>
                      <p className="whitespace-pre-wrap text-sm text-gray-700">
                        {tenant.notes}
                      </p>
                    </section>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
