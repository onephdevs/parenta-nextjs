'use client';

import { Check, Clock, Lock } from 'lucide-react';
import { FormField } from '@/components/forms/FormField';
import { Input } from '@/components/ui/Input';
import { SectionCard } from '@/components/ui/SectionedFormShell';
import { cn } from '@/lib/utils';

export type DepositAmountType = 'months' | 'fixed' | 'percentage';

export interface BuildingDepositFormData {
  depositMonths: number | undefined;
  depositType: DepositAmountType;
  depositAmount: number | undefined;
  depositPercentage: number | undefined;
  advanceMonths: number | undefined;
  advanceType: DepositAmountType;
  advanceAmount: number | undefined;
  advancePercentage: number | undefined;
  utilityDepositAmount: number | undefined;
  depositValidityDays: number | undefined;
  depositRefundableAfterDays: number | undefined;
  minimumDepositAmount: number | undefined;
}

export const DEFAULT_BUILDING_DEPOSIT_FORM: BuildingDepositFormData = {
  depositMonths: 1,
  depositType: 'months',
  depositAmount: undefined,
  depositPercentage: undefined,
  advanceMonths: 1,
  advanceType: 'months',
  advanceAmount: undefined,
  advancePercentage: undefined,
  utilityDepositAmount: 0,
  depositValidityDays: 5,
  depositRefundableAfterDays: 5,
  minimumDepositAmount: 3000,
};

const TYPE_OPTIONS: { value: DepositAmountType; label: string }[] = [
  { value: 'months', label: 'Months of rent' },
  { value: 'fixed', label: 'Fixed amount' },
  { value: 'percentage', label: 'Percentage' },
];

function SegmentedControl({
  value,
  onChange,
  options,
  name,
}: {
  value: DepositAmountType;
  onChange: (next: DepositAmountType) => void;
  options: { value: DepositAmountType; label: string }[];
  name: string;
}) {
  return (
    <div
      className="inline-flex w-full flex-wrap gap-1 rounded-lg bg-gray-100 p-1 sm:w-auto"
      role="group"
      aria-label={name}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:flex-none',
              active
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function AffixedNumberInput({
  id,
  name,
  value,
  onChange,
  prefix,
  suffix,
  min,
  max,
  step,
  placeholder,
}: {
  id: string;
  name: string;
  value: number | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-gray-500">
          {prefix}
        </span>
      )}
      <Input
        type="number"
        id={id}
        name={name}
        min={min}
        max={max}
        step={step}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(prefix && 'pl-8', suffix && 'pr-16')}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-gray-500">
          {suffix}
        </span>
      )}
    </div>
  );
}

interface BuildingDepositFieldsProps {
  value: BuildingDepositFormData;
  onChange: (next: BuildingDepositFormData) => void;
}

export default function BuildingDepositFields({
  value,
  onChange,
}: BuildingDepositFieldsProps) {
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value: raw } = e.target;
    onChange({
      ...value,
      [name]: raw === '' ? undefined : parseFloat(raw),
    });
  };

  return (
    <div className="space-y-5">
      <SectionCard title="Deposit requirement">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Deposit type</p>
            <SegmentedControl
              name="depositType"
              value={value.depositType}
              options={TYPE_OPTIONS}
              onChange={(next) => onChange({ ...value, depositType: next })}
            />
          </div>

          {value.depositType === 'months' && (
            <FormField label="Months of rent" htmlFor="depositMonths">
              <AffixedNumberInput
                id="depositMonths"
                name="depositMonths"
                min={0}
                step={0.5}
                value={value.depositMonths}
                onChange={handleNumberChange}
                suffix="months"
                placeholder="e.g., 2"
              />
            </FormField>
          )}

          {value.depositType === 'fixed' && (
            <FormField label="Deposit amount" htmlFor="depositAmount">
              <AffixedNumberInput
                id="depositAmount"
                name="depositAmount"
                min={0}
                step={0.01}
                value={value.depositAmount}
                onChange={handleNumberChange}
                prefix="₱"
                placeholder="e.g., 9600"
              />
            </FormField>
          )}

          {value.depositType === 'percentage' && (
            <FormField label="Deposit percentage" htmlFor="depositPercentage">
              <AffixedNumberInput
                id="depositPercentage"
                name="depositPercentage"
                min={0}
                max={100}
                step={0.01}
                value={value.depositPercentage}
                onChange={handleNumberChange}
                suffix="%"
                placeholder="e.g., 50"
              />
            </FormField>
          )}

          <FormField
            label="Minimum deposit floor"
            htmlFor="minimumDepositAmount"
            hint="Applied if computed deposit is lower than this."
          >
            <AffixedNumberInput
              id="minimumDepositAmount"
              name="minimumDepositAmount"
              min={0}
              step={0.01}
              value={value.minimumDepositAmount}
              onChange={handleNumberChange}
              prefix="₱"
              placeholder="3000"
            />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard title="Advance payment">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Advance type</p>
            <SegmentedControl
              name="advanceType"
              value={value.advanceType}
              options={TYPE_OPTIONS}
              onChange={(next) => onChange({ ...value, advanceType: next })}
            />
          </div>

          {value.advanceType === 'months' && (
            <FormField label="Months of rent" htmlFor="advanceMonths">
              <AffixedNumberInput
                id="advanceMonths"
                name="advanceMonths"
                min={0}
                step={0.5}
                value={value.advanceMonths}
                onChange={handleNumberChange}
                suffix="months"
                placeholder="e.g., 1"
              />
            </FormField>
          )}

          {value.advanceType === 'fixed' && (
            <FormField label="Advance amount" htmlFor="advanceAmount">
              <AffixedNumberInput
                id="advanceAmount"
                name="advanceAmount"
                min={0}
                step={0.01}
                value={value.advanceAmount}
                onChange={handleNumberChange}
                prefix="₱"
                placeholder="e.g., 4800"
              />
            </FormField>
          )}

          {value.advanceType === 'percentage' && (
            <FormField label="Advance percentage" htmlFor="advancePercentage">
              <AffixedNumberInput
                id="advancePercentage"
                name="advancePercentage"
                min={0}
                max={100}
                step={0.01}
                value={value.advancePercentage}
                onChange={handleNumberChange}
                suffix="%"
                placeholder="e.g., 50"
              />
            </FormField>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Utility deposit & validity">
        <div className="space-y-5">
          <FormField label="Utility deposit amount" htmlFor="utilityDepositAmount">
            <AffixedNumberInput
              id="utilityDepositAmount"
              name="utilityDepositAmount"
              min={0}
              step={0.01}
              value={value.utilityDepositAmount}
              onChange={handleNumberChange}
              prefix="₱"
              placeholder="0"
            />
          </FormField>

          <div className="rounded-lg bg-gray-50 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium">
              <span className="inline-flex items-center gap-1.5 text-emerald-700">
                <Check className="h-3.5 w-3.5" />
                Lease starts
              </span>
              <span className="hidden h-px w-8 bg-emerald-300 sm:block" />
              <span className="inline-flex items-center gap-1.5 text-amber-700">
                <Clock className="h-3.5 w-3.5" />
                Refundable window ends
              </span>
              <span className="hidden h-px w-8 bg-amber-300 sm:block" />
              <span className="inline-flex items-center gap-1.5 text-red-600">
                <Lock className="h-3.5 w-3.5" />
                Non-refundable
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField label="Deposit validity" htmlFor="depositValidityDays">
              <AffixedNumberInput
                id="depositValidityDays"
                name="depositValidityDays"
                min={1}
                step={1}
                value={value.depositValidityDays}
                onChange={handleNumberChange}
                suffix="days"
                placeholder="5"
              />
            </FormField>
            <FormField label="Non-refundable after" htmlFor="depositRefundableAfterDays">
              <AffixedNumberInput
                id="depositRefundableAfterDays"
                name="depositRefundableAfterDays"
                min={1}
                step={1}
                value={value.depositRefundableAfterDays}
                onChange={handleNumberChange}
                suffix="days"
                placeholder="5"
              />
            </FormField>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
