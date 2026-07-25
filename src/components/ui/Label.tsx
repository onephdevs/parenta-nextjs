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
      {...props}
    >
      {children}
      {required && <span className="ml-0.5 text-red-600">*</span>}
    </label>
  );
}
