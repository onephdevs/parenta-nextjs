'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, AlertTriangle, Clock, CheckCircle, Wrench } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';

interface MaintenanceItem {
  asset: {
    id: string;
    assetName: string;
    assetType: string;
    assetCondition: string;
  };
  nextMaintenanceDate: Date;
  daysOverdue: number;
  priority: 'high' | 'medium' | 'low';
}

interface MaintenanceScheduleProps {
  refreshTrigger: number;
}

export function MaintenanceSchedule({ refreshTrigger }: MaintenanceScheduleProps) {
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { addNotification } = useNotifications();

  useEffect(() => {
    const fetchMaintenanceSchedule = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/assets/stats?type=maintenance');
        const result = await response.json();

        if (result.success) {
          setMaintenanceItems(result.data || []);
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Error fetching maintenance schedule:', error);
        addNotification('Failed to load maintenance schedule', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchMaintenanceSchedule();
  }, [refreshTrigger, addNotification]);

  const handleMarkCompleted = async (assetId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const nextMaintenanceDate = nextMonth.toISOString().split('T')[0];

      const response = await fetch(`/api/assets/${assetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lastMaintenanceDate: today,
          nextMaintenanceDate: nextMaintenanceDate
        }),
      });

      const result = await response.json();

      if (result.success) {
        addNotification('Maintenance marked as completed', 'success');
        setMaintenanceItems(prev => prev.filter(item => item.asset.id !== assetId));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error updating maintenance:', error);
      addNotification('Failed to update maintenance status', 'error');
    }
  };

  const getPriorityBadge = (priority: string, daysOverdue: number) => {
    const priorityColors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };

    const priorityIcons = {
      high: AlertTriangle,
      medium: Clock,
      low: CheckCircle
    };

    const IconComponent = priorityIcons[priority as keyof typeof priorityIcons];

    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${priorityColors[priority as keyof typeof priorityColors]}`}>
        <IconComponent className="h-3 w-3 mr-1" />
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
        {daysOverdue > 0 && ` (${daysOverdue}d overdue)`}
      </span>
    );
  };

  const getConditionBadge = (condition: string) => {
    const conditionColors = {
      excellent: 'bg-green-100 text-green-800',
      good: 'bg-blue-100 text-blue-800',
      fair: 'bg-yellow-100 text-yellow-800',
      poor: 'bg-orange-100 text-orange-800',
      damaged: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${conditionColors[condition as keyof typeof conditionColors] || 'bg-gray-100 text-gray-800'}`}>
        {condition.charAt(0).toUpperCase() + condition.slice(1)}
      </span>
    );
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const groupedItems = {
    overdue: maintenanceItems.filter(item => item.daysOverdue > 0),
    upcoming: maintenanceItems.filter(item => item.daysOverdue === 0)
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" label="Loading schedule" />
        </div>
      </Card>
    );
  }

  if (maintenanceItems.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<CheckCircle className="h-12 w-12 text-green-500" />}
          title="All Caught Up!"
          description="No maintenance items scheduled or overdue."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Items"
          value={maintenanceItems.length}
          tone="blue"
          icon={<Calendar className="h-6 w-6" />}
        />
        <StatCard
          title="Overdue"
          value={groupedItems.overdue.length}
          tone="red"
          icon={<AlertTriangle className="h-6 w-6" />}
        />
        <StatCard
          title="Upcoming"
          value={groupedItems.upcoming.length}
          tone="green"
          icon={<Clock className="h-6 w-6" />}
        />
      </div>

      {groupedItems.overdue.length > 0 && (
        <Card padding="none">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Overdue Maintenance ({groupedItems.overdue.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Asset
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Condition
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {groupedItems.overdue.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {item.asset.assetName}
                        </div>
                        <div className="text-sm text-gray-900 capitalize">
                          {item.asset.assetType}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(item.nextMaintenanceDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPriorityBadge(item.priority, item.daysOverdue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getConditionBadge(item.asset.assetCondition)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleMarkCompleted(item.asset.id)}
                        leftIcon={<Wrench className="h-4 w-4" />}
                      >
                        Mark Complete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {groupedItems.upcoming.length > 0 && (
        <Card padding="none">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Upcoming Maintenance ({groupedItems.upcoming.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Asset
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Condition
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {groupedItems.upcoming.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {item.asset.assetName}
                        </div>
                        <div className="text-sm text-gray-900 capitalize">
                          {item.asset.assetType}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(item.nextMaintenanceDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPriorityBadge(item.priority, item.daysOverdue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getConditionBadge(item.asset.assetCondition)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleMarkCompleted(item.asset.id)}
                        leftIcon={<Wrench className="h-4 w-4" />}
                      >
                        Complete Early
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
