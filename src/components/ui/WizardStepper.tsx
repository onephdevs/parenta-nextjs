'use client';

import { cn } from '@/lib/utils';

export interface WizardStep {
  id: string;
  label: string;
  shortLabel?: string;
}

export interface WizardStepperProps {
  steps: WizardStep[];
  currentStep: number;
  onStepClick?: (index: number) => void;
  className?: string;
}

/** Alfonso-style top progress bars for multi-step wizards. */
export function WizardStepper({
  steps,
  currentStep,
  onStepClick,
  className,
}: WizardStepperProps) {
  return (
    <nav aria-label="Progress" className={cn('w-full', className)}>
      <ol className="grid gap-3 sm:grid-cols-4 sm:gap-4">
        {steps.map((step, index) => {
          const reached = index <= currentStep;
          const active = index === currentStep;
          const clickable = Boolean(onStepClick) && index <= currentStep;

          return (
            <li key={step.id} className="min-w-0">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onStepClick?.(index)}
                className={cn(
                  'group flex w-full flex-col gap-2 text-left',
                  clickable && 'cursor-pointer',
                  !clickable && 'cursor-default'
                )}
              >
                <span
                  className={cn(
                    'h-1 w-full rounded-full transition-colors',
                    reached ? 'bg-violet-600' : 'bg-gray-200'
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    'text-[11px] font-semibold uppercase tracking-wide',
                    active ? 'text-gray-900' : 'text-gray-400'
                  )}
                >
                  Step {index + 1}:{' '}
                  <span className="normal-case tracking-normal">
                    {step.shortLabel || step.label}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
