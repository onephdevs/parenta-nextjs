'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Wallet,
  Zap,
  UserPlus,
  Wrench,
  PiggyBank,
  ArrowRight,
  Plus,
} from 'lucide-react';
import type {
  NeedsAttentionCard,
  NeedsAttentionItem,
  NeedsAttentionPayload,
} from '@/lib/services/needs-attention-service';
import CreateBillExpenseModal from './CreateBillExpenseModal';

const CARD_META: Record<
  NeedsAttentionCard['key'],
  {
    icon: React.ComponentType<{ className?: string }>;
    iconWrap: string;
    badge: string;
    empty: string;
  }
> = {
  inquiries: {
    icon: UserPlus,
    iconWrap: 'bg-blue-50 text-blue-600',
    badge: 'bg-blue-100 text-blue-700',
    empty: 'No new inquiries',
  },
  payments: {
    icon: Wallet,
    iconWrap: 'bg-red-50 text-red-600',
    badge: 'bg-red-100 text-red-700',
    empty: 'No payments due',
  },
  utilities: {
    icon: Zap,
    iconWrap: 'bg-amber-50 text-amber-600',
    badge: 'bg-amber-100 text-amber-700',
    empty: 'No utilities due',
  },
  maintenance: {
    icon: Wrench,
    iconWrap: 'bg-gray-100 text-gray-600',
    badge: 'bg-gray-200 text-gray-700',
    empty: 'No open requests',
  },
  deposits: {
    icon: PiggyBank,
    iconWrap: 'bg-violet-50 text-violet-600',
    badge: 'bg-violet-100 text-violet-700',
    empty: 'No empty deposit balances',
  },
  deposit_funded: {
    icon: Wallet,
    iconWrap: 'bg-orange-50 text-orange-600',
    badge: 'bg-orange-100 text-orange-700',
    empty: 'No deposit-funded payments',
  },
};

function urgencyClass(urgency?: NeedsAttentionItem['urgency']): string {
  if (urgency === 'late') return 'text-red-600';
  if (urgency === 'soon') return 'text-amber-600';
  return 'text-gray-500';
}

function formatUpdatedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Updated just now';
  if (mins < 60) return `Updated ${mins}m ago`;
  return `Updated ${d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}`;
}

function AttentionCard({
  card,
  onCreateUtility,
}: {
  card: NeedsAttentionCard;
  onCreateUtility?: () => void;
}) {
  const meta = CARD_META[card.key];
  const Icon = meta.icon;
  const isUtilities = card.key === 'utilities';

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.iconWrap}`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <h4 className="truncate text-sm font-semibold text-gray-900">{card.title}</h4>
        </div>
        <span
          className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${meta.badge}`}
        >
          {card.count}
        </span>
      </div>

      <div className="flex-1 space-y-3">
        {card.items.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">{meta.empty}</p>
        ) : (
          card.items.map((item) => (
            <div key={item.id}>
              <p className="truncate text-sm font-medium text-gray-900">{item.title}</p>
              <p className="truncate text-xs text-gray-500">
                {item.subtitle.split(' • ').map((part, i, parts) => {
                  const isLast = i === parts.length - 1;
                  const highlight =
                    isLast && (item.urgency === 'late' || item.urgency === 'soon');
                  return (
                    <span key={`${item.id}-${i}`}>
                      {i > 0 && ' • '}
                      <span className={highlight ? urgencyClass(item.urgency) : undefined}>
                        {part}
                      </span>
                    </span>
                  );
                })}
              </p>
              {item.meta && (
                <p className={`text-xs font-medium ${urgencyClass(item.urgency || 'soon')}`}>
                  {item.meta}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Link
          href={card.viewAllHref}
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          {card.viewAllLabel}
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Link>
        {isUtilities && onCreateUtility && (
          <button
            type="button"
            onClick={onCreateUtility}
            className="inline-flex items-center gap-1 rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Create
          </button>
        )}
      </div>
    </div>
  );
}

export default function NeedsAttentionWidget() {
  const [payload, setPayload] = useState<NeedsAttentionPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/admin/dashboard/needs-attention', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load');
      setPayload(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setPayload(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (cancelled) return;
      await load();
    }

    run();
    const interval = setInterval(() => {
      if (!cancelled) load();
    }, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [load]);

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-gray-900">Needs Attention</h3>
        <span className="text-xs text-gray-500">
          {payload ? formatUpdatedAt(payload.updatedAt) : isLoading ? 'Loading…' : ''}
        </span>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {isLoading && !payload ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-xl border border-gray-200 bg-white"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(payload?.cards || []).map((card) => (
            <AttentionCard
              key={card.key}
              card={card}
              onCreateUtility={
                card.key === 'utilities' ? () => setCreateOpen(true) : undefined
              }
            />
          ))}
        </div>
      )}

      <CreateBillExpenseModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          void load();
        }}
      />
    </section>
  );
}
