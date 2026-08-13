'use client';

import { useEffect, useState } from 'react';
import { Select } from '@/components/ui/Select';
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

export type { LeasePackageTemplate };

export function useLeasePackageTemplates() {
  const [packages, setPackages] = useState<LeasePackageTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/lease-package-templates', {
          credentials: 'include',
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) {
          setPackages(Array.isArray(json.data) ? json.data : []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { packages, loading };
}

export function amountsFromLeasePackage(
  template: LeasePackageTemplate | null | undefined,
  monthlyRent: number
): {
  depositMonths: number;
  advanceMonths: number;
  depositAmount: number;
  advanceAmount: number;
  termMonths: number | null;
} {
  const depositMonths = template?.depositMonths ?? 0;
  const advanceMonths = template?.advanceMonths ?? 0;
  const rent = Number(monthlyRent) || 0;
  return {
    depositMonths,
    advanceMonths,
    depositAmount: Math.round(rent * depositMonths * 100) / 100,
    advanceAmount: Math.round(rent * advanceMonths * 100) / 100,
    termMonths: template?.termMonths ?? null,
  };
}

interface LeasePackageSelectProps {
  id?: string;
  value: string;
  packages: LeasePackageTemplate[];
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  onChange: (templateId: string, template: LeasePackageTemplate | null) => void;
}

export function LeasePackageSelect({
  id = 'lease-package-template',
  value,
  packages,
  loading,
  disabled,
  className,
  required,
  onChange,
}: LeasePackageSelectProps) {
  return (
    <Select
      id={id}
      value={value}
      disabled={disabled || loading}
      required={required}
      className={className}
      onChange={(e) => {
        const nextId = e.target.value;
        const pkg = packages.find((p) => p.id === nextId) || null;
        onChange(nextId, pkg);
      }}
    >
      <option value="">{loading ? 'Loading templates…' : 'Select lease template'}</option>
      {packages.map((pkg) => (
        <option key={pkg.id} value={pkg.id}>
          {pkg.name}
        </option>
      ))}
    </Select>
  );
}

export function LeasePackageSummary({
  template,
  className,
}: {
  template: LeasePackageTemplate | null | undefined;
  className?: string;
}) {
  if (!template) return null;

  const items = [
    { label: 'Lease Term', value: formatTermLabel(template.termMonths) },
    { label: 'Deposit', value: formatDepositLabel(template.depositMonths) },
    { label: 'Advance', value: formatAdvanceLabel(template.advanceMonths) },
    { label: 'Grace Period', value: formatGraceLabel(template.gracePeriodDays) },
    { label: 'Penalty Type', value: formatPenaltyTypeLabel(template.penaltyType) },
    {
      label: 'Penalty Fee',
      value: formatPenaltyFeeLabel(template.penaltyType, template.penaltyFee),
    },
  ];

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-[#F7F8FA] px-4 py-3',
        className
      )}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">
        Lease Template Summary
      </p>
      <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-baseline justify-between gap-3 text-sm"
          >
            <dt className="text-gray-500">{item.label}</dt>
            <dd className="font-semibold text-gray-900">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
