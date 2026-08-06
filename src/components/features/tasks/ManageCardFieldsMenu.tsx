'use client';

import { useEffect, useRef, useState } from 'react';
import { Settings2 } from 'lucide-react';
import type { PipelineBoardSlug } from '@/types/database';
import {
  CARD_FIELD_DEFS,
  type CardFieldKey,
  type CardFieldPair,
  saveCardFields,
} from '@/lib/pipeline/cardFields';

interface ManageCardFieldsMenuProps {
  boardSlug: PipelineBoardSlug;
  fields: CardFieldPair;
  onChange: (fields: CardFieldPair) => void;
}

export function ManageCardFieldsMenu({
  boardSlug,
  fields,
  onChange,
}: ManageCardFieldsMenuProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CardFieldPair>(fields);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft(fields);
  }, [fields]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (ref.current && target && !ref.current.contains(target)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function setSlot(index: 0 | 1, key: CardFieldKey) {
    const next: CardFieldPair = [...draft];
    next[index] = key;
    setDraft(next);
  }

  function apply() {
    saveCardFields(boardSlug, draft);
    onChange(draft);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
        title="Choose which two fields appear on every card"
      >
        <Settings2 className="h-4 w-4" />
        Manage Fields
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <p className="text-sm font-semibold text-gray-900">Card fields</p>
          <p className="mt-0.5 text-xs text-gray-500">
            Pick two fields shown on every card for this board.
          </p>

          <label className="mt-3 block text-xs font-medium text-gray-600">
            Field 1
            <select
              value={draft[0]}
              onChange={(e) => setSlot(0, e.target.value as CardFieldKey)}
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
            >
              {CARD_FIELD_DEFS.map((def) => (
                <option key={def.key} value={def.key}>
                  {def.label}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-2 block text-xs font-medium text-gray-600">
            Field 2
            <select
              value={draft[1]}
              onChange={(e) => setSlot(1, e.target.value as CardFieldKey)}
              className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
            >
              {CARD_FIELD_DEFS.map((def) => (
                <option key={def.key} value={def.key}>
                  {def.label}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
              onClick={apply}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
