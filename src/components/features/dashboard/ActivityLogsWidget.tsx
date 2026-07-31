'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Activity, Plus, Edit, Trash2, Eye, ArrowRight, User } from 'lucide-react';

interface ActivityLog {
  id: string;
  action: string;
  tableName: string;
  recordId?: string;
  createdAt: string;
  user: string;
  description?: string;
}

export default function ActivityLogsWidget() {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchActivityLogs();
    // Refresh every 60 seconds
    const interval = setInterval(fetchActivityLogs, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchActivityLogs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/activity?limit=10', { credentials: 'include' });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      
      const data = await response.json();

      if (data.success) {
        setActivityLogs(
          (data.data.items || []).map((item: {
            id: string;
            actionType: string;
            entityType: string;
            entityId?: string;
            createdAt: string;
            actorName: string;
            description: string;
          }) => ({
            id: item.id,
            action: item.actionType,
            tableName: item.entityType,
            recordId: item.entityId,
            createdAt: item.createdAt,
            user: item.actorName,
            description: item.description,
          }))
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

  const getActionIcon = (action: string) => {
    if (/\.(created|requested|recorded|uploaded|generated|imported)$/.test(action) || action === 'CREATE') {
      return <Plus className="h-4 w-4 text-green-600" />;
    }
    if (/\.(updated|status_changed|assigned|allocated|converted)$/.test(action) || action === 'UPDATE') {
      return <Edit className="h-4 w-4 text-blue-600" />;
    }
    if (/\.(deleted|cancelled|unassigned)$/.test(action) || action === 'DELETE') {
      return <Trash2 className="h-4 w-4 text-red-600" />;
    }
    if (action === 'READ') return <Eye className="h-4 w-4 text-gray-600" />;
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  const getActionColor = (action: string) => {
    if (/\.(created|requested|recorded|uploaded|generated|imported)$/.test(action) || action === 'CREATE') {
      return 'text-green-700 bg-green-50';
    }
    if (/\.(updated|status_changed|assigned|allocated|converted)$/.test(action) || action === 'UPDATE') {
      return 'text-blue-700 bg-blue-50';
    }
    if (/\.(deleted|cancelled|unassigned)$/.test(action) || action === 'DELETE') {
      return 'text-red-700 bg-red-50';
    }
    return 'text-gray-700 bg-gray-50';
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

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-indigo-600" />
            Activity Logs
          </h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center">
          <Activity className="h-5 w-5 mr-2 text-indigo-600" />
          Recent Activity
        </h3>
        <Link
          href="/admin/activity"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
        >
          View All <ArrowRight className="h-4 w-4 ml-1" />
        </Link>
      </div>

      {activityLogs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>No recent activity</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {activityLogs.map((log) => (
            <div
              key={log.id}
              className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition"
            >
              <div className="flex items-start space-x-3">
                <div className="mt-0.5">
                  {getActionIcon(log.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(log.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 font-medium">
                    {log.description || formatActionDescription(log.action, log.tableName)}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <User className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-600">{log.user}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
