'use client';

import { useCallback, useEffect, useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Card, Switch } from '@/components/ui';
import type { ActivityCategory } from '@/lib/services/activity-taxonomy';

interface PreferenceRow {
  category: ActivityCategory;
  label: string;
  description: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
}

export default function NotificationPreferencesPanel() {
  const { showNotification } = useNotifications();
  const [preferences, setPreferences] = useState<PreferenceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notification-preferences', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setPreferences(data.data.preferences || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updatePref = async (
    category: ActivityCategory,
    patch: Partial<{ inAppEnabled: boolean; emailEnabled: boolean }>
  ) => {
    const current = preferences.find((p) => p.category === category);
    if (!current) return;

    const next = {
      inAppEnabled: patch.inAppEnabled ?? current.inAppEnabled,
      emailEnabled: patch.emailEnabled ?? current.emailEnabled,
    };

    setPreferences((prev) =>
      prev.map((p) => (p.category === category ? { ...p, ...next } : p))
    );

    try {
      const res = await fetch('/api/notification-preferences', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, ...next }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed');
      showNotification({
        type: 'success',
        title: 'Preference saved',
        message: `${current.label} updated`,
      });
    } catch {
      setPreferences((prev) =>
        prev.map((p) => (p.category === category ? current : p))
      );
      showNotification({
        type: 'error',
        title: 'Could not save',
        message: 'Failed to update notification preference',
      });
    }
  };

  if (loading) {
    return <div className="h-40 animate-pulse rounded-lg bg-gray-100" />;
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Notification categories</h3>
        <p className="mt-1 text-xs text-gray-600">
          Changes save immediately. Email delivery is stored now and will send once email is wired.
        </p>
      </div>
      <ul className="divide-y divide-gray-100">
        {preferences.map((pref) => (
          <li
            key={pref.category}
            className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{pref.label}</p>
              <p className="text-xs text-gray-600">{pref.description}</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">In-app</span>
                <Switch
                  aria-label={`${pref.label} in-app`}
                  checked={pref.inAppEnabled}
                  onCheckedChange={(inAppEnabled) =>
                    updatePref(pref.category, { inAppEnabled })
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Email</span>
                <Switch
                  aria-label={`${pref.label} email`}
                  checked={pref.emailEnabled}
                  onCheckedChange={(emailEnabled) =>
                    updatePref(pref.category, { emailEnabled })
                  }
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
