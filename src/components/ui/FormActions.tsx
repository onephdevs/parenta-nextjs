'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button, type ButtonVariant } from './Button';

export interface FormActionsProps {
  /** Cancel / secondary action */
  onCancel?: () => void;
  cancelLabel?: string;
  cancelDisabled?: boolean;
  /** Primary action — omit when using custom `children` only */
  primaryLabel?: string;
  onPrimary?: () => void;
  primaryType?: 'button' | 'submit';
  primaryLoading?: boolean;
  primaryDisabled?: boolean;
  primaryVariant?: ButtonVariant;
  /** Associate submit button with an external form id */
  form?: string;
  /** Extra controls between cancel and primary (or replace defaults when cancel/primary omitted) */
  children?: ReactNode;
  align?: 'start' | 'end' | 'between';
  className?: string;
}

const alignStyles = {
  start: 'justify-start',
  end: 'justify-end',
  between: 'justify-between',
} as const;

/**
 * Shared Cancel / Save (or custom) footer for forms and modals.
 * Presentational only — wire handlers from the feature.
 */
export function FormActions({
  onCancel,
  cancelLabel = 'Cancel',
  cancelDisabled,
  primaryLabel,
  onPrimary,
  primaryType = 'submit',
  primaryLoading,
  primaryDisabled,
  primaryVariant = 'primary',
  form,
  children,
  align = 'end',
  className,
}: FormActionsProps) {
  const showCancel = Boolean(onCancel);
  const showPrimary = Boolean(primaryLabel);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2',
        alignStyles[align],
        className
      )}
    >
      {showCancel && (
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          isDisabled={cancelDisabled || primaryLoading}
        >
          {cancelLabel}
        </Button>
      )}
      {children}
      {showPrimary && (
        <Button
          type={primaryType}
          form={form}
          variant={primaryVariant}
          isLoading={primaryLoading}
          isDisabled={primaryDisabled}
          onClick={primaryType === 'button' ? onPrimary : undefined}
        >
          {primaryLabel}
        </Button>
      )}
    </div>
  );
}
