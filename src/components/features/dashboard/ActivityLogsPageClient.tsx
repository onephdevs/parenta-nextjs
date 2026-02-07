'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Plus, Edit, Trash2, Eye, User } from 'lucide-react';

interface ActivityLog {
  id: string;
  action: string;
  tableName: string;
  recordId?: string;
  createdAt: string;
  user: string;
}

export default function ActivityLogsPageClient() {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchActivityLogs();
  }, []);

  const fetchActivityLogs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/dashboard/activity-logs');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      if (data.success) {
        setActivityLogs(data.data.activityLogs || []);
      } else {
        setActivityLogs([]);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      setActivityLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'UPDATE':
        return <Edit className="h-4 w-4 text-blue-600" />;
      case 'DELETE':
        return <Trash2 className="h-4 w-4 text-red-600" />;
      case 'READ':
        return <Eye className="h-4 w-4 text-gray-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'text-green-700 bg-green-50';
      case 'UPDATE':
        return 'text-blue-700 bg-blue-50';
      case 'DELETE':
        return 'text-red-700 bg-red-50';
      case 'READ':
        return 'text-gray-700 bg-gray-50';
      default:
        return 'text-gray-700 bg-gray-50';
    }
  };

  const formatActionDescription = (action: string, tableName: string) => {
    const tableDisplay = tableName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
    switch (action) {
      case 'CREATE':
        return `Created ${tableDisplay}`;
      case 'UPDATE':
        return `Updated ${tableDisplay}`;
      case 'DELETE':
        return `Deleted ${tableDisplay}`;
      case 'READ':
        return `Viewed ${tableDisplay}`;
      default:
        return `${action} ${tableDisplay}`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
        <p className="mt-1 text-sm text-gray-600">
          {activityLogs.length} log{activityLogs.length !== 1 ? 's' : ''} shown
        </p>
      </div>
      <div className="divide-y divide-gray-200">
        {activityLogs.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No activity logs yet</p>
          </div>
        ) : (
          activityLogs.map((log) => (
            <div
              key={log.id}
              className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition"
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-0.5">
                  {getActionIcon(log.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`}
                    >
                      {log.action}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(log.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {formatActionDescription(log.action, log.tableName)}
                  </p>
                  <div className="mt-1 flex items-center text-xs text-gray-600">
                    <User className="h-3.5 w-3.5 mr-1 text-gray-400" />
                    {log.user}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
