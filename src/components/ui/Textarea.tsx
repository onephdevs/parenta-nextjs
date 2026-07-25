'use client';

import { TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { FieldSize } from './Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
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

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ size = 'md', isDisabled, disabled, isInvalid, className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        disabled={Boolean(isDisabled ?? disabled)}
        aria-invalid={isInvalid || undefined}
        className={cn(
          'w-full rounded-md border bg-white text-gray-900 shadow-sm',
          'placeholder:text-gray-400',
          'focus:outline-none focus:ring-2 focus:border-transparent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isInvalid
            ? 'border-red-300 focus:ring-red-500'
            : 'border-gray-300 focus:ring-purple-500',
          sizeStyles[size],
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
