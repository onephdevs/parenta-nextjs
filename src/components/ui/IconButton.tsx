'use client';

import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type IconButtonVariant = 'ghost' | 'outline' | 'danger' | 'primary';
export type IconButtonSize = 'sm' | 'md';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  isDisabled?: boolean;
  isLoading?: boolean;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<IconButtonVariant, string> = {
  ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
  outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
  danger: 'text-red-600 hover:bg-red-50 hover:text-red-800',
  primary: 'text-[#111827] hover:bg-gray-100 hover:text-black',
};

const sizeStyles: Record<IconButtonSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
};

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      label,
      variant = 'ghost',
      size = 'md',
      isDisabled,
      disabled,
      isLoading = false,
      className,
      children,
      title,
      ...props
    },
    ref
  ) => {
    const blocked = Boolean(isDisabled ?? disabled) || isLoading;

    return (
      <button
        ref={ref}
        type={props.type ?? 'button'}
        aria-label={label}
        title={title ?? label}
        disabled={blocked}
        aria-busy={isLoading || undefined}
        className={cn(
          'inline-flex items-center justify-center rounded-md transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          children
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

export { IconButton };
