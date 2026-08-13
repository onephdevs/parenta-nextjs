'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import type { TenantWithAssignments } from '@/lib/api/tenants';
import { useNotifications } from '@/hooks/useNotifications';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Tab, TabList, TabPanel, Tabs } from '@/components/ui/Tabs';
import {
  LeaseFinanceRow,
  LeaseFormField,
  LeaseFormSection,
  LeaseTemplatePair,
  leaseFieldClass,
} from '@/components/features/tenants/profile/LeaseFormLayout';
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
  type LeasePackageTemplate,
} from '@/lib/lease-package-templates-shared';
import { cn } from '@/lib/utils';

interface EditTenantFormProps {
  tenant: TenantWithAssignments & {
    agreementDocumentId?: string | null;
    agreementDocumentName?: string | null;
    agreementDocumentUrl?: string | null;
  };
  returnTo?: string | null;
  /** `tenant` | `lease` | `documents` */
  initialTab?: string;
}

const TABS = [
  { id: 'tenant', label: 'Tenant Information' },
  { id: 'lease', label: 'Lease Information' },
  { id: 'documents', label: 'Upload Documents' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function resolveTab(value?: string | null): TabId {
  const id = String(value || '').toLowerCase();
  if (id === 'lease' || id === '1') return 'lease';
  if (id === 'documents' || id === '2') return 'documents';
  return 'tenant';
}

const PH_PROVINCES = [
  'Metro Manila',
  'Cavite',
  'Laguna',
  'Batangas',
  'Rizal',
  'Bulacan',
  'Pampanga',
  'Other',
];

const ID_TYPES = [
  { value: 'national_id', label: 'National ID' },
  { value: 'passport', label: 'Passport' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'umid', label: 'UMID' },
  { value: 'other', label: 'Other' },
];

const RESIDENCY_TYPES = [
  { value: 'barangay_clearance', label: 'Barangay Clearance' },
  { value: 'utility_bill', label: 'Utility Bill' },
  { value: 'lease_contract', label: 'Previous Lease Contract' },
  { value: 'other', label: 'Other' },
];

interface AddressFields {
  province: string;
  city: string;
  barangay: string;
  street: string;
}

interface TenantStepState {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: AddressFields;
  emergencyFirstName: string;
  emergencyMiddleName: string;
  emergencyLastName: string;
  emergencyPhone: string;
  emergencyRelationship: string;
  emergencyAddress: AddressFields;
}

interface LeaseStepState {
  buildingId: string;
  roomId: string;
  templateId: string;
  monthlyRate: string;
  startDate: string;
  endDate: string;
}

interface DocMeta {
  id: string;
  name: string;
  url?: string | null;
}

interface DocumentsStepState {
  lease: DocMeta | null;
  idProof: DocMeta | null;
  idType: string;
  residency: DocMeta | null;
  residencyType: string;
}

function toIsoDateInput(value?: Date | string | null): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
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

function joinName(first: string, middle: string, last: string): string {
  return [first, middle, last].map((s) => s.trim()).filter(Boolean).join(' ');
}

function parseAddress(raw?: string | null): AddressFields {
  const text = String(raw || '').trim();
  if (!text) {
    return { province: 'Metro Manila', city: '', barangay: '', street: '' };
  }
  const parts = text.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 4) {
    return {
      street: parts[0],
      barangay: parts[1],
      city: parts[2],
      province: parts[3] || 'Metro Manila',
    };
  }
  if (parts.length === 3) {
    return {
      street: parts[0],
      barangay: '',
      city: parts[1],
      province: parts[2] || 'Metro Manila',
    };
  }
  if (parts.length === 2) {
    return {
      street: parts[0],
      barangay: '',
      city: parts[1],
      province: 'Metro Manila',
    };
  }
  return { province: 'Metro Manila', city: '', barangay: '', street: text };
}

function formatAddress(a: AddressFields): string {
  return [a.street, a.barangay, a.city, a.province]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(', ');
}

function formatUnitLabel(roomNumber: string): string {
  const raw = roomNumber.trim();
  if (!raw) return 'Select unit';
  if (/^(room|unit)\b/i.test(raw)) return raw;
  return `Room ${raw}`;
}

function WizardSection({
  title,
  description,
  children,
  last,
}: {
  title: string;
  description: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <LeaseFormSection title={title} description={description} last={last}>
      {children}
    </LeaseFormSection>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-sm font-medium text-gray-700">{children}</span>;
}

export function EditTenantForm({ tenant, returnTo, initialTab }: EditTenantFormProps) {
  const router = useRouter();
  const { showNotification, updateNotification } = useNotifications();
  const [tab, setTab] = useState<TabId>(() => resolveTab(initialTab));
  const [saving, setSaving] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(tenant.profilePictureUrl || null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const emergency = splitName(tenant.emergencyContactName);

  const [tenantForm, setTenantForm] = useState<TenantStepState>({
    firstName: tenant.firstName || '',
    middleName: '',
    lastName: tenant.lastName || '',
    suffix: '',
    dateOfBirth: toIsoDateInput(tenant.dateOfBirth),
    phone: tenant.phone || '',
    email: tenant.email || '',
    address: parseAddress(tenant.previousAddress),
    emergencyFirstName: emergency.first,
    emergencyMiddleName: emergency.middle,
    emergencyLastName: emergency.last,
    emergencyPhone: tenant.emergencyContactPhone || '',
    emergencyRelationship: tenant.emergencyContactRelationship || '',
    emergencyAddress: { province: 'Metro Manila', city: '', barangay: '', street: '' },
  });

  const assignment = tenant.currentAssignment;
  const [leaseForm, setLeaseForm] = useState<LeaseStepState>({
    buildingId: '',
    roomId: assignment?.roomId || '',
    templateId: assignment?.leasePackageTemplateId || '',
    monthlyRate:
      assignment?.monthlyRate != null ? String(assignment.monthlyRate) : '',
    startDate: toIsoDateInput(assignment?.startDate || tenant.leaseStartDate),
    endDate: toIsoDateInput(assignment?.endDate || tenant.leaseEndDate),
  });

  const [buildings, setBuildings] = useState<{ id: string; name: string }[]>([]);
  const [rooms, setRooms] = useState<
    { id: string; roomNumber: string; monthlyRate?: number; roomStatus?: string }[]
  >([]);
  const [packages, setPackages] = useState<LeasePackageTemplate[]>([]);
  const [leaseMetaLoading, setLeaseMetaLoading] = useState(false);

  const [docs, setDocs] = useState<DocumentsStepState>({
    lease: tenant.agreementDocumentId
      ? {
          id: tenant.agreementDocumentId,
          name: tenant.agreementDocumentName || 'Lease contract',
          url: tenant.agreementDocumentUrl,
        }
      : null,
    idProof: null,
    idType: '',
    residency: null,
    residencyType: '',
  });

  const goBack = useCallback(() => {
    if (returnTo) {
      router.push(returnTo);
      return;
    }
    router.push(`/admin/tenants/${tenant.id}`);
  }, [returnTo, router, tenant.id]);

  const fullName = useMemo(
    () => joinName(tenantForm.firstName, tenantForm.middleName, tenantForm.lastName),
    [tenantForm.firstName, tenantForm.middleName, tenantForm.lastName]
  );

  const template =
    packages.find((t) => t.id === leaseForm.templateId) ||
    packages.find((t) => t.id === assignment?.leasePackageTemplateId) ||
    null;

  const rent = Number(leaseForm.monthlyRate) || 0;
  const depositMonths = template?.depositMonths ?? assignment?.leasePackageDepositMonths ?? 0;
  const advanceMonths = template?.advanceMonths ?? assignment?.leasePackageAdvanceMonths ?? 1;
  const termMonths = template?.termMonths ?? assignment?.leasePackageTermMonths ?? null;
  const depositAmount = (depositMonths || 0) * rent;
  const advanceAmount = (advanceMonths || 0) * rent;
  const initialCashout = depositAmount + advanceAmount;
  const firstDueDate = leaseForm.startDate
    ? addMonthsToDate(leaseForm.startDate, Math.max(advanceMonths || 1, 1))
    : null;

  useEffect(() => {
    if (!template?.termMonths || !leaseForm.startDate) return;
    const computed = addMonthsToDate(leaseForm.startDate, template.termMonths);
    setLeaseForm((prev) => (prev.endDate === computed ? prev : { ...prev, endDate: computed }));
  }, [template?.termMonths, leaseForm.startDate, leaseForm.templateId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLeaseMetaLoading(true);
      try {
        const [bRes, pRes, dRes] = await Promise.all([
          fetch('/api/buildings?limit=100', { credentials: 'include' }),
          fetch('/api/lease-package-templates', { credentials: 'include' }),
          fetch(`/api/documents?tenantId=${encodeURIComponent(tenant.id)}&limit=50`, {
            credentials: 'include',
          }),
        ]);
        const bJson = await bRes.json();
        const list = Array.isArray(bJson.buildings)
          ? bJson.buildings
          : Array.isArray(bJson.data)
            ? bJson.data
            : Array.isArray(bJson.data?.buildings)
              ? bJson.data.buildings
              : [];
        if (!cancelled) {
          setBuildings(
            list.map((b: Record<string, unknown>) => ({
              id: String(b.id),
              name: String(b.name || 'Building'),
            }))
          );
        }

        if (pRes.ok) {
          const pJson = await pRes.json();
          const pkgs = Array.isArray(pJson.data)
            ? pJson.data
            : Array.isArray(pJson.templates)
              ? pJson.templates
              : [];
          if (!cancelled) setPackages(pkgs);
        }

        if (dRes.ok) {
          const dJson = await dRes.json();
          const rows: Record<string, unknown>[] = Array.isArray(dJson.data) ? dJson.data : [];
          const pick = (types: string[]) => {
            const set = new Set(types.map((t) => t.toLowerCase()));
            const row =
              rows.find((r) => set.has(String(r.documentType || r.document_type || '').toLowerCase())) ||
              null;
            if (!row) return null;
            return {
              id: String(row.id),
              name: String(row.documentName || row.document_name || row.fileName || 'Document'),
              url: (row.filePath || row.file_path || null) as string | null,
            };
          };
          if (!cancelled) {
            setDocs((prev) => ({
              ...prev,
              lease: prev.lease || pick(['lease', 'tenant_agreement']),
              idProof: prev.idProof || pick(['id_proof', 'id', 'passport']),
              residency: prev.residency || pick(['background_check', 'residency', 'barangay']),
            }));
          }
        }

        if (assignment?.roomId) {
          const roomRes = await fetch(`/api/rooms/${assignment.roomId}`, {
            credentials: 'include',
          });
          if (roomRes.ok) {
            const roomJson = await roomRes.json();
            const room = roomJson.data || roomJson;
            const buildingId = String(room.buildingId || room.building_id || '');
            if (!cancelled && buildingId) {
              setLeaseForm((prev) => ({ ...prev, buildingId }));
            }
          }
        } else if (assignment?.buildingName && !cancelled) {
          const match = list.find(
            (b: Record<string, unknown>) =>
              String(b.name || '').toLowerCase() === assignment.buildingName.toLowerCase()
          );
          if (match) {
            setLeaseForm((prev) => ({ ...prev, buildingId: String(match.id) }));
          }
        }
      } finally {
        if (!cancelled) setLeaseMetaLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenant.id, assignment?.roomId, assignment?.buildingName]);

  useEffect(() => {
    if (!leaseForm.buildingId) {
      setRooms([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetch(
        `/api/rooms?buildingId=${encodeURIComponent(leaseForm.buildingId)}&limit=200`,
        { credentials: 'include' }
      );
      if (!res.ok || cancelled) return;
      const json = await res.json();
      const list = Array.isArray(json.rooms)
        ? json.rooms
        : Array.isArray(json.data)
          ? json.data
          : Array.isArray(json.data?.rooms)
            ? json.data.rooms
            : [];
      if (!cancelled) {
        setRooms(
          list.map((r: Record<string, unknown>) => ({
            id: String(r.id),
            roomNumber: String(r.roomNumber || r.room_number || ''),
            monthlyRate:
              r.monthlyRate != null
                ? Number(r.monthlyRate)
                : r.monthly_rate != null
                  ? Number(r.monthly_rate)
                  : undefined,
            roomStatus: String(r.roomStatus || r.room_status || ''),
          }))
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leaseForm.buildingId]);

  const validateTenantStep = (): string | null => {
    if (!tenantForm.firstName.trim()) return 'First name is required';
    if (!tenantForm.lastName.trim()) return 'Last name is required';
    if (!tenantForm.email.trim()) return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(tenantForm.email)) return 'Email is invalid';
    return null;
  };

  const validateLeaseStep = (): string | null => {
    // No active lease — allow continuing without lease fields
    if (!assignment?.id) return null;
    if (!leaseForm.buildingId) return 'Property is required';
    if (!leaseForm.roomId) return 'Unit is required';
    if (!leaseForm.templateId && packages.length > 0) return 'Lease template is required';
    if (!leaseForm.startDate) return 'Start date is required';
    if (!(Number(leaseForm.monthlyRate) > 0)) return 'Rent amount is required';
    return null;
  };

  const handlePhotoChange = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showNotification({
        type: 'error',
        title: 'Invalid file',
        message: 'Please select an image file',
      });
      return;
    }
    const loadingId = showNotification({
      type: 'loading',
      title: 'Uploading photo…',
      message: 'Saving profile picture',
    });
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch(`/api/tenants/${tenant.id}/profile-picture`, {
        method: 'POST',
        body,
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      const url = json.data?.url || json.url || json.data?.profilePictureUrl;
      if (url) setPhotoUrl(url);
      updateNotification(loadingId, {
        type: 'success',
        title: 'Photo updated',
        message: 'Profile picture saved',
      });
    } catch (e) {
      updateNotification(loadingId, {
        type: 'error',
        title: 'Upload failed',
        message: e instanceof Error ? e.message : 'Could not upload photo',
      });
    }
  };

  const uploadDocument = async (
    file: File,
    documentType: string,
    onDone: (meta: DocMeta) => void
  ) => {
    const loadingId = showNotification({
      type: 'loading',
      title: 'Uploading…',
      message: file.name,
    });
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('tenantId', tenant.id);
      body.append('documentType', documentType);
      body.append('documentName', file.name);
      const res = await fetch('/api/documents', {
        method: 'POST',
        body,
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error || 'Upload failed');
      }
      const doc = json.data || json;
      onDone({
        id: String(doc.id),
        name: String(doc.documentName || doc.document_name || file.name),
        url: doc.filePath || doc.file_path || null,
      });
      updateNotification(loadingId, {
        type: 'success',
        title: 'Uploaded',
        message: file.name,
      });
    } catch (e) {
      updateNotification(loadingId, {
        type: 'error',
        title: 'Upload failed',
        message: e instanceof Error ? e.message : 'Could not upload document',
      });
    }
  };

  const handleSave = async () => {
    const tenantErr = validateTenantStep();
    if (tenantErr) {
      setTab('tenant');
      showNotification({ type: 'error', title: 'Check tenant details', message: tenantErr });
      return;
    }
    const leaseErr = validateLeaseStep();
    if (leaseErr) {
      setTab('lease');
      showNotification({ type: 'error', title: 'Check lease details', message: leaseErr });
      return;
    }

    setSaving(true);
    const loadingId = showNotification({
      type: 'loading',
      title: 'Saving changes…',
      message: 'Updating tenant and lease',
    });

    try {
      const tenantRes = await fetch(`/api/tenants/${tenant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: tenantForm.firstName.trim(),
          lastName: tenantForm.lastName.trim(),
          email: tenantForm.email.trim(),
          phone: tenantForm.phone.trim() || null,
          dateOfBirth: tenantForm.dateOfBirth || null,
          previousAddress: formatAddress(tenantForm.address) || null,
          emergencyContactName:
            joinName(
              tenantForm.emergencyFirstName,
              tenantForm.emergencyMiddleName,
              tenantForm.emergencyLastName
            ) || null,
          emergencyContactPhone: tenantForm.emergencyPhone.trim() || null,
          emergencyContactRelationship: tenantForm.emergencyRelationship.trim() || null,
          leaseStartDate: leaseForm.startDate || null,
          leaseEndDate: leaseForm.endDate || null,
          securityDeposit: depositAmount || null,
          moveInDate: leaseForm.startDate || null,
        }),
      });
      if (!tenantRes.ok) {
        const err = await tenantRes.json();
        throw new Error(err.error || 'Failed to update tenant');
      }

      if (assignment?.id) {
        const leaseRes = await fetch(`/api/leases/${assignment.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: leaseForm.roomId,
            monthlyRate: rent,
            startDate: leaseForm.startDate,
            endDate: leaseForm.endDate || null,
            leasePackageTemplateId: leaseForm.templateId || null,
            reason: 'Updated via Edit Tenant wizard',
          }),
        });
        if (!leaseRes.ok) {
          const err = await leaseRes.json();
          throw new Error(err.error || 'Failed to update lease');
        }
      }

      updateNotification(loadingId, {
        type: 'success',
        title: 'Tenant updated',
        message: `${fullName} has been saved`,
      });
      router.push(`/admin/tenants/${tenant.id}?tab=profile`);
      router.refresh();
    } catch (e) {
      updateNotification(loadingId, {
        type: 'error',
        title: 'Save failed',
        message: e instanceof Error ? e.message : 'An error occurred',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">Edit Tenant</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
            {fullName || 'Tenant'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={goBack}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            isLoading={saving}
            className="bg-gray-900 hover:bg-black"
          >
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(resolveTab(v))}>
        <TabList>
          {TABS.map((t) => (
            <Tab key={t.id} value={t.id}>
              {t.label}
            </Tab>
          ))}
        </TabList>

        <TabPanel value="tenant">
        <div>
          <WizardSection
            title="Personal Details"
            description="Provide basic information about the tenant."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="sm:col-span-1">
                <LeaseFormField label="First name">
                  <Input
                    className={leaseFieldClass}
                    value={tenantForm.firstName}
                    onChange={(e) =>
                      setTenantForm((p) => ({ ...p, firstName: e.target.value }))
                    }
                  />
                </LeaseFormField>
              </div>
              <div className="sm:col-span-1">
                <LeaseFormField label="Middle name">
                  <Input
                    className={leaseFieldClass}
                    value={tenantForm.middleName}
                    onChange={(e) =>
                      setTenantForm((p) => ({ ...p, middleName: e.target.value }))
                    }
                  />
                </LeaseFormField>
              </div>
              <div className="sm:col-span-1">
                <LeaseFormField label="Last name">
                  <Input
                    className={leaseFieldClass}
                    value={tenantForm.lastName}
                    onChange={(e) =>
                      setTenantForm((p) => ({ ...p, lastName: e.target.value }))
                    }
                  />
                </LeaseFormField>
              </div>
              <div className="sm:col-span-1">
                <LeaseFormField label="Suffix">
                  <Input
                    className={leaseFieldClass}
                    value={tenantForm.suffix}
                    onChange={(e) =>
                      setTenantForm((p) => ({ ...p, suffix: e.target.value }))
                    }
                  />
                </LeaseFormField>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <LeaseFormField label="Birth Date">
                <Input
                  type="date"
                  className={leaseFieldClass}
                  value={tenantForm.dateOfBirth}
                  onChange={(e) =>
                    setTenantForm((p) => ({ ...p, dateOfBirth: e.target.value }))
                  }
                />
              </LeaseFormField>
              <div>
                <FieldLabel>Photo</FieldLabel>
                <div className="flex items-center gap-3">
                  <Avatar name={fullName || 'Tenant'} src={photoUrl} size="lg" className="h-14 w-14" />
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handlePhotoChange(file);
                      e.target.value = '';
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    Change
                  </Button>
                </div>
              </div>
            </div>
          </WizardSection>

          <WizardSection
            title="Contact Details"
            description="Primary contact information for the tenant."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <LeaseFormField label="Contact No.">
                <Input
                  className={leaseFieldClass}
                  value={tenantForm.phone}
                  onChange={(e) => setTenantForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </LeaseFormField>
              <LeaseFormField label="Email address">
                <Input
                  type="email"
                  className={leaseFieldClass}
                  value={tenantForm.email}
                  onChange={(e) => setTenantForm((p) => ({ ...p, email: e.target.value }))}
                />
              </LeaseFormField>
            </div>
          </WizardSection>

          <WizardSection
            title="Address"
            description="Tenant's residential address before moving in to assigned Property and Unit."
          >
            <AddressEditor
              value={tenantForm.address}
              onChange={(address) => setTenantForm((p) => ({ ...p, address }))}
            />
          </WizardSection>

          <WizardSection
            title="Emergency Contact Person"
            description="Contact details of someone to reach in case of emergencies."
            last
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <LeaseFormField label="First name">
                <Input
                  className={leaseFieldClass}
                  value={tenantForm.emergencyFirstName}
                  onChange={(e) =>
                    setTenantForm((p) => ({ ...p, emergencyFirstName: e.target.value }))
                  }
                />
              </LeaseFormField>
              <LeaseFormField label="Middle name">
                <Input
                  className={leaseFieldClass}
                  value={tenantForm.emergencyMiddleName}
                  onChange={(e) =>
                    setTenantForm((p) => ({ ...p, emergencyMiddleName: e.target.value }))
                  }
                />
              </LeaseFormField>
              <LeaseFormField label="Last name">
                <Input
                  className={leaseFieldClass}
                  value={tenantForm.emergencyLastName}
                  onChange={(e) =>
                    setTenantForm((p) => ({ ...p, emergencyLastName: e.target.value }))
                  }
                />
              </LeaseFormField>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <LeaseFormField label="Contact No.">
                <Input
                  className={leaseFieldClass}
                  value={tenantForm.emergencyPhone}
                  onChange={(e) =>
                    setTenantForm((p) => ({ ...p, emergencyPhone: e.target.value }))
                  }
                />
              </LeaseFormField>
              <LeaseFormField label="Relationship to Tenant">
                <Input
                  className={leaseFieldClass}
                  value={tenantForm.emergencyRelationship}
                  onChange={(e) =>
                    setTenantForm((p) => ({ ...p, emergencyRelationship: e.target.value }))
                  }
                />
              </LeaseFormField>
            </div>
            <div className="mt-4">
              <AddressEditor
                value={tenantForm.emergencyAddress}
                onChange={(emergencyAddress) =>
                  setTenantForm((p) => ({ ...p, emergencyAddress }))
                }
              />
            </div>
          </WizardSection>
        </div>
        </TabPanel>

        <TabPanel value="lease">
        <div>
          <WizardSection
            title="Lease Details"
            description="Property, unit, package template, and rent for this tenancy."
          >
            {leaseMetaLoading ? (
              <p className="text-sm text-gray-500">Loading lease options…</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <LeaseFormField label="Property">
                  <Select
                    className={leaseFieldClass}
                    value={leaseForm.buildingId}
                    onChange={(e) =>
                      setLeaseForm((p) => ({
                        ...p,
                        buildingId: e.target.value,
                        roomId: '',
                      }))
                    }
                  >
                    <option value="">Select property</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                </LeaseFormField>
                <LeaseFormField label="Unit">
                  <Select
                    className={leaseFieldClass}
                    value={leaseForm.roomId}
                    onChange={(e) => {
                      const roomId = e.target.value;
                      const room = rooms.find((r) => r.id === roomId);
                      setLeaseForm((p) => ({
                        ...p,
                        roomId,
                        monthlyRate:
                          room?.monthlyRate != null
                            ? String(room.monthlyRate)
                            : p.monthlyRate,
                      }));
                    }}
                  >
                    <option value="">Select unit</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {formatUnitLabel(r.roomNumber)}
                      </option>
                    ))}
                  </Select>
                </LeaseFormField>
                <LeaseFormField label="Lease Template">
                  <Select
                    className={leaseFieldClass}
                    value={leaseForm.templateId}
                    onChange={(e) =>
                      setLeaseForm((p) => ({ ...p, templateId: e.target.value }))
                    }
                  >
                    <option value="">Select one</option>
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name}
                      </option>
                    ))}
                  </Select>
                </LeaseFormField>
                <LeaseFormField label="Rent Amount">
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-gray-500">
                      ₱
                    </span>
                    <Input
                      className={cn(leaseFieldClass, 'pl-7 pr-12')}
                      value={leaseForm.monthlyRate}
                      onChange={(e) =>
                        setLeaseForm((p) => ({ ...p, monthlyRate: e.target.value }))
                      }
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-gray-400">
                      PHP
                    </span>
                  </div>
                </LeaseFormField>
              </div>
            )}
          </WizardSection>

          <WizardSection
            title="Lease Template Summary"
            description="Terms applied from the selected lease package."
          >
            <dl className="max-w-md space-y-2.5">
              <LeaseTemplatePair
                label="Lease Term"
                value={formatTermLabel(
                  termMonths ?? template?.termMonths ?? null
                )}
              />
              <LeaseTemplatePair
                label="Deposit Period"
                value={formatDepositLabel(depositMonths)}
              />
              <LeaseTemplatePair
                label="Advance Period"
                value={formatAdvanceLabel(advanceMonths)}
              />
              <LeaseTemplatePair
                label="Grace Period"
                value={formatGraceLabel(
                  template?.gracePeriodDays ?? assignment?.leasePackageGracePeriodDays
                )}
              />
              <LeaseTemplatePair
                label="Penalty Type"
                value={formatPenaltyTypeLabel(
                  template?.penaltyType ?? assignment?.leasePackagePenaltyType
                )}
              />
              <LeaseTemplatePair
                label="Penalty Fee"
                value={formatPenaltyFeeLabel(
                  template?.penaltyType ?? assignment?.leasePackagePenaltyType,
                  template?.penaltyFee ?? assignment?.leasePackagePenaltyFee
                )}
              />
            </dl>
          </WizardSection>

          <WizardSection
            title="Lease Duration"
            description="Start date and automatically calculated end date based on the selected Lease Template."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <LeaseFormField label="Start Date">
                <Input
                  type="date"
                  className={leaseFieldClass}
                  value={leaseForm.startDate}
                  onChange={(e) =>
                    setLeaseForm((p) => ({ ...p, startDate: e.target.value }))
                  }
                />
              </LeaseFormField>
              <LeaseFormField label="End Date">
                <Input
                  type="date"
                  className={leaseFieldClass}
                  value={leaseForm.endDate}
                  disabled
                  readOnly
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  Automatically calculated based on the selected Lease Template.
                </p>
              </LeaseFormField>
            </div>
          </WizardSection>

          <WizardSection
            title="Financial Summary"
            description="Initial amounts derived from rent and the lease package."
            last
          >
            <dl className="max-w-md space-y-2.5">
              <LeaseFinanceRow label="Deposit Amount" value={formatLeaseMoney(depositAmount)} />
              <LeaseFinanceRow label="Advance Amount" value={formatLeaseMoney(advanceAmount)} />
              <LeaseFinanceRow
                label="Initial Cashout"
                value={formatLeaseMoney(initialCashout)}
                emphasize
              />
              <LeaseFinanceRow
                label="First Due Date"
                value={formatLeaseFormDate(firstDueDate)}
              />
            </dl>
          </WizardSection>
        </div>
        </TabPanel>

        <TabPanel value="documents">
        <div>
          <WizardSection
            title="Lease Contract"
            description="Upload the signed lease contract to finalize tenant records."
          >
            <UploadRow
              doc={docs.lease}
              onUpload={(file) =>
                void uploadDocument(file, 'tenant_agreement', (meta) =>
                  setDocs((p) => ({ ...p, lease: meta }))
                )
              }
            />
          </WizardSection>

          <WizardSection
            title="ID Requirements"
            description="Upload a valid government-issued ID for tenant verification."
          >
            <UploadRow
              doc={docs.idProof}
              onUpload={(file) =>
                void uploadDocument(file, 'id_proof', (meta) =>
                  setDocs((p) => ({ ...p, idProof: meta }))
                )
              }
            />
            <div className="mt-4 max-w-sm">
              <LeaseFormField label="ID Type">
                <Select
                  className={leaseFieldClass}
                  value={docs.idType}
                  onChange={(e) => setDocs((p) => ({ ...p, idType: e.target.value }))}
                >
                  <option value="">Select one</option>
                  {ID_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </LeaseFormField>
            </div>
          </WizardSection>

          <WizardSection
            title="Proof of Residency"
            description="Upload a document that verifies the tenant's address."
            last
          >
            <UploadRow
              doc={docs.residency}
              onUpload={(file) =>
                void uploadDocument(file, 'background_check', (meta) =>
                  setDocs((p) => ({ ...p, residency: meta }))
                )
              }
            />
            <div className="mt-4 max-w-sm">
              <LeaseFormField label="Document Type">
                <Select
                  className={leaseFieldClass}
                  value={docs.residencyType}
                  onChange={(e) =>
                    setDocs((p) => ({ ...p, residencyType: e.target.value }))
                  }
                >
                  <option value="">Select one</option>
                  {RESIDENCY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </LeaseFormField>
            </div>
          </WizardSection>
        </div>
        </TabPanel>
      </Tabs>

      <div className="mt-10 flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
        <Button type="button" variant="outline" onClick={goBack}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => void handleSave()}
          isLoading={saving}
          className="bg-gray-900 hover:bg-black"
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}

function AddressEditor({
  value,
  onChange,
}: {
  value: AddressFields;
  onChange: (next: AddressFields) => void;
}) {
  return (
    <div className="space-y-4">
      <LeaseFormField label="Province">
        <Select
          className={leaseFieldClass}
          value={value.province}
          onChange={(e) => onChange({ ...value, province: e.target.value })}
        >
          {PH_PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
      </LeaseFormField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <LeaseFormField label="City">
          <Input
            className={leaseFieldClass}
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
          />
        </LeaseFormField>
        <LeaseFormField label="Barangay">
          <Input
            className={leaseFieldClass}
            value={value.barangay}
            onChange={(e) => onChange({ ...value, barangay: e.target.value })}
          />
        </LeaseFormField>
      </div>
      <LeaseFormField label="Street address">
        <Input
          className={leaseFieldClass}
          value={value.street}
          onChange={(e) => onChange({ ...value, street: e.target.value })}
        />
      </LeaseFormField>
    </div>
  );
}

function UploadRow({
  doc,
  onUpload,
}: {
  doc: DocMeta | null;
  onUpload: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = '';
        }}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2"
      >
        <Upload className="h-4 w-4" />
        Upload
      </Button>
      <span className="text-sm text-gray-500">JPG, PNG, PDF up to 25MB</span>
      {doc ? (
        <span className="text-sm font-medium text-gray-800">{doc.name}</span>
      ) : null}
    </div>
  );
}
