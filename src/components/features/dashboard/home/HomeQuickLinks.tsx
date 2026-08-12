'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Wallet,
  Zap,
  UserPlus,
  Wrench,
  PiggyBank,
  Link2,
  X,
  type LucideIcon,
} from 'lucide-react';
import type {
  NeedsAttentionCard,
  NeedsAttentionItem,
} from '@/lib/services/needs-attention-service';
import type { PinnedQuickLink } from './home-utils';

interface QuickLinkCard {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  count: number;
  urgency?: NeedsAttentionItem['urgency'];
  icon: LucideIcon;
  wrap: string;
  alwaysShow: boolean;
}

const BOARD_LINKS: QuickLinkCard[] = [
  {
    id: 'board-inquiries',
    title: 'Inquiries',
    subtitle: 'Onboarding board',
    href: '/admin/tasks?board=onboarding',
    count: 0,
    icon: UserPlus,
    wrap: 'bg-blue-50 text-blue-600',
    alwaysShow: true,
  },
  {
    id: 'board-billing',
    title: 'Rent Payment',
    subtitle: 'Rent chase board',
    href: '/admin/tasks?board=payments',
    count: 0,
    icon: Wallet,
    wrap: 'bg-red-50 text-red-600',
    alwaysShow: true,
  },
  {
    id: 'board-expenses',
    title: 'Electricity, Water & Expense',
    subtitle: 'Building bills board',
    href: '/admin/tasks?board=expenses',
    count: 0,
    icon: Zap,
    wrap: 'bg-amber-50 text-amber-600',
    alwaysShow: true,
  },
  {
    id: 'board-maintenance',
    title: 'Maintenance',
    subtitle: 'Maintenance board',
    href: '/admin/tasks?board=maintenance',
    count: 0,
    icon: Wrench,
    wrap: 'bg-gray-100 text-gray-700',
    alwaysShow: true,
  },
];

const BOARD_ATTENTION_KEY: Record<string, NeedsAttentionCard['key']> = {
  'board-inquiries': 'inquiries',
  'board-billing': 'payments',
  'board-expenses': 'utilities',
  'board-maintenance': 'maintenance',
};

const EXTRA_META: Partial<
  Record<NeedsAttentionCard['key'], { icon: LucideIcon; wrap: string }>
> = {
  deposits: { icon: PiggyBank, wrap: 'bg-violet-50 text-violet-600' },
  deposit_funded: { icon: Wallet, wrap: 'bg-orange-50 text-orange-600' },
};

function highestUrgency(
  items: NeedsAttentionItem[]
): NeedsAttentionItem['urgency'] | undefined {
  if (items.some((item) => item.urgency === 'late')) return 'late';
  if (items.some((item) => item.urgency === 'soon')) return 'soon';
  if (items.length > 0) return 'normal';
  return undefined;
}

function buildCards(cards: NeedsAttentionCard[]): QuickLinkCard[] {
  const byKey = new Map(cards.map((card) => [card.key, card]));
  const merged = BOARD_LINKS.map((board) => {
    const attention = byKey.get(BOARD_ATTENTION_KEY[board.id]);
    if (!attention) return board;
    const preview = attention.items[0];
    return {
      ...board,
      count: attention.count,
      urgency: highestUrgency(attention.items),
      subtitle:
        attention.count > 0
          ? preview?.meta || preview?.subtitle || `${attention.count} need attention`
          : board.subtitle,
    };
  });

  const extras = cards
    .filter((card) => !Object.values(BOARD_ATTENTION_KEY).includes(card.key) && card.count > 0)
    .map((card) => {
      const meta = EXTRA_META[card.key] || { icon: Link2, wrap: 'bg-slate-100 text-slate-600' };
      const preview = card.items[0];
      return {
        id: `attention-${card.key}`,
        title: card.title,
        subtitle: preview?.meta || preview?.subtitle || `${card.count} need attention`,
        href: card.viewAllHref,
        count: card.count,
        urgency: highestUrgency(card.items),
        icon: meta.icon,
        wrap: meta.wrap,
        alwaysShow: false,
      };
    });

  return [...merged, ...extras];
}

function badgeClass(urgency?: NeedsAttentionItem['urgency']) {
  if (urgency === 'late') return 'bg-red-500 text-white';
  if (urgency === 'soon') return 'bg-amber-500 text-white';
  return 'bg-slate-800 text-white';
}

function subtitleClass(urgency?: NeedsAttentionItem['urgency']) {
  if (urgency === 'late') return 'text-red-600';
  if (urgency === 'soon') return 'text-amber-600';
  return 'text-gray-500';
}

export default function HomeQuickLinks({
  cards,
  isLoading,
  pinned,
  onRemovePinned,
}: {
  cards: NeedsAttentionCard[];
  isLoading: boolean;
  pinned: PinnedQuickLink[];
  onRemovePinned: (id: string) => void;
}) {
  const links = useMemo(() => buildCards(cards), [cards]);

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-[72px] w-[220px] animate-pulse rounded-xl border border-gray-200 bg-white"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <Link
            key={link.id}
            href={link.href}
            className="relative flex w-[220px] items-center gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-sm transition hover:border-gray-300 hover:shadow"
          >
            <span className="relative shrink-0">
              <span
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${link.wrap}`}
              >
                <Icon className="h-4 w-4" />
              </span>
              {link.count > 0 && (
                <span
                  className={`absolute -right-1.5 -top-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none ${badgeClass(
                    link.urgency
                  )}`}
                >
                  {link.count > 99 ? '99+' : link.count}
                </span>
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-gray-900">
                {link.title}
              </span>
              <span className={`block truncate text-xs ${subtitleClass(link.urgency)}`}>
                {link.subtitle}
              </span>
            </span>
          </Link>
        );
      })}
      {pinned.map((link) => (
        <div
          key={link.id}
          className="group relative flex w-[220px] items-center gap-3 rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-sm transition hover:border-gray-300 hover:shadow"
        >
          <Link href={link.href} className="flex min-w-0 flex-1 items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Link2 className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-gray-900">
                {link.title}
              </span>
              <span className="block truncate text-xs text-gray-500">{link.href}</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => onRemovePinned(link.id)}
            className="absolute right-2 top-2 rounded p-0.5 text-gray-300 opacity-0 transition hover:bg-gray-100 hover:text-gray-700 group-hover:opacity-100"
            title="Unpin"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
