'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import type {
  LeasePackagePenaltyType,
  LeasePackageTemplate,
} from '@/lib/lease-package-templates-shared';
import {
  LeaseFormField,
  LeaseFormSection,
  leaseFieldClass,
} from '@/components/features/tenants/profile/LeaseFormLayout';

export interface LeasePackageFormValues {
  name: string;
  termMonths: string; // '' | '3' | '6' | '12' | 'none'
  depositMonths: string; // number or 'none'
  advanceMonths: string;
  gracePeriodDays: string;
  /** '' | 'none' | 'percentage' | 'flat_fee' */
  penaltyType: '' | 'none' | LeasePackagePenaltyType;
  penaltyFee: string;
}

interface LeasePackageTemplateFormProps {
  mode: 'create' | 'edit';
  initial?: LeasePackageTemplate | null;
}

function toFormValues(t?: LeasePackageTemplate | null): LeasePackageFormValues {
  if (!t) {
    return {
      name: '',
      termMonths: '6',
      depositMonths: '2',
      advanceMonths: '1',
      gracePeriodDays: '',
      penaltyType: 'none',
      penaltyFee: '',
    };
  }
  return {
    name: t.name,
    termMonths: t.termMonths == null ? 'none' : String(t.termMonths),
    depositMonths: t.depositMonths == null ? 'none' : String(t.depositMonths),
    advanceMonths: String(t.advanceMonths),
    gracePeriodDays: t.gracePeriodDays == null ? '' : String(t.gracePeriodDays),
    penaltyType: t.penaltyType ?? 'none',
    penaltyFee: t.penaltyFee == null ? '' : String(t.penaltyFee),
  };
}

export default function LeasePackageTemplateForm({
  mode,
  initial,
}: LeasePackageTemplateFormProps) {
  const router = useRouter();
  const { showError } = useNotifications();
  const [form, setForm] = useState<LeasePackageFormValues>(() => toFormValues(initial));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const backHref = '/admin/leasing';
  const title = mode === 'create' ? 'Create Lease Template' : 'Edit Lease Template';

  const openConfirm = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showError('Template name is required');
      return;
    }
    setConfirmOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const penaltiesEnabled =
        form.penaltyType !== '' && form.penaltyType !== 'none';
      if (penaltiesEnabled && (form.penaltyFee === '' || Number.isNaN(Number(form.penaltyFee)))) {
        showError('Enter a penalty fee, or set Penalty Type to None');
        setSaving(false);
        return;
      }

      const payload = {
        name: form.name.trim(),
        termMonths: form.termMonths === 'none' ? null : Number(form.termMonths),
        depositMonths: form.depositMonths === 'none' ? null : Number(form.depositMonths),
        advanceMonths: Number(form.advanceMonths),
        gracePeriodDays:
          form.gracePeriodDays === '' ? null : Number(form.gracePeriodDays),
        penaltyType: penaltiesEnabled ? form.penaltyType : null,
        penaltyFee: penaltiesEnabled ? Number(form.penaltyFee) : null,
      };

      const res = await fetch(
        mode === 'create'
          ? '/api/lease-package-templates'
          : `/api/lease-package-templates/${initial!.id}`,
        {
          method: mode === 'create' ? 'POST' : 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save lease template');
      }

      setConfirmOpen(false);
      router.push(
        mode === 'create' ? `${backHref}?created=1` : `${backHref}?updated=1`
      );
      router.refresh();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const penaltiesEnabled =
    form.penaltyType !== '' && form.penaltyType !== 'none';
  const isPercentage = form.penaltyType === 'percentage';

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white">
      <div className="mx-auto max-w-5xl px-6 py-8 sm:px-8">
        <LinkBack href={backHref} />
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-gray-900">{title}</h1>

        <form onSubmit={openConfirm} className="mt-10">
          <LeaseFormSection
            title="Template Details"
            description="Define the foundational details for this lease template."
          >
            <div className="space-y-4 max-w-xl">
              <LeaseFormField label="Template Name">
                <Input
                  className={leaseFieldClass}
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Standard 12-Month"
                />
              </LeaseFormField>
              <LeaseFormField label="Lease Term">
                <Select
                  className={leaseFieldClass}
                  value={form.termMonths}
                  onChange={(e) => setForm((p) => ({ ...p, termMonths: e.target.value }))}
                >
                  <option value="3">3 Months</option>
                  <option value="6">6 Months</option>
                  <option value="12">12 Months</option>
                  <option value="none">No Fixed Term</option>
                </Select>
              </LeaseFormField>
            </div>
          </LeaseFormSection>

          <LeaseFormSection
            title="Payment Terms"
            description="Set the deposit and advance payment requirements."
          >
            <div className="grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
              <LeaseFormField label="Deposit Period">
                <Select
                  className={leaseFieldClass}
                  value={form.depositMonths}
                  onChange={(e) => setForm((p) => ({ ...p, depositMonths: e.target.value }))}
                >
                  <option value="none">Not required</option>
                  <option value="1">1 month</option>
                  <option value="2">2 months</option>
                  <option value="3">3 months</option>
                </Select>
              </LeaseFormField>
              <LeaseFormField label="Advance Period">
                <SuffixInput
                  suffix="months"
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.advanceMonths}
                  onChange={(v) => setForm((p) => ({ ...p, advanceMonths: v }))}
                />
              </LeaseFormField>
            </div>
          </LeaseFormSection>

          <LeaseFormSection
            title="Penalties"
            description="Optional. Leave as None if this package has no late-payment penalty."
            last
          >
            <div className="max-w-xl space-y-4">
              <LeaseFormField label="Grace Period (optional)">
                <SuffixInput
                  suffix="days"
                  type="number"
                  min="0"
                  step="1"
                  value={form.gracePeriodDays}
                  onChange={(v) => setForm((p) => ({ ...p, gracePeriodDays: v }))}
                />
              </LeaseFormField>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <LeaseFormField label="Penalty Type">
                  <Select
                    className={leaseFieldClass}
                    value={form.penaltyType || 'none'}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        penaltyType: e.target.value as LeasePackageFormValues['penaltyType'],
                        penaltyFee:
                          e.target.value === 'none' || e.target.value === ''
                            ? ''
                            : p.penaltyFee,
                      }))
                    }
                  >
                    <option value="none">None</option>
                    <option value="percentage">Percentage</option>
                    <option value="flat_fee">Flat Fee</option>
                  </Select>
                </LeaseFormField>
                {penaltiesEnabled ? (
                  <LeaseFormField label="Penalty Fee">
                    {isPercentage ? (
                      <SuffixInput
                        suffix="%"
                        type="number"
                        min="0"
                        step="0.1"
                        value={form.penaltyFee}
                        onChange={(v) => setForm((p) => ({ ...p, penaltyFee: v }))}
                      />
                    ) : (
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                          ₱
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          className={cn(leaseFieldClass, 'pl-8 pr-14')}
                          value={form.penaltyFee}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, penaltyFee: e.target.value }))
                          }
                        />
                        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                          PHP
                        </span>
                      </div>
                    )}
                  </LeaseFormField>
                ) : (
                  <div className="flex items-end">
                    <p className="pb-3 text-sm text-gray-500">
                      No late fee for this template.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </LeaseFormSection>

          <div className="flex justify-end gap-3 pt-2">
            <Link href={backHref}>
              <Button
                type="button"
                variant="outline"
                className="h-11 min-w-[100px] rounded-lg border-gray-300 px-5 text-sm font-semibold"
              >
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              className="h-11 min-w-[100px] rounded-lg bg-gray-900 px-5 text-sm font-semibold hover:bg-black"
            >
              Save
            </Button>
          </div>
        </form>
      </div>

      {confirmOpen && (
        <ConfirmModal
          title={mode === 'create' ? 'Create Lease Template' : 'Update Lease Template'}
          description={
            mode === 'create'
              ? 'This lease template will be saved and available for selection when creating tenant accounts. You can edit this template later if needed.'
              : 'Updating this lease template will apply changes to all tenants currently using it. Proceed with caution as this may impact active lease terms.'
          }
          confirmLabel={mode === 'create' ? 'Confirm and Save' : 'Save Changes'}
          saving={saving}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => void save()}
        />
      )}
    </div>
  );
}

function LinkBack({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </Link>
  );
}

function SuffixInput({
  suffix,
  value,
  onChange,
  type = 'text',
  min,
  step,
}: {
  suffix: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  min?: string;
  step?: string;
}) {
  return (
    <div className="relative">
      <Input
        type={type}
        min={min}
        step={step}
        className={cn(leaseFieldClass, 'pr-16')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
        {suffix}
      </span>
    </div>
  );
}

function ConfirmModal({
  title,
  description,
  confirmLabel,
  saving,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-purple-200 bg-purple-50">
            <AlertTriangle className="h-5 w-5 text-purple-700" />
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <h3 className="mt-4 text-lg font-bold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">{description}</p>
        <div className="mt-6 flex justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-lg border-gray-300 px-4 font-semibold"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-10 rounded-lg bg-gray-900 px-4 font-semibold hover:bg-black"
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? 'Saving…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
