'use client';

/**
 * Unified notifications API.
 * Wraps NotificationContext and preserves the older hook-style helpers
 * (addNotification, showLoading, dismissToast) used across features.
 */

import { useCallback } from 'react';
import {
  useNotifications as useNotificationContext,
  type NotificationType,
  type Notification,
} from '@/context/NotificationContext';

export type { NotificationType, Notification };

type ShowArg = string | Omit<Notification, 'id'>;

export function useNotifications() {
  const ctx = useNotificationContext();

  const showNotification = useCallback(
    (messageOrNotification: ShowArg, type: NotificationType = 'info') => {
      if (typeof messageOrNotification === 'string') {
        return ctx.showNotification({
          type,
          title: messageOrNotification,
        });
      }

      const n = messageOrNotification;
      return ctx.showNotification({
        type: n.type,
        title: n.title || n.message || 'Notification',
        message: n.title ? n.message : undefined,
        duration: n.duration,
        isLoading: n.type === 'loading' || n.isLoading,
      });
    },
    [ctx]
  );

  const addNotification = useCallback(
    (message: string, type: NotificationType = 'info') => showNotification(message, type),
    [showNotification]
  );

  const showSuccess = useCallback(
    (message: string) => showNotification(message, 'success'),
    [showNotification]
  );
  const showError = useCallback(
    (message: string) => showNotification(message, 'error'),
    [showNotification]
  );
  const showWarning = useCallback(
    (message: string) => showNotification(message, 'warning'),
    [showNotification]
  );
  const showInfo = useCallback(
    (message: string) => showNotification(message, 'info'),
    [showNotification]
  );

  const showLoading = useCallback(
    (message: string = 'Loading...') =>
      ctx.showNotification({ type: 'loading', title: message }),
    [ctx]
  );

  const dismissToast = useCallback(
    (id: string) => ctx.removeNotification(id),
    [ctx]
  );

  const dismissAll = useCallback(() => ctx.clearAll(), [ctx]);

  return {
    notifications: ctx.notifications,
    showNotification,
    addNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    dismissToast,
    dismissAll,
    removeNotification: ctx.removeNotification,
    updateNotification: ctx.updateNotification,
    clearAll: ctx.clearAll,
  };
}
