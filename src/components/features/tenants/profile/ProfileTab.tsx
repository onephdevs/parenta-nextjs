'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical, Plus, X } from 'lucide-react';
import { EditableSectionCard } from '@/components/ui/EditableSectionCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Pagination from '@/components/ui/Pagination';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import type { TenantProfileData } from './types';
import { formatProfileDate, fullName } from './utils';

interface OccupantRow {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  relationshipToTenant?: string | null;
  previousAddress?: string | null;
}

const PAGE_SIZE = 5;

const fieldClass =
  'h-10 rounded-lg border-gray-300 text-sm text-gray-900 shadow-none focus:border-gray-900 focus:ring-gray-900/20';

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-gray-900">{value || '—'}</dd>
    </div>
  );
}

function EditField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-sm text-gray-500">{label}</span>
      {children}
    </label>
  );
}

interface TenantInfoDraft {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  previousAddress: string;
}

interface EmergencyDraft {
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
}

function toDateInput(value?: string | null): string {
  if (!value) return '';
  return String(value).slice(0, 10);
}

export function ProfileTab({
  tenant,
  onTenantUpdated,
}: {
  tenant: TenantProfileData;
  onTenantUpdated?: (patch: Partial<TenantProfileData>) => void;
}) {
  const router = useRouter();
  const { showNotification, updateNotification } = useNotifications();
  const [occupants, setOccupants] = useState<OccupantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [data, setData] = useState(tenant);
  const [editingTenant, setEditingTenant] = useState(false);
  const [editingEmergency, setEditingEmergency] = useState(false);
  const [savingTenant, setSavingTenant] = useState(false);
  const [savingEmergency, setSavingEmergency] = useState(false);

  const [tenantDraft, setTenantDraft] = useState<TenantInfoDraft>(() => ({
    firstName: tenant.firstName || '',
    lastName: tenant.lastName || '',
    dateOfBirth: toDateInput(tenant.dateOfBirth),
    phone: tenant.phone || '',
    email: tenant.email || '',
    previousAddress: tenant.previousAddress || '',
  }));

  const [emergencyDraft, setEmergencyDraft] = useState<EmergencyDraft>(() => ({
    emergencyContactName: tenant.emergencyContactName || '',
    emergencyContactPhone: tenant.emergencyContactPhone || '',
    emergencyContactRelationship: tenant.emergencyContactRelationship || '',
  }));

  useEffect(() => {
    setData(tenant);
    if (!editingTenant) {
      setTenantDraft({
        firstName: tenant.firstName || '',
        lastName: tenant.lastName || '',
        dateOfBirth: toDateInput(tenant.dateOfBirth),
        phone: tenant.phone || '',
        email: tenant.email || '',
        previousAddress: tenant.previousAddress || '',
      });
    }
    if (!editingEmergency) {
      setEmergencyDraft({
        emergencyContactName: tenant.emergencyContactName || '',
        emergencyContactPhone: tenant.emergencyContactPhone || '',
        emergencyContactRelationship: tenant.emergencyContactRelationship || '',
      });
    }
  }, [tenant, editingTenant, editingEmergency]);

  const loadOccupants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/occupants?tenantId=${encodeURIComponent(tenant.id)}&activeOnly=true`,
        { credentials: 'include' }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        const rows = (json.data || []).map((o: Record<string, unknown>) => ({
          id: String(o.id),
          firstName: String(o.first_name || o.firstName || ''),
          lastName: String(o.last_name || o.lastName || ''),
          email: (o.email as string) || null,
          phone: (o.phone as string) || null,
          relationshipToTenant:
            (o.relationship_to_tenant as string) ||
            (o.relationshipToTenant as string) ||
            null,
          address: null,
        }));
        setOccupants(rows);
      }
    } finally {
      setLoading(false);
    }
  }, [tenant.id]);

  useEffect(() => {
    void loadOccupants();
  }, [loadOccupants]);

  const totalPages = Math.max(1, Math.ceil(occupants.length / PAGE_SIZE));
  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return occupants.slice(start, start + PAGE_SIZE);
  }, [occupants, page]);

  const startTenantEdit = () => {
    setTenantDraft({
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      dateOfBirth: toDateInput(data.dateOfBirth),
      phone: data.phone || '',
      email: data.email || '',
      previousAddress: data.previousAddress || '',
    });
    setEditingTenant(true);
  };

  const cancelTenantEdit = () => {
    setEditingTenant(false);
    setTenantDraft({
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      dateOfBirth: toDateInput(data.dateOfBirth),
      phone: data.phone || '',
      email: data.email || '',
      previousAddress: data.previousAddress || '',
    });
  };

  const startEmergencyEdit = () => {
    setEmergencyDraft({
      emergencyContactName: data.emergencyContactName || '',
      emergencyContactPhone: data.emergencyContactPhone || '',
      emergencyContactRelationship: data.emergencyContactRelationship || '',
    });
    setEditingEmergency(true);
  };

  const cancelEmergencyEdit = () => {
    setEditingEmergency(false);
    setEmergencyDraft({
      emergencyContactName: data.emergencyContactName || '',
      emergencyContactPhone: data.emergencyContactPhone || '',
      emergencyContactRelationship: data.emergencyContactRelationship || '',
    });
  };

  const saveTenantInfo = async () => {
    if (!tenantDraft.firstName.trim() || !tenantDraft.lastName.trim()) {
      showNotification({
        type: 'error',
        title: 'Name required',
        message: 'First and last name are required.',
      });
      return;
    }
    if (!tenantDraft.email.trim() || !/\S+@\S+\.\S+/.test(tenantDraft.email)) {
      showNotification({
        type: 'error',
        title: 'Invalid email',
        message: 'Please enter a valid email address.',
      });
      return;
    }

    setSavingTenant(true);
    const loadingId = showNotification({
      type: 'loading',
      title: 'Saving…',
      message: 'Updating tenant information',
    });

    try {
      const payload = {
        firstName: tenantDraft.firstName.trim(),
        lastName: tenantDraft.lastName.trim(),
        email: tenantDraft.email.trim(),
        phone: tenantDraft.phone.trim() || null,
        dateOfBirth: tenantDraft.dateOfBirth || null,
        previousAddress: tenantDraft.previousAddress.trim() || null,
      };
      const res = await fetch(`/api/tenants/${tenant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error || 'Failed to update tenant');
      }

      const patch: Partial<TenantProfileData> = {
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phone: payload.phone,
        dateOfBirth: payload.dateOfBirth,
        previousAddress: payload.previousAddress,
      };
      setData((prev) => ({ ...prev, ...patch }));
      onTenantUpdated?.(patch);
      setEditingTenant(false);
      updateNotification(loadingId, {
        type: 'success',
        title: 'Saved',
        message: 'Tenant information updated.',
      });
      router.refresh();
    } catch (e) {
      updateNotification(loadingId, {
        type: 'error',
        title: 'Save failed',
        message: e instanceof Error ? e.message : 'Could not update tenant',
      });
    } finally {
      setSavingTenant(false);
    }
  };

  const saveEmergency = async () => {
    setSavingEmergency(true);
    const loadingId = showNotification({
      type: 'loading',
      title: 'Saving…',
      message: 'Updating emergency contact',
    });

    try {
      const payload = {
        emergencyContactName: emergencyDraft.emergencyContactName.trim() || null,
        emergencyContactPhone: emergencyDraft.emergencyContactPhone.trim() || null,
        emergencyContactRelationship:
          emergencyDraft.emergencyContactRelationship.trim() || null,
      };
      const res = await fetch(`/api/tenants/${tenant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error || 'Failed to update emergency contact');
      }

      const patch: Partial<TenantProfileData> = { ...payload };
      setData((prev) => ({ ...prev, ...patch }));
      onTenantUpdated?.(patch);
      setEditingEmergency(false);
      updateNotification(loadingId, {
        type: 'success',
        title: 'Saved',
        message: 'Emergency contact updated.',
      });
      router.refresh();
    } catch (e) {
      updateNotification(loadingId, {
        type: 'error',
        title: 'Save failed',
        message: e instanceof Error ? e.message : 'Could not update contact',
      });
    } finally {
      setSavingEmergency(false);
    }
  };

  return (
    <div className="space-y-6">
      <EditableSectionCard
        title="Tenant Information"
        onEdit={editingTenant ? undefined : startTenantEdit}
        action={
          editingTenant ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={cancelTenantEdit}
                isDisabled={savingTenant}
                className="h-8 px-2.5"
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void saveTenantInfo()}
                isLoading={savingTenant}
                className="h-8 bg-gray-900 px-3 hover:bg-black"
              >
                Save
              </Button>
            </div>
          ) : undefined
        }
      >
        {editingTenant ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <EditField label="First Name">
              <Input
                className={fieldClass}
                value={tenantDraft.firstName}
                onChange={(e) =>
                  setTenantDraft((p) => ({ ...p, firstName: e.target.value }))
                }
                autoFocus
              />
            </EditField>
            <EditField label="Last Name">
              <Input
                className={fieldClass}
                value={tenantDraft.lastName}
                onChange={(e) =>
                  setTenantDraft((p) => ({ ...p, lastName: e.target.value }))
                }
              />
            </EditField>
            <EditField label="Birth Date">
              <Input
                type="date"
                className={fieldClass}
                value={tenantDraft.dateOfBirth}
                onChange={(e) =>
                  setTenantDraft((p) => ({ ...p, dateOfBirth: e.target.value }))
                }
              />
            </EditField>
            <EditField label="Contact No.">
              <Input
                className={fieldClass}
                value={tenantDraft.phone}
                onChange={(e) =>
                  setTenantDraft((p) => ({ ...p, phone: e.target.value }))
                }
              />
            </EditField>
            <EditField label="Email">
              <Input
                type="email"
                className={fieldClass}
                value={tenantDraft.email}
                onChange={(e) =>
                  setTenantDraft((p) => ({ ...p, email: e.target.value }))
                }
              />
            </EditField>
            <EditField label="Address" className="sm:col-span-2">
              <Input
                className={fieldClass}
                value={tenantDraft.previousAddress}
                onChange={(e) =>
                  setTenantDraft((p) => ({ ...p, previousAddress: e.target.value }))
                }
              />
            </EditField>
          </div>
        ) : (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full Name" value={fullName(data.firstName, data.lastName)} />
            <Field label="Birth Date" value={formatProfileDate(data.dateOfBirth)} />
            <Field label="Contact No." value={data.phone} />
            <Field
              label="Email"
              value={
                data.email ? (
                  <a href={`mailto:${data.email}`} className="text-indigo-600 hover:underline">
                    {data.email}
                  </a>
                ) : (
                  '—'
                )
              }
            />
            <div className="sm:col-span-2">
              <Field label="Address" value={data.previousAddress} />
            </div>
          </dl>
        )}
      </EditableSectionCard>

      <EditableSectionCard
        title="Emergency Contact Person"
        onEdit={editingEmergency ? undefined : startEmergencyEdit}
        action={
          editingEmergency ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={cancelEmergencyEdit}
                isDisabled={savingEmergency}
                className="h-8 px-2.5"
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void saveEmergency()}
                isLoading={savingEmergency}
                className="h-8 bg-gray-900 px-3 hover:bg-black"
              >
                Save
              </Button>
            </div>
          ) : undefined
        }
      >
        {editingEmergency ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <EditField label="Full Name">
              <Input
                className={fieldClass}
                value={emergencyDraft.emergencyContactName}
                onChange={(e) =>
                  setEmergencyDraft((p) => ({
                    ...p,
                    emergencyContactName: e.target.value,
                  }))
                }
                autoFocus
              />
            </EditField>
            <EditField label="Contact No.">
              <Input
                className={fieldClass}
                value={emergencyDraft.emergencyContactPhone}
                onChange={(e) =>
                  setEmergencyDraft((p) => ({
                    ...p,
                    emergencyContactPhone: e.target.value,
                  }))
                }
              />
            </EditField>
            <EditField label="Relationship to Tenant">
              <Input
                className={fieldClass}
                value={emergencyDraft.emergencyContactRelationship}
                onChange={(e) =>
                  setEmergencyDraft((p) => ({
                    ...p,
                    emergencyContactRelationship: e.target.value,
                  }))
                }
              />
            </EditField>
          </div>
        ) : (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full Name" value={data.emergencyContactName} />
            <Field label="Contact No." value={data.emergencyContactPhone} />
            <Field
              label="Relationship to Tenant"
              value={data.emergencyContactRelationship}
            />
            <Field label="Address" value={null} />
          </dl>
        )}
      </EditableSectionCard>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5">
          <h3 className="text-sm font-bold text-gray-900">Occupants</h3>
          <a
            href={
              data.currentAssignment
                ? `/admin/rooms/${data.currentAssignment.roomId}`
                : `/admin/tenants/${tenant.id}/edit?tab=tenant`
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Occupant
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3">Full Name</th>
                <th className="px-5 py-3">Contact Details</th>
                <th className="px-5 py-3">Address</th>
                <th className="px-5 py-3">Relationship to Tenant</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-500">
                    Loading occupants…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-500">
                    No occupants on file. The primary tenant is listed on the lease.
                  </td>
                </tr>
              ) : (
                pageRows.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50/80">
                    <td className="px-5 py-3.5 font-semibold text-gray-900">
                      {fullName(o.firstName, o.lastName)}
                    </td>
                    <td className="px-5 py-3.5 text-gray-700">
                      <div className="space-y-0.5">
                        <p>{o.email || '—'}</p>
                        <p className="text-xs text-gray-500">{o.phone || '—'}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{o.address || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-700">
                      {o.relationshipToTenant || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        aria-label="Occupant actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={occupants.length}
          itemsPerPage={PAGE_SIZE}
          onPageChange={setPage}
        />
      </section>
    </div>
  );
}
