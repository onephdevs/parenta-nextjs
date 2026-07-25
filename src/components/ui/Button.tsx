'use client';

import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  /** @deprecated Prefer isLoading */
  loading?: boolean;
  isDisabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 focus-visible:ring-purple-500',
  secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400 focus-visible:ring-gray-400',
  outline: 'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 active:bg-gray-100 focus-visible:ring-purple-500',
  ghost: 'bg-transparent text-gray-900 hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-gray-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500',
  success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 focus-visible:ring-green-500',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading,
      loading,
      isDisabled,
      disabled,
      leftIcon,
      rightIcon,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const busy = Boolean(isLoading ?? loading);
    const blocked = Boolean(isDisabled ?? disabled) || busy;

    return (
      <button
        ref={ref}
        type={props.type ?? 'button'}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          variantStyles[variant],
          sizeStyles[size],
          busy && 'cursor-not-allowed opacity-70',
          className
        )}
        disabled={blocked}
        aria-busy={busy || undefined}
        {...props}
      >
        {busy ? (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          leftIcon
        )}
        {children}
        {!busy && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
