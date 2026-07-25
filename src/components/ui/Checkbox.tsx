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

    return (
      <label
        htmlFor={inputId}
        className={cn(
          'inline-flex items-center gap-2 text-sm text-gray-900',
          blocked && 'cursor-not-allowed opacity-50',
          className
        )}
      >
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          disabled={blocked}
          className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          {...props}
        />
        {label}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
