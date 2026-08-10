'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useTenantTheme } from '@/hooks/useTenantTheme';
import { cn } from '@/lib/utils';

interface InboxItem {
  id: string;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export function TenantInboxPreview({ className }: { className?: string }) {
  const theme = useTenantTheme();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=5', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;
      setItems(data.data.items || []);
      setUnreadCount(Number(data.data.unreadCount || 0));
    } catch {
      // ignore transient inbox errors
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(id);
  }, [load]);

  if (unreadCount === 0 && items.length === 0) return null;

  const unread = items.filter((i) => !i.isRead).slice(0, 3);
  const preview = unread.length > 0 ? unread : items.slice(0, 2);
  if (preview.length === 0) return null;

  return (
    <section className={cn(theme.cardPad, className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bell className={cn('h-4 w-4', theme.iconMoney)} strokeWidth={1.75} />
          <h2 className={theme.sectionTitle}>Updates</h2>
          {unreadCount > 0 && (
            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
              {unreadCount} new
            </span>
          )}
        </div>
        <Link
          href="/tenant/maintenance"
          className="text-xs text-emerald-600 hover:text-emerald-500"
        >
          Open inbox
        </Link>
      </div>
      <ul className="space-y-2.5">
        {preview.map((item) => (
          <li key={item.id}>
            <Link
              href={item.link || '/tenant/maintenance'}
              className="block rounded-lg border border-transparent px-1 py-1 transition hover:border-gray-200"
            >
              <p className={cn('text-sm font-medium', theme.listValue)}>{item.title}</p>
              <p className={cn('line-clamp-2 text-xs', theme.subtle)}>{item.body}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
