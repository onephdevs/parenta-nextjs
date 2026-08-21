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
  const {
    notifications,
    showNotification: ctxShow,
    removeNotification,
    updateNotification,
    clearAll,
  } = useNotificationContext();

  const showNotification = useCallback(
    (messageOrNotification: ShowArg, type: NotificationType = 'info') => {
      if (typeof messageOrNotification === 'string') {
        return ctxShow({
          type,
          title: messageOrNotification,
        });
      }

      const n = messageOrNotification;
      return ctxShow({
        type: n.type,
        title: n.title || n.message || 'Notification',
        message: n.title ? n.message : undefined,
        // Omit undefined so the provider default (5s) is preserved
        ...(typeof n.duration === 'number' ? { duration: n.duration } : {}),
        isLoading: n.type === 'loading' || n.isLoading,
      });
    },
    [ctxShow]
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
      ctxShow({ type: 'loading', title: message }),
    [ctxShow]
  );

  const dismissToast = useCallback(
    (id: string) => removeNotification(id),
    [removeNotification]
  );

  const dismissAll = useCallback(() => clearAll(), [clearAll]);

  return {
    notifications,
    showNotification,
    addNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    dismissToast,
    dismissAll,
    removeNotification,
    updateNotification,
    clearAll,
  };
}
