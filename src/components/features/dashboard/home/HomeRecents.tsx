'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Pencil,
  Wrench,
} from 'lucide-react';
import {
  CATEGORY_DEFAULTS,
  getActionTitle,
  type ActivityCategory,
} from '@/lib/services/activity-taxonomy';
import { relativeTime } from './home-utils';

interface ActivityItem {
  id: string;
  actorName: string;
  actionType: string;
  category: string;
  entityLabel?: string | null;
  description: string;
  link?: string | null;
  createdAt: string;
}

const CATEGORY_TONE: Record<string, string> = {
  payments: 'bg-emerald-50 text-emerald-700',
  invoices: 'bg-blue-50 text-blue-700',
  maintenance: 'bg-amber-50 text-amber-800',
  tenants: 'bg-violet-50 text-violet-700',
  leases: 'bg-sky-50 text-sky-700',
  utilities: 'bg-yellow-50 text-yellow-800',
  expenses: 'bg-orange-50 text-orange-700',
  documents: 'bg-slate-100 text-slate-700',
  buildings: 'bg-indigo-50 text-indigo-700',
  assets: 'bg-teal-50 text-teal-700',
  system: 'bg-gray-100 text-gray-600',
};

function actionVerb(actionType: string): string {
  const verb = actionType.split('.')[1] || actionType;
  return verb.replace(/_/g, ' ');
}

function StatusIcon({ actionType }: { actionType: string }) {
  const verb = (actionType.split('.')[1] || '').toLowerCase();
  if (verb.includes('complet') || verb.includes('paid') || verb.includes('recorded')) {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  }
  if (verb.includes('delet') || verb.includes('cancel')) {
    return <Trash2 className="h-4 w-4 text-red-500" />;
  }
  if (verb.includes('creat') || verb.includes('requested')) {
    return <Plus className="h-4 w-4 text-blue-500" />;
  }
  if (actionType.startsWith('maintenance')) {
    return <Wrench className="h-4 w-4 text-amber-500" />;
  }
  if (verb.includes('updat') || verb.includes('changed') || verb.includes('moved')) {
    return <Pencil className="h-4 w-4 text-sky-500" />;
  }
  return <Circle className="h-4 w-4 text-gray-400" />;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
}

export default function HomeRecents({ filter }: { filter: 'all' | ActivityCategory }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        const params = new URLSearchParams({ limit: '12' });
        if (filter !== 'all') params.set('category', filter);
        const res = await fetch(`/api/activity?${params.toString()}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        if (!cancelled) setItems(json.success ? json.data.items || [] : []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [filter]);

  return (
    <div>
      {isLoading && items.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
          <Activity className="mx-auto mb-2 h-6 w-6 text-gray-300" />
          No recent activity
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          {items.map((item) => {
            const href = item.link || `/admin/activity?id=${item.id}`;
            const title = item.entityLabel?.trim() || getActionTitle(item.actionType);
            const categoryLabel =
              item.category in CATEGORY_DEFAULTS
                ? CATEGORY_DEFAULTS[item.category as ActivityCategory].label
                : item.category;
            const verb = actionVerb(item.actionType);
            return (
              <li key={item.id}>
                <Link
                  href={href}
                  className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-gray-50"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center">
                    <StatusIcon actionType={item.actionType} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-gray-900">
                      <span className="font-medium">{title}</span>
                      {item.entityLabel ? (
                        <span className="text-gray-500"> · {getActionTitle(item.actionType)}</span>
                      ) : null}
                    </span>
                  </span>
                  <span className="hidden shrink-0 text-xs text-gray-400 sm:block">
                    {relativeTime(item.createdAt)}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span
                      className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium capitalize ${
                        CATEGORY_TONE[item.category] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {categoryLabel}
                    </span>
                    <span className="inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium capitalize text-gray-600">
                      {verb}
                    </span>
                    <span
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700"
                      title={item.actorName}
                    >
                      {initials(item.actorName)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3">
        <Link href="/admin/activity" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          Show all
        </Link>
      </div>
    </div>
  );
}
