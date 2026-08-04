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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-gray-900 flex items-center">
          <Activity className="h-4 w-4 mr-2 text-indigo-600" />
          Activity log
        </h3>
        <Link
          href="/admin/activity"
          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center"
        >
          Full log <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
        </Link>
      </div>

      {isLoading && activityLogs.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : activityLogs.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No recent activity</p>
        </div>
      ) : (
        <ul className="space-y-2.5 max-h-64 overflow-y-auto">
          {activityLogs.map((log) => (
            <li key={log.id}>
              <Link
                href={`/admin/activity?id=${log.id}`}
                className="block rounded-lg -mx-1 px-1 py-1 hover:bg-gray-50 transition"
              >
                <p className="text-sm text-gray-900 line-clamp-2">
                  {log.description || log.action}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
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
