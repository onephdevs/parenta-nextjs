'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/Label';

export interface FormFieldProps {
  label?: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-gray-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
