'use client';

import { LabelHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Label({ required, children, className, ...props }: LabelProps) {
  return (
    <label
      className={cn('block text-sm font-medium text-gray-900', className)}
      aria-required={required || undefined}
      {...props}
    >
      {children}
      {required ? (
        <span className="ml-1 font-semibold !text-red-600" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );
}
