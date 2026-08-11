'use client';

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Bold, Italic, Trash2 } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import {
  STICKY_COLORS,
  type AdminHomeSticky,
  type StickyColor,
} from '@/lib/admin-home-stickies-shared';

const COLOR_STYLES: Record<StickyColor, string> = {
  lavender: 'bg-[#EDE4FF] text-slate-800',
  sky: 'bg-[#D7ECFF] text-slate-800',
  pink: 'bg-[#F8D5E0] text-slate-800',
  mint: 'bg-[#D4F0E4] text-slate-800',
  peach: 'bg-[#FBE3D4] text-slate-800',
};

const COLOR_DOT: Record<StickyColor, string> = {
  lavender: 'bg-[#C4B0F5]',
  sky: 'bg-[#8EC8F5]',
  pink: 'bg-[#E8A0B8]',
  mint: 'bg-[#8ED4B5]',
  peach: 'bg-[#F0B894]',
};

function applyCommand(command: 'bold' | 'italic') {
  document.execCommand(command, false);
}

export default function HomeStickies({
  stickies,
  onChange,
}: {
  stickies: AdminHomeSticky[];
  onChange: Dispatch<SetStateAction<AdminHomeSticky[]>>;
}) {
  const { showError } = useNotifications();

  const patch = useCallback(
    async (id: string, payload: Partial<Pick<AdminHomeSticky, 'title' | 'body' | 'color'>>) => {
      const res = await fetch(`/api/admin/home/stickies/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save');
      }
      onChange((prev) => prev.map((s) => (s.id === id ? json.data : s)));
    },
    [onChange]
  );

  const remove = async (id: string) => {
    const res = await fetch(`/api/admin/home/stickies/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      showError(json.error || 'Failed to delete sticky');
      return;
    }
    onChange((prev) => prev.filter((s) => s.id !== id));
  };

  if (stickies.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
        Personal reminders for follow-ups and to-dos that aren&apos;t attached to a tenant or room
        yet. Click Add sticky to start.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {stickies.map((sticky) => (
        <StickyCard
          key={sticky.id}
          sticky={sticky}
          onPatch={patch}
          onDelete={() => void remove(sticky.id)}
        />
      ))}
    </div>
  );
}

function StickyCard({
  sticky,
  onPatch,
  onDelete,
}: {
  sticky: AdminHomeSticky;
  onPatch: (
    id: string,
    payload: Partial<Pick<AdminHomeSticky, 'title' | 'body' | 'color'>>
  ) => Promise<void>;
  onDelete: () => void;
}) {
  const { showError } = useNotifications();
  const [title, setTitle] = useState(sticky.title);
  const bodyRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTitle(sticky.title);
    if (bodyRef.current && bodyRef.current.innerHTML !== sticky.body) {
      bodyRef.current.innerHTML = sticky.body || '';
    }
  }, [sticky.id, sticky.title, sticky.body]);

  const scheduleSave = (payload: Partial<Pick<AdminHomeSticky, 'title' | 'body' | 'color'>>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onPatch(sticky.id, payload).catch((err) =>
        showError(err instanceof Error ? err.message : 'Failed to save sticky')
      );
    }, 500);
  };

  return (
    <article
      className={`flex min-h-[200px] flex-col rounded-xl p-4 shadow-sm ${COLOR_STYLES[sticky.color]}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {STICKY_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              title={color}
              onClick={() => void onPatch(sticky.id, { color })}
              className={`h-3.5 w-3.5 rounded-full ${COLOR_DOT[color]} ${
                sticky.color === color ? 'ring-2 ring-slate-500 ring-offset-1' : ''
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="rounded p-1 text-slate-500 hover:bg-black/5 hover:text-slate-800"
          title="Delete sticky"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          scheduleSave({ title: e.target.value });
        }}
        placeholder="Title"
        className="mb-2 w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
      />
      <div
        ref={bodyRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Write a reminder…"
        onInput={() => {
          scheduleSave({ body: bodyRef.current?.innerHTML || '' });
        }}
        className="min-h-[88px] flex-1 text-sm leading-relaxed outline-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]"
      />
      <div className="mt-3 flex items-center gap-1 text-slate-500">
        <button
          type="button"
          className="rounded p-1 hover:bg-black/5 hover:text-slate-800"
          title="Bold"
          onMouseDown={(e) => {
            e.preventDefault();
            applyCommand('bold');
            scheduleSave({ body: bodyRef.current?.innerHTML || '' });
          }}
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="rounded p-1 hover:bg-black/5 hover:text-slate-800"
          title="Italic"
          onMouseDown={(e) => {
            e.preventDefault();
            applyCommand('italic');
            scheduleSave({ body: bodyRef.current?.innerHTML || '' });
          }}
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}
