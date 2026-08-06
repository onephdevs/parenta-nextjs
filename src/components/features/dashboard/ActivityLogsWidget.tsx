'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Activity, ArrowRight } from 'lucide-react';

interface ActivityLog {
  id: string;
  action: string;
  description?: string;
  createdAt: string;
  user: string;
}

export default function ActivityLogsWidget() {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchActivityLogs();
    const interval = setInterval(fetchActivityLogs, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchActivityLogs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/activity?limit=8', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setActivityLogs(
          (data.data.items || []).map(
            (item: {
              id: string;
              actionType: string;
              createdAt: string;
              actorName: string;
              description: string;
            }) => ({
              id: item.id,
              action: item.actionType,
              createdAt: item.createdAt,
              user: item.actorName,
              description: item.description,
            })
          )
        );
      } else {
        console.error('API returned error:', data.error);
        setActivityLogs([]);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      setActivityLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center text-base font-bold text-gray-900">
          <Activity className="mr-2 h-4 w-4 shrink-0 text-indigo-600" />
          <span className="truncate">Activity log</span>
        </h3>
        <Link
          href="/admin/activity"
          className="flex shrink-0 items-center text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          Full log <ArrowRight className="ml-0.5 h-3.5 w-3.5" />
        </Link>
      </div>

      {isLoading && activityLogs.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      ) : activityLogs.length === 0 ? (
        <div className="py-5 text-center text-gray-500">
          <Activity className="mx-auto mb-2 h-7 w-7 text-gray-300" />
          <p className="text-sm">No recent activity</p>
        </div>
      ) : (
        <ul className="max-h-64 space-y-1 overflow-x-hidden overflow-y-auto">
          {activityLogs.map((log) => (
            <li key={log.id} className="min-w-0">
              <Link
                href={`/admin/activity?id=${log.id}`}
                className="block min-w-0 rounded-lg px-1.5 py-1.5 transition hover:bg-gray-50"
              >
                <p className="break-words text-sm leading-snug text-gray-900 [overflow-wrap:anywhere]">
                  {log.description || log.action}
                </p>
                <p className="mt-0.5 truncate text-xs text-gray-500">
                  {log.user} · {formatTime(log.createdAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
