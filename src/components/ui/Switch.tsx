'use client';

import { ButtonHTMLAttributes, forwardRef, ReactNode, useId } from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'children'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  isDisabled?: boolean;
  className?: string;
}

const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      checked,
      onCheckedChange,
      label,
      description,
      isDisabled,
      disabled,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const switchId = id ?? generatedId;
    const blocked = Boolean(isDisabled ?? disabled);

    const control = (
      <button
        ref={ref}
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={blocked}
        onClick={() => {
          if (!blocked) onCheckedChange(!checked);
        }}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-gray-900' : 'bg-gray-200',
          !label && !description && className
        )}
        {...props}
        aria-label={
          typeof label === 'string'
            ? label
            : (props['aria-label'] as string | undefined)
        }
      >
        <span
          aria-hidden="true"
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    );

    if (!label && !description) {
      return control;
    }

    return (
      <div
        className={cn(
          'flex items-start justify-between gap-4',
          blocked && 'opacity-60',
          className
        )}
      >
        <div className="min-w-0 flex-1">
          {label && (
            <label htmlFor={switchId} className="block text-sm font-medium text-gray-900">
              {label}
            </label>
          )}
          {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
        </div>
        {control}
      </div>
    );
  }
);

Switch.displayName = 'Switch';

export { Switch };
