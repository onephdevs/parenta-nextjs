'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ActionDropdownItem {
  id: string;
  label: string;
  icon?: ReactNode;
  tone?: 'default' | 'danger' | 'accent';
  href?: string;
  onSelect?: () => void;
  disabled?: boolean;
}

export interface ActionDropdownProps {
  label: string;
  items: ActionDropdownItem[];
  trigger?: 'outline' | 'solid';
  className?: string;
  align?: 'left' | 'right';
}

const toneClass: Record<NonNullable<ActionDropdownItem['tone']>, string> = {
  default: 'text-gray-900',
  danger: 'text-red-600',
  accent: 'text-emerald-700',
};

export function ActionDropdown({
  label,
  items,
  trigger = 'outline',
  className,
  align = 'left',
}: ActionDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors',
          trigger === 'solid'
            ? 'bg-gray-900 text-white hover:bg-black'
            : 'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50'
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 shrink-0 opacity-70', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className={cn(
            'absolute z-50 mt-1.5 w-max min-w-full overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-md',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {items.map((item) => {
            const content = (
              <>
                {item.icon}
                <span className="whitespace-nowrap">{item.label}</span>
              </>
            );
            const itemClass = cn(
              'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-medium text-gray-900 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50',
              item.tone ? toneClass[item.tone] : null
            );

            if (item.href && !item.disabled) {
              return (
                <a
                  key={item.id}
                  role="menuitem"
                  href={item.href}
                  className={itemClass}
                  onClick={() => setOpen(false)}
                >
                  {content}
                </a>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={itemClass}
                onClick={() => {
                  item.onSelect?.();
                  setOpen(false);
                }}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
