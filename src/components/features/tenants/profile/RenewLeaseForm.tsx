'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
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

interface RenewOptions {
  retainPreviousDetails: boolean;
  carryOverDeposit: boolean;
  waiveAdvance: boolean;
  waivePenalties: boolean;
  waiveOutstanding: boolean;
}

interface RenewLeaseFormProps {
  tenantId: string;
  lease: LeaseDetail;
  tenantName: string;
  profilePictureUrl?: string | null;
  personBadge: 'active' | 'past' | 'inactive' | 'pending';
}

function toInputDate(value?: string | null): string {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function formatUnitLabel(roomNumber: string): string {
  const raw = roomNumber.trim();
  if (!raw) return 'Select unit';
  if (/^(room|unit)\b/i.test(raw)) return raw;
  return `Room ${raw}`;
}

const OPTION_DEFS: {
  key: keyof RenewOptions;
  label: string;
  description: string;
}[] = [
  {
    key: 'retainPreviousDetails',
    label: 'Retain previous lease details',
    description: 'Keep all lease details from the current contract.',
  },
  {
    key: 'carryOverDeposit',
    label: 'Carry over deposit',
    description: 'Retain the current deposit and apply it to the new lease.',
  },
  {
    key: 'waiveAdvance',
    label: 'Waive advance payment',
    description: 'Skip collecting the advance payment required for the new lease.',
  },
  {
    key: 'waivePenalties',
    label: 'Waive any accrued penalties',
    description:
      'Forgive any penalty charges accumulated by the tenant during their previous lease period.',
  },
  {
    key: 'waiveOutstanding',
    label: 'Waive outstanding balance',
    description: "Remove any unpaid balance from the tenant's previous lease.",
  },
];

export default function RenewLeaseForm({
  tenantId,
  lease,
  tenantName,
  profilePictureUrl,
  personBadge,
}: RenewLeaseFormProps) {
  const router = useRouter();
  const { showError } = useNotifications();
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [packages, setPackages] = useState<LeasePackageTemplate[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [options, setOptions] = useState<RenewOptions>({
    retainPreviousDetails: true,
    carryOverDeposit: true,
    waiveAdvance: true,
    waivePenalties: false,
    waiveOutstanding: false,
  });

  const defaultStart = lease.endDate
    ? addDays(toInputDate(lease.endDate), 1)
    : addDays(new Date().toISOString().slice(0, 10), 1);

  const [form, setForm] = useState({
    buildingId: lease.buildingId || '',
    roomId: lease.roomId || '',
    templateId: lease.leasePackageTemplateId || '',
    monthlyRate: String(lease.monthlyRate ?? ''),
    startDate: defaultStart,
    endDate: '',
  });

  const template = packages.find((t) => t.id === form.templateId) || packages[0] || null;
  const depositMonths = template?.depositMonths ?? 0;
  const advanceMonths = template?.advanceMonths ?? 1;
  const termMonths = template?.termMonths ?? null;
  const rent = Number(form.monthlyRate) || 0;

  const calculatedDeposit = depositMonths == null ? 0 : rent * depositMonths;
  const calculatedAdvance = rent * advanceMonths;
  const depositForCashout = options.carryOverDeposit ? 0 : calculatedDeposit;
  const advanceForCashout = options.waiveAdvance ? 0 : calculatedAdvance;
  const initialCashout = depositForCashout + advanceForCashout;
  const firstDueDate = form.startDate
    ? addMonthsToDate(form.startDate, Math.max(advanceMonths, 1))
    : null;

  const detailsLocked = options.retainPreviousDetails;
  const backHref = `/admin/tenants/${tenantId}?tab=lease`;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [bRes, pRes] = await Promise.all([
        fetch('/api/buildings?limit=100', { credentials: 'include' }),
        fetch('/api/lease-package-templates', { credentials: 'include' }),
      ]);
      const json = await bRes.json();
      const list = Array.isArray(json.buildings)
        ? json.buildings
        : Array.isArray(json.data)
          ? json.data
          : Array.isArray(json.data?.buildings)
            ? json.data.buildings
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
    })();
    return () => {
      cancelled = true;
    };
  }, [form.buildingId]);

  useEffect(() => {
    if (!form.startDate || termMonths == null) return;
    const nextEnd = addMonthsToDate(form.startDate, termMonths);
    setForm((prev) => (prev.endDate === nextEnd ? prev : { ...prev, endDate: nextEnd }));
  }, [form.startDate, form.templateId, termMonths]);

  const openConfirm = (e: FormEvent) => {
    e.preventDefault();
    if (!form.buildingId || !form.roomId || !form.startDate || !form.endDate) {
      showError('Property, unit, and dates are required');
      return;
    }
    if (!form.templateId || !template) {
      showError('Please select a lease template');
      return;
    }
    setConfirmOpen(true);
  };

  const submitRenew = async () => {
    if (!template) {
      showError('Please select a lease template');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/leases/${encodeURIComponent(lease.id)}/renew`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: form.roomId,
          startDate: form.startDate,
          endDate: form.endDate,
          monthlyRate: Number(form.monthlyRate),
          depositPaid: options.carryOverDeposit
            ? lease.depositPaid || calculatedDeposit
            : calculatedDeposit,
          advancePaid: options.waiveAdvance ? 0 : calculatedAdvance,
          templateName: template.name,
          leasePackageTemplateId: template.id,
          notes: notes.trim() || null,
          options,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to renew lease');
      }
      setConfirmOpen(false);
      router.push(`${backHref}&leaseRenewed=1`);
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to renew lease');
    } finally {
      setSaving(false);
    }
  };

  const templateLeft = template
    ? [
        { label: 'Lease Term', value: formatTermLabel(template.termMonths) },
        { label: 'Advance Period', value: formatAdvanceLabel(template.advanceMonths) },
        { label: 'Penalty Type', value: formatPenaltyTypeLabel(template.penaltyType) },
      ]
    : [];
  const templateRight = template
    ? [
        { label: 'Deposit Period', value: formatDepositLabel(template.depositMonths) },
        { label: 'Grace Period', value: formatGraceLabel(template.gracePeriodDays) },
        {
          label: 'Penalty Fee',
          value: formatPenaltyFeeLabel(template.penaltyType, template.penaltyFee),
        },
      ]
    : [];

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

        <h1 className="mt-5 text-3xl font-bold tracking-tight text-gray-900">Renew Lease</h1>

        <div className="mt-6 flex items-center gap-4">
          <Avatar
            name={tenantName}
            src={profilePictureUrl}
            size="lg"
            className="h-[72px] w-[72px] text-xl"
          />
          <div>
            <p className="text-sm text-gray-500">Renewing lease for:</p>
            <p className="mt-0.5 text-xl font-bold text-gray-900">{tenantName}</p>
            <div className="mt-1.5">
              <StatusBadge status={personBadge} />
            </div>
          </div>
        </div>

        <form onSubmit={openConfirm} className="mt-10">
          <LeaseFormSection
            title="Lease Information"
            subtitle="Renewal Options"
            description="Customize the lease renewal by applying optional adjustments."
          >
            <div className="space-y-4">
              {OPTION_DEFS.map((opt) => (
                <label key={opt.key} className="flex cursor-pointer gap-3">
                  <input
                    type="checkbox"
                    checked={options[opt.key]}
                    onChange={(e) =>
                      setOptions((prev) => ({ ...prev, [opt.key]: e.target.checked }))
                    }
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900">{opt.label}</span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-gray-500">
                      {opt.description}
                    </span>
                  </span>
                </label>
              ))}

              <div className="pt-2">
                <span className="mb-1.5 block text-sm font-medium text-gray-500">
                  Notes (optional)
                </span>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="rounded-lg border-gray-300 shadow-none focus:border-gray-900 focus:ring-gray-900/20"
                  placeholder=""
                />
              </div>
            </div>
          </LeaseFormSection>

          <LeaseFormSection
            title="Lease Details"
            description="Provide tenant's basic lease information."
          >
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                <LeaseFormField label="Property">
                  <Select
                    value={form.buildingId}
                    className={leaseFieldClass}
                    disabled={detailsLocked}
                    onChange={(e) =>
                      setForm((p) => ({
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
                    value={form.roomId}
                    className={leaseFieldClass}
                    disabled={detailsLocked || !form.buildingId}
                    onChange={(e) => setForm((p) => ({ ...p, roomId: e.target.value }))}
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
                    value={form.templateId}
                    className={leaseFieldClass}
                    disabled={detailsLocked}
                    onChange={(e) => setForm((p) => ({ ...p, templateId: e.target.value }))}
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
                      disabled={detailsLocked}
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
                      <LeaseTemplatePair key={item.label} {...item} />
                    ))}
                  </div>
                  <div className="space-y-3">
                    {templateRight.map((item) => (
                      <LeaseTemplatePair key={item.label} {...item} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </LeaseFormSection>

          <LeaseFormSection
            title="Lease Duration"
            description="Define the lease start date; the end date is automatically calculated based on the selected Lease Template."
          >
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
              <LeaseFormField label="Start Date">
                <Input
                  type="date"
                  className={cn(leaseFieldClass, 'bg-gray-50 text-gray-600')}
                  value={form.startDate}
                  readOnly
                />
              </LeaseFormField>
              <LeaseFormField label="End Date">
                <Input
                  type="date"
                  className={cn(leaseFieldClass, 'bg-gray-50 text-gray-600')}
                  value={form.endDate}
                  readOnly
                />
              </LeaseFormField>
            </div>
          </LeaseFormSection>

          <LeaseFormSection
            title="Financial Summary"
            description="View calculated deposit, advance, initial cashout, and first due date based on rent and lease template settings."
            last
          >
            <dl className="max-w-md space-y-3.5">
              <LeaseFinanceRow
                label="Deposit Amount"
                value={formatLeaseMoney(depositForCashout)}
              />
              <LeaseFinanceRow
                label="Advance Amount"
                value={formatLeaseMoney(advanceForCashout)}
              />
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
              Renew lease
            </Button>
          </div>
        </form>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="renew-lease-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-purple-200 bg-purple-50">
                <AlertTriangle className="h-5 w-5 text-purple-700" />
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
            <h3 id="renew-lease-title" className="mt-4 text-lg font-bold text-gray-900">
              Renew Lease
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Renewing this lease will update the tenant&apos;s records and apply the selected
              settings. Proceed?
            </p>
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
                onClick={() => void submitRenew()}
                disabled={saving}
              >
                {saving ? 'Renewing…' : 'Renew lease'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
