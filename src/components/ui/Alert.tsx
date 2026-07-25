'use client';

import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const variantStyles: Record<AlertVariant, string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  danger: 'bg-red-50 border-red-200 text-red-800',
};

export function Alert({
  variant = 'info',
  title,
  children,
  onDismiss,
  className,
}: AlertProps) {
  const role = variant === 'danger' || variant === 'warning' ? 'alert' : 'status';

  return (
    <div
      role={role}
      className={cn('rounded-md border p-4', variantStyles[variant], className)}
    >
      <div className="flex">
        <div className="flex-1">
          {title && <h3 className="text-sm font-medium">{title}</h3>}
          <div className={cn('text-sm', title && 'mt-1')}>{children}</div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="ml-3 text-current opacity-60 hover:opacity-100"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
