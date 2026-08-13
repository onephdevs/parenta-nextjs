'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import type { LeaseDetail } from '@/lib/leases-shared';
import {
  formatAdvanceLabel,
  formatDepositLabel,
  formatGraceLabel,
  formatPenaltyFeeLabel,
  formatPenaltyTypeLabel,
  formatTermLabel,
  type LeasePackageTemplate,
} from '@/lib/lease-package-templates-shared';
import {
  addMonthsToDate,
  formatLeaseFormDate,
  formatLeaseMoney,
} from './leaseTemplates';
import {
  LeaseFinanceRow,
  LeaseFormField,
  LeaseFormSection,
  LeaseTemplatePair,
  leaseFieldClass,
} from './LeaseFormLayout';

interface BuildingOption {
  id: string;
  name: string;
}

interface RoomOption {
  id: string;
  roomNumber: string;
  monthlyRate?: number;
  roomStatus?: string;
}

interface EditLeaseFormProps {
  tenantId: string;
  lease: LeaseDetail;
  tenantName: string;
  profilePictureUrl?: string | null;
  personBadge: 'active' | 'past' | 'inactive' | 'pending';
}

interface FormState {
  buildingId: string;
  roomId: string;
  templateId: string;
  monthlyRate: string;
  startDate: string;
  endDate: string;
}

function toInputDate(value?: string | null): string {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function formatUnitLabel(roomNumber: string): string {
  const raw = roomNumber.trim();
  if (!raw) return 'Select unit';
  if (/^(room|unit)\b/i.test(raw)) return raw;
  return `Room ${raw}`;
}

export default function EditLeaseForm({
  tenantId,
  lease,
  tenantName,
  profilePictureUrl,
  personBadge,
}: EditLeaseFormProps) {
  const router = useRouter();
  const { showError } = useNotifications();
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [packages, setPackages] = useState<LeasePackageTemplate[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [endDateTouched, setEndDateTouched] = useState(false);

  const initial: FormState = {
    buildingId: lease.buildingId || '',
    roomId: lease.roomId || '',
    templateId: lease.leasePackageTemplateId || '',
    monthlyRate:
      lease.monthlyRate != null
        ? Number(lease.monthlyRate).toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          }).replace(/,/g, '')
        : '',
    startDate: toInputDate(lease.startDate),
    endDate: toInputDate(lease.endDate),
  };
  const [form, setForm] = useState<FormState>(initial);
  const [baseline] = useState(initial);

  const template = packages.find((t) => t.id === form.templateId) || packages[0] || null;
  const depositMonths = template?.depositMonths ?? 0;
  const advanceMonths = template?.advanceMonths ?? 1;
  const termMonths = template?.termMonths ?? null;
  const rent = Number(form.monthlyRate) || 0;
  const depositAmount = depositMonths == null ? 0 : rent * depositMonths;
  const advanceAmount = rent * advanceMonths;
  const initialCashout = depositAmount + advanceAmount;
  const firstDueDate = form.startDate
    ? addMonthsToDate(form.startDate, Math.max(advanceMonths, 1))
    : null;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadingMeta(true);
      try {
        const [bRes, pRes] = await Promise.all([
          fetch('/api/buildings?limit=100', { credentials: 'include' }),
          fetch('/api/lease-package-templates', { credentials: 'include' }),
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
          const pkgs: LeasePackageTemplate[] = pJson.data || [];
          if (!cancelled) {
            setPackages(pkgs);
            if (!form.templateId && pkgs[0]) {
              setForm((prev) => ({ ...prev, templateId: pkgs[0].id }));
            }
          }
        }
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!form.buildingId) {
      setRooms([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const roomsRes = await fetch(
          `/api/rooms?buildingId=${encodeURIComponent(form.buildingId)}&limit=200`,
          { credentials: 'include' }
        );
        if (roomsRes.ok) {
          const json = await roomsRes.json();
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
                monthlyRate: Number(r.monthlyRate ?? r.monthly_rate ?? 0) || undefined,
                roomStatus: String(r.roomStatus || r.room_status || ''),
              }))
            );
          }
        }
      } catch {
        /* keep current */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.buildingId]);

  useEffect(() => {
    if (!form.startDate || termMonths == null || endDateTouched) return;
    const nextEnd = addMonthsToDate(form.startDate, termMonths);
    setForm((prev) => (prev.endDate === nextEnd ? prev : { ...prev, endDate: nextEnd }));
  }, [form.startDate, form.templateId, termMonths, endDateTouched]);

  const selectedRoom = rooms.find((r) => r.id === form.roomId);
  const selectedBuilding = buildings.find((b) => b.id === form.buildingId);

  const changes = useMemo(() => {
    const rows: { label: string; from: string; to: string }[] = [];
    if (baseline.buildingId !== form.buildingId) {
      rows.push({
        label: 'Property',
        from: buildings.find((b) => b.id === baseline.buildingId)?.name || baseline.buildingId,
        to: selectedBuilding?.name || form.buildingId,
      });
    }
    if (baseline.roomId !== form.roomId) {
      rows.push({
        label: 'Unit',
        from: formatUnitLabel(
          rooms.find((r) => r.id === baseline.roomId)?.roomNumber ||
            lease.roomNumber ||
            baseline.roomId
        ),
        to: formatUnitLabel(selectedRoom?.roomNumber || form.roomId),
      });
    }
    if (baseline.templateId !== form.templateId) {
      rows.push({
        label: 'Lease Template',
        from: packages.find((t) => t.id === baseline.templateId)?.name || '—',
        to: template?.name || '—',
      });
    }
    if (Number(baseline.monthlyRate) !== Number(form.monthlyRate)) {
      rows.push({
        label: 'Rent Amount',
        from: formatLeaseMoney(Number(baseline.monthlyRate) || 0),
        to: formatLeaseMoney(Number(form.monthlyRate) || 0),
      });
    }
    if (baseline.startDate !== form.startDate) {
      rows.push({
        label: 'Start Date',
        from: formatLeaseFormDate(baseline.startDate),
        to: formatLeaseFormDate(form.startDate),
      });
    }
    if (baseline.endDate !== form.endDate) {
      rows.push({
        label: 'End Date',
        from: formatLeaseFormDate(baseline.endDate),
        to: formatLeaseFormDate(form.endDate),
      });
    }
    return rows;
  }, [
    baseline,
    form,
    buildings,
    rooms,
    selectedBuilding,
    selectedRoom,
    packages,
    template?.name,
    lease.roomNumber,
  ]);

  const backHref = `/admin/tenants/${tenantId}?tab=lease`;

  const openConfirm = (e: FormEvent) => {
    e.preventDefault();
    if (!form.buildingId || !form.roomId || !form.startDate || !form.monthlyRate) {
      showError('Property, unit, start date, and rent are required');
      return;
    }
    if (!form.templateId || !template) {
      showError('Please select a lease template');
      return;
    }
    if (changes.length === 0) {
      showError('No changes to save');
      return;
    }
    setReason('');
    setConfirmOpen(true);
  };

  const saveChanges = async () => {
    if (!reason.trim()) {
      showError('Please enter a reason for the changes');
      return;
    }
    if (!template) {
      showError('Please select a lease template');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/leases/${encodeURIComponent(lease.id)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: form.roomId,
          startDate: form.startDate,
          endDate: form.endDate || null,
          monthlyRate: Number(form.monthlyRate),
          depositPaid: depositAmount,
          advancePaid: advanceAmount,
          templateName: template.name,
          leasePackageTemplateId: template.id,
          reason: reason.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update lease');
      }
      setConfirmOpen(false);
      router.push(`${backHref}&leaseUpdated=1`);
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update lease');
    } finally {
      setSaving(false);
    }
  };

  const templateSummaryItems = template
    ? [
        { label: 'Lease Term', value: formatTermLabel(template.termMonths) },
        { label: 'Deposit Period', value: formatDepositLabel(template.depositMonths) },
        { label: 'Advance Period', value: formatAdvanceLabel(template.advanceMonths) },
        { label: 'Grace Period', value: formatGraceLabel(template.gracePeriodDays) },
        { label: 'Penalty Type', value: formatPenaltyTypeLabel(template.penaltyType) },
        {
          label: 'Penalty Fee',
          value: formatPenaltyFeeLabel(template.penaltyType, template.penaltyFee),
        },
      ]
    : [];

  // Mockup column order: left = Term / Advance / Penalty Type; right = Deposit / Grace / Fee
  const templateLeft = [templateSummaryItems[0], templateSummaryItems[2], templateSummaryItems[4]].filter(
    Boolean
  );
  const templateRight = [templateSummaryItems[1], templateSummaryItems[3], templateSummaryItems[5]].filter(
    Boolean
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white">
      <div className="mx-auto max-w-5xl px-6 py-8 sm:px-8">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <h1 className="mt-5 text-3xl font-bold tracking-tight text-gray-900">Edit Lease</h1>

        <div className="mt-6 flex items-center gap-4">
          <Avatar
            name={tenantName}
            src={profilePictureUrl}
            size="lg"
            className="h-[72px] w-[72px] text-xl"
          />
          <div>
            <p className="text-sm text-gray-500">Editing lease for:</p>
            <p className="mt-0.5 text-xl font-bold text-gray-900">{tenantName}</p>
            <div className="mt-1.5">
              <StatusBadge status={personBadge} />
            </div>
          </div>
        </div>

        <form onSubmit={openConfirm} className="mt-10">
          {/* Lease Information */}
          <LeaseFormSection
            title="Lease Information"
            subtitle="Lease Details"
            description="Provide tenant's basic lease information."
          >
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                <LeaseFormField label="Property">
                  <Select
                    value={form.buildingId}
                    className={leaseFieldClass}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        buildingId: e.target.value,
                        roomId: '',
                      }))
                    }
                    disabled={loadingMeta}
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
                    value={form.roomId}
                    className={leaseFieldClass}
                    onChange={(e) => {
                      const roomId = e.target.value;
                      const room = rooms.find((r) => r.id === roomId);
                      setForm((p) => ({
                        ...p,
                        roomId,
                        monthlyRate:
                          room?.monthlyRate && !p.monthlyRate
                            ? String(room.monthlyRate)
                            : p.monthlyRate,
                      }));
                    }}
                    disabled={!form.buildingId}
                  >
                    <option value="">Select unit</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {formatUnitLabel(r.roomNumber)}
                        {r.id !== lease.roomId && r.roomStatus === 'occupied'
                          ? ' (occupied)'
                          : ''}
                      </option>
                    ))}
                  </Select>
                </LeaseFormField>
                <LeaseFormField label="Lease Template">
                  <Select
                    value={form.templateId}
                    className={leaseFieldClass}
                    onChange={(e) => {
                      setEndDateTouched(false);
                      setForm((p) => ({ ...p, templateId: e.target.value }));
                    }}
                  >
                    <option value="">Select one</option>
                    {packages.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </LeaseFormField>
                <LeaseFormField label="Rent Amount">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                      ₱
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className={cn(leaseFieldClass, 'pl-8 pr-14')}
                      value={form.monthlyRate}
                      onChange={(e) => setForm((p) => ({ ...p, monthlyRate: e.target.value }))}
                    />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold tracking-wide text-gray-400">
                      PHP
                    </span>
                  </div>
                </LeaseFormField>
              </div>

              <div className="rounded-xl border border-gray-200 bg-[#F7F8FA] px-5 py-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">
                  Lease Template Summary
                </p>
                <div className="mt-4 grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-2">
                  <div className="space-y-3">
                    {templateLeft.map((item) => (
                      <LeaseTemplatePair key={item.label} label={item.label} value={item.value} />
                    ))}
                  </div>
                  <div className="space-y-3">
                    {templateRight.map((item) => (
                      <LeaseTemplatePair key={item.label} label={item.label} value={item.value} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </LeaseFormSection>

          {/* Lease Duration */}
          <LeaseFormSection
            title="Lease Duration"
            description="Define the lease start date; the end date is automatically calculated based on the selected Lease Template."
          >
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
              <LeaseFormField label="Start Date">
                <Input
                  type="date"
                  className={leaseFieldClass}
                  value={form.startDate}
                  onChange={(e) => {
                    setEndDateTouched(false);
                    setForm((p) => ({ ...p, startDate: e.target.value }));
                  }}
                />
              </LeaseFormField>
              <LeaseFormField label="End Date">
                <Input
                  type="date"
                  className={cn(leaseFieldClass, 'bg-gray-50')}
                  value={form.endDate}
                  onChange={(e) => {
                    setEndDateTouched(true);
                    setForm((p) => ({ ...p, endDate: e.target.value }));
                  }}
                />
              </LeaseFormField>
            </div>
          </LeaseFormSection>

          {/* Financial Summary */}
          <LeaseFormSection
            title="Financial Summary"
            description="View calculated deposit, advance, initial cashout, and first due date based on rent and lease template settings."
            last
          >
            <dl className="max-w-md space-y-3.5">
              <LeaseFinanceRow label="Deposit Amount" value={formatLeaseMoney(depositAmount)} />
              <LeaseFinanceRow label="Advance Amount" value={formatLeaseMoney(advanceAmount)} />
              <LeaseFinanceRow
                label="Initial Cashout"
                value={formatLeaseMoney(initialCashout)}
                emphasize
              />
              <LeaseFinanceRow label="First Due Date" value={formatLeaseFormDate(firstDueDate)} />
            </dl>
          </LeaseFormSection>

          <div className="flex justify-end gap-3 pt-2">
            <Link href={backHref}>
              <Button
                type="button"
                variant="outline"
                className="h-11 min-w-[100px] rounded-lg border-gray-300 px-5 text-sm font-semibold text-gray-800"
              >
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              className="h-11 min-w-[130px] rounded-lg bg-gray-900 px-5 text-sm font-semibold hover:bg-black"
            >
              Save changes
            </Button>
          </div>
        </form>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-lease-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-purple-200 bg-purple-50">
                  <AlertTriangle className="h-5 w-5 text-purple-700" />
                </div>
                <div>
                  <h3 id="confirm-lease-title" className="text-lg font-bold text-gray-900">
                    Confirm Lease Changes
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">
                    You&apos;re about to update the lease details. Here&apos;s a summary of your
                    changes:
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <ul className="mt-5 space-y-2.5 text-sm text-gray-800">
              {changes.map((c) => (
                <li key={c.label}>
                  <span className="font-semibold text-gray-900">{c.label}:</span>{' '}
                  <span className="text-gray-600">{c.from}</span>
                  <span className="mx-1.5 text-gray-400">→</span>
                  <span className="font-medium text-gray-900">{c.to}</span>
                </li>
              ))}
            </ul>

            <div className="my-5 border-t border-gray-100" />

            <label
              className="block text-sm font-bold text-gray-900"
              htmlFor="lease-edit-reason"
            >
              Reason
            </label>
            <Input
              id="lease-edit-reason"
              className={cn(leaseFieldClass, 'mt-2')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. extend lease and rent increase"
              autoFocus
            />

            <div className="mt-6 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-lg border-gray-300 px-4 font-semibold"
                onClick={() => setConfirmOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-10 rounded-lg bg-gray-900 px-4 font-semibold hover:bg-black"
                onClick={() => void saveChanges()}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
