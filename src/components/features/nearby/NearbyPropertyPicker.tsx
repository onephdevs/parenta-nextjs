'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Building2, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NearbyPropertyOption {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  address: string;
  availableUnits: number;
  latitude: number | null;
  longitude: number | null;
}

interface NearbyPropertyPickerProps {
  properties: NearbyPropertyOption[];
  value: string;
  onChange: (buildingId: string) => void;
  className?: string;
}

function locationLine(p: NearbyPropertyOption): string {
  const parts = [p.city, p.state].filter(Boolean);
  if (parts.length) return parts.join(', ');
  return p.address || '';
}

export function NearbyPropertyPicker({
  properties,
  value,
  onChange,
  className,
}: NearbyPropertyPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = properties.find((p) => p.id === value) ?? properties[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!selected) return null;

  return (
    <div ref={rootRef} className={cn('relative min-w-0', className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'group flex w-full items-center gap-3 rounded-2xl border bg-white px-3.5 py-3 text-left shadow-sm transition',
          open
            ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20'
            : 'border-slate-300 hover:border-slate-400 hover:shadow-md'
        )}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-white">
          <Building2 className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
            Property
          </span>
          <span className="mt-0.5 block truncate text-sm font-semibold text-[#111827]">
            {selected.name}
          </span>
          {locationLine(selected) && (
            <span className="mt-0.5 block truncate text-xs text-[#6B7280]">
              {locationLine(selected)}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'h-5 w-5 shrink-0 text-[#111827] transition',
            open && 'rotate-180'
          )}
          aria-hidden
        />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Properties"
          className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl"
        >
          {properties.map((property) => {
            const isActive = property.id === selected.id;
            return (
              <li key={property.id} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(property.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition',
                    isActive
                      ? 'bg-[#EFF6FF] text-[#111827]'
                      : 'text-[#111827] hover:bg-slate-50'
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      isActive
                        ? 'bg-[#2563EB] text-white'
                        : 'bg-slate-100 text-[#6B7280]'
                    )}
                  >
                    <Building2 className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {property.name}
                    </span>
                    {locationLine(property) && (
                      <span className="mt-0.5 block truncate text-xs text-[#6B7280]">
                        {locationLine(property)}
                      </span>
                    )}
                    {property.availableUnits > 0 && (
                      <span className="mt-1 inline-flex rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                        {property.availableUnits} available
                      </span>
                    )}
                  </span>
                  {isActive && (
                    <Check className="mt-1 h-4 w-4 shrink-0 text-[#2563EB]" aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
