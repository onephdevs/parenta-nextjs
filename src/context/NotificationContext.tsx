'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  isLoading?: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  updateNotification: (id: string, updates: Partial<Notification>) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  const showNotification = useCallback(
    (notification: Omit<Notification, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const isLoading = notification.type === 'loading' || notification.isLoading;
      // Only apply an explicit duration when provided; otherwise default to 5s.
      // Callers often pass `duration: undefined`, which must not wipe the default.
      const duration = isLoading
        ? undefined
        : typeof notification.duration === 'number'
          ? notification.duration
          : 5000;

      const newNotification: Notification = {
        ...notification,
        id,
        duration,
        isLoading,
      };

      setNotifications((prev) => [...prev, newNotification]);
      return id;
    },
    []
  );

  const updateNotification = useCallback(
    (id: string, updates: Partial<Notification>) => {
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id ? { ...notification, ...updates } : notification
        )
      );

      // If updating to a non-loading type, ensure a dismiss duration is applied
      if (updates.type && updates.type !== 'loading') {
        const duration =
          typeof updates.duration === 'number' ? updates.duration : 5000;
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }
    },
    [removeNotification]
  );

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = useMemo<NotificationContextType>(
    () => ({
      notifications,
      showNotification,
      removeNotification,
      updateNotification,
      clearAll,
    }),
    [notifications, showNotification, removeNotification, updateNotification, clearAll]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}; 