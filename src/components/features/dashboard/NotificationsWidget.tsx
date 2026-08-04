'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  ArrowRight,
  X,
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  category?: string | null;
  title: string;
  message: string;
  priority: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

/** Prefer actionable / alert-like notifications over generic activity echoes. */
const ACTIONABLE_CATEGORIES = new Set([
  'payments',
  'invoices',
  'leases',
  'maintenance',
  'utilities',
  'documents',
  'tenants',
  'system',
]);

export default function NotificationsWidget() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/notifications?limit=20', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        const mapped: Notification[] = (data.data.items || []).map(
          (n: {
            id: string;
            actionType?: string;
            category?: string | null;
            title: string;
            body: string;
            priority?: string;
            isRead: boolean;
            link?: string | null;
            createdAt: string;
          }) => ({
            id: n.id,
            type: n.actionType || 'info',
            category: n.category,
            title: n.title,
            message: n.body,
            priority: n.priority || 'normal',
            isRead: n.isRead,
            link: n.link,
            createdAt: n.createdAt,
          })
        );

        // Prefer unread + actionable; fall back to recent unread/any
        const actionable = mapped.filter(
          (n) =>
            !n.isRead &&
            (n.priority === 'urgent' ||
              n.priority === 'high' ||
              (n.category && ACTIONABLE_CATEGORIES.has(n.category.toLowerCase())))
        );
        const unread = mapped.filter((n) => !n.isRead);
        const preferred =
          actionable.length > 0
            ? actionable
            : unread.length > 0
              ? unread
              : mapped;

        setNotifications(preferred.slice(0, 6));
        setUnreadCount(data.data.unreadCount || 0);
      } else {
        console.error('API returned error:', data.error);
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const dismissNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'normal':
        return <Info className="h-4 w-4 text-blue-600" />;
      case 'low':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading && notifications.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-gray-900 flex items-center">
            <Bell className="h-4 w-4 mr-2 text-blue-600" />
            Notifications
          </h3>
        </div>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center min-w-0">
          <h3 className="text-base font-bold text-gray-900 flex items-center">
            <Bell className="h-4 w-4 mr-2 text-blue-600" />
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {unreadCount}
            </span>
          )}
        </div>
        <Link
          href="/admin/notifications"
          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center shrink-0"
        >
          View all <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
        </Link>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No alerts right now</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {notifications.map((notification) => {
            const inner = (
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <div className="mt-0.5 shrink-0">
                  {getPriorityIcon(notification.priority)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900 line-clamp-2">
                    {notification.title || notification.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatTime(notification.createdAt)}
                  </p>
                </div>
              </div>
            );

            return (
              <div
                key={notification.id}
                className={`group flex items-start gap-1 rounded-lg border p-2.5 ${
                  !notification.isRead
                    ? 'border-blue-100 bg-blue-50/40'
                    : 'border-gray-100 bg-gray-50/50'
                }`}
              >
                {notification.link ? (
                  <Link href={notification.link} className="flex-1 min-w-0">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
                <button
                  type="button"
                  onClick={() => dismissNotification(notification.id)}
                  className="shrink-0 rounded p-1 text-gray-400 opacity-0 transition hover:bg-white hover:text-gray-700 group-hover:opacity-100"
                  title="Dismiss"
                  aria-label="Dismiss notification"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
