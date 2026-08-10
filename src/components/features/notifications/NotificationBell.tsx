'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

interface InboxItem {
  id: string;
  category: string | null;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

function formatRelative(dateString: string): string {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function isBenignFetchError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'AbortError') return true;
  // Dev HMR / tab sleep / transient network often surfaces as this TypeError.
  return error.name === 'TypeError' && /failed to fetch/i.test(error.message);
}

const PANEL_WIDTH = 384; // w-96
const POLL_MS = 30000;

export function NotificationBell({
  variant = 'admin',
}: {
  variant?: 'admin' | 'tenant';
}) {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);
  const isTenant = variant === 'tenant';

  const fetchInbox = useCallback(async (opts?: { showLoading?: boolean }) => {
    if (sessionStatus !== 'authenticated') return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }
    if (inFlightRef.current) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    inFlightRef.current = true;

    try {
      if (opts?.showLoading) setLoading(true);
      const res = await fetch('/api/notifications?limit=10', {
        credentials: 'include',
        signal: controller.signal,
        cache: 'no-store',
      });
      if (controller.signal.aborted) return;
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setItems(data.data.items || []);
        setUnreadCount(data.data.unreadCount || 0);
      }
    } catch (error) {
      // Never surface transient network/HMR/abort noise to the console overlay.
      if (!isBenignFetchError(error) && process.env.NODE_ENV === 'development') {
        console.warn('Notifications inbox unavailable', error);
      }
    } finally {
      if (abortRef.current === controller) {
        inFlightRef.current = false;
      }
      if (opts?.showLoading && !controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [sessionStatus]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;

    void fetchInbox({ showLoading: true });

    const id = window.setInterval(() => {
      void fetchInbox();
    }, POLL_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void fetchInbox();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
      abortRef.current?.abort();
    };
  }, [fetchInbox, sessionStatus]);

  const updatePanelPosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const gap = 8;
    const width = Math.min(PANEL_WIDTH, window.innerWidth - 16);
    let left = rect.right - width;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    setPanelStyle({
      position: 'fixed',
      top: rect.bottom + gap,
      left,
      width,
      zIndex: 200,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
    const onResize = () => updatePanelPosition();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        rootRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        credentials: 'include',
      });
      setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      if (!isBenignFetchError(error)) {
        console.error('Failed to mark notifications read', error);
      }
    }
  };

  const openItem = async (item: InboxItem) => {
    if (!item.isRead) {
      try {
        await fetch(`/api/notifications/${item.id}/read`, {
          method: 'PATCH',
          credentials: 'include',
        });
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, isRead: true } : i))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (error) {
        if (!isBenignFetchError(error)) {
          console.error('Failed to mark notification read', error);
        }
      }
    }
    setOpen(false);
    if (item.link) router.push(item.link);
  };

  const panel = open && mounted
    ? createPortal(
        <div
          ref={panelRef}
          style={panelStyle}
          className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
          role="dialog"
          aria-label="Notifications"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900">Notifications</p>
              {unreadCount > 0 && (
                <Badge tone="danger" size="sm">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className={cn(
                  'text-xs font-medium hover:underline',
                  isTenant ? 'text-emerald-700' : 'text-purple-700'
                )}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-14 animate-pulse rounded bg-gray-100" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="No notifications"
                  description={
                    isTenant
                      ? 'Maintenance updates and office messages will show up here.'
                      : 'Activity you care about will show up here.'
                  }
                />
              </div>
            ) : (
              <ul>
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => openItem(item)}
                      className={cn(
                        'w-full border-b border-gray-50 px-4 py-3 text-left hover:bg-gray-50',
                        !item.isRead && (isTenant ? 'bg-emerald-50/70' : 'bg-purple-50/60')
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900">{item.title}</p>
                        <span className="shrink-0 text-[11px] text-gray-500">
                          {formatRelative(item.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">{item.body}</p>
                      {item.category && (
                        <span className="mt-1 inline-block text-[10px] uppercase tracking-wide text-gray-500">
                          {item.category}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-2 border-t border-gray-100 px-3 py-2">
            {isTenant ? (
              <Link
                href="/tenant/maintenance"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                <Button type="button" variant="outline" size="sm" className="w-full">
                  Maintenance
                </Button>
              </Link>
            ) : (
              <>
                <Link
                  href="/admin/activity"
                  className="flex-1"
                  onClick={() => setOpen(false)}
                >
                  <Button type="button" variant="outline" size="sm" className="w-full">
                    Recent activity
                  </Button>
                </Link>
                <Link
                  href="/admin/settings?tab=notifications"
                  className="flex-1"
                  onClick={() => setOpen(false)}
                >
                  <Button type="button" variant="ghost" size="sm" className="w-full">
                    Preferences
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void fetchInbox({ showLoading: items.length === 0 });
        }}
        className="relative rounded-md p-2 text-gray-900 hover:bg-gray-100 hover:text-gray-900"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {panel}
    </div>
  );
}
