'use client';

import {
  InputHTMLAttributes,
  ButtonHTMLAttributes,
  forwardRef,
  useState,
} from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  isInvalid?: boolean;
}

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ className, isInvalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={isInvalid || undefined}
      className={cn(
        'w-full rounded-lg border bg-white px-4 py-3 text-sm text-gray-900 shadow-none',
        'placeholder:text-gray-400',
        'focus:outline-none focus:ring-2 focus:ring-[#2EC4B6]/focus:border-transparent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        isInvalid ? 'border-red-300' : 'border-gray-300',
        className
      )}
      {...props}
    />
  )
);
AuthField.displayName = 'AuthField';

export interface AuthPasswordFieldProps extends AuthFieldProps {
  toggleLabelShow?: string;
  toggleLabelHide?: string;
}

export const AuthPasswordField = forwardRef<HTMLInputElement, AuthPasswordFieldProps>(
  (
    {
      className,
      toggleLabelShow = 'Show password',
      toggleLabelHide = 'Hide password',
      ...props
    },
    ref
  ) => {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <AuthField
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={cn('pr-11', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
          aria-label={visible ? toggleLabelHide : toggleLabelShow}
          tabIndex={-1}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  }
);
AuthPasswordField.displayName = 'AuthPasswordField';

export function AuthPrimaryButton({
  children,
  isLoading,
  className,
  type = 'submit',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex w-full items-center justify-center rounded-lg bg-[#2EC4B6] px-4 py-3.5',
        'text-base font-semibold text-white transition hover:bg-[#26b3a6]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2EC4B6] focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-60',
        className
      )}
      disabled={Boolean(isLoading) || props.disabled}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        children
      )}
    </button>
  );
}
