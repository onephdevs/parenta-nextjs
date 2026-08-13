'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EditableSectionCardProps {
  title: string;
  onEdit?: () => void;
  editHref?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function EditableSectionCard({
  title,
  onEdit,
  editHref,
  children,
  className,
  action,
}: EditableSectionCardProps) {
  const editControl = action ? (
    action
  ) : editHref ? (
    <Link
      href={editHref}
      className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800"
      aria-label={`Edit ${title}`}
    >
      <Pencil className="h-3.5 w-3.5" />
    </Link>
  ) : onEdit ? (
    <button
      type="button"
      onClick={onEdit}
      className="rounded-md border border-gray-200 p-1.5 text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800"
      aria-label={`Edit ${title}`}
    >
      <Pencil className="h-3.5 w-3.5" />
    </button>
  ) : null;

  return (
    <section className={cn('rounded-xl border border-gray-200 bg-white', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5">
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
        {editControl}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
