'use client';

import { InputHTMLAttributes, forwardRef, ReactNode, useId } from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  isDisabled?: boolean;
  className?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, isDisabled, disabled, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const blocked = Boolean(isDisabled ?? disabled);

    // Do not set htmlFor when the input is nested inside the label — that can
    // double-toggle the control so clicks appear to do nothing.
    return (
      <label
        className={cn(
          'inline-flex cursor-pointer items-center gap-2 text-sm text-gray-900',
          blocked && 'cursor-not-allowed opacity-50',
          className
        )}
      >
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          disabled={blocked}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          {...props}
        />
        {label}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
