'use client';

import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { FieldSize } from './Input';

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: FieldSize;
  isDisabled?: boolean;
  isInvalid?: boolean;
  className?: string;
}

const sizeStyles: Record<FieldSize, string> = {
  sm: 'px-2.5 py-1.5 text-sm',
  md: 'px-3 py-2 text-sm',
  lg: 'px-3 py-2.5 text-base',
};

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ size = 'md', isDisabled, disabled, isInvalid, className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        disabled={Boolean(isDisabled ?? disabled)}
        aria-invalid={isInvalid || undefined}
        className={cn(
          'w-full rounded-md border bg-white text-gray-900 shadow-sm',
          'focus:outline-none focus:ring-2 focus:border-transparent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isInvalid
            ? 'border-red-300 focus:ring-red-500'
            : 'border-gray-300 focus:ring-purple-500',
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = 'Select';

export { Select };
