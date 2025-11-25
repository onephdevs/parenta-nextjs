'use client';

import { useCallback } from 'react';
import toast from 'react-hot-toast';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  title?: string;
  duration?: number;
}

export const useNotifications = () => {
  const showNotification = useCallback(
    (messageOrNotification: string | Omit<Notification, 'id'>, type: NotificationType = 'info') => {
      let message: string;
      let notificationType: NotificationType;
      let id: string;
      
      // Handle both old and new API formats
      if (typeof messageOrNotification === 'string') {
        message = messageOrNotification;
        notificationType = type;
      } else {
        message = messageOrNotification.title || messageOrNotification.message || '';
        notificationType = messageOrNotification.type;
      }
      
      // Create a unique ID for this message to prevent duplicates
      const toastId = `${notificationType}-${message}`;
      
      switch (notificationType) {
        case 'success':
          id = toast.success(message, {
            id: toastId,
            duration: 4000,
            position: 'top-right',
            style: {
              background: '#10B981',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#10B981',
            },
          });
          break;
        case 'error':
          id = toast.error(message, {
            id: toastId,
            duration: 6000,
            position: 'top-right',
            style: {
              background: '#EF4444',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#EF4444',
            },
          });
          break;
        case 'warning':
          id = toast(message, {
            id: toastId,
            duration: 5000,
            position: 'top-right',
            icon: '⚠️',
            style: {
              background: '#F59E0B',
              color: '#fff',
            },
          });
          break;
        case 'loading':
          id = toast.loading(message, {
            id: toastId,
            position: 'top-right',
            style: {
              background: '#6B7280',
              color: '#fff',
            },
          });
          break;
        case 'info':
        default:
          id = toast(message, {
            id: toastId,
            duration: 4000,
            position: 'top-right',
            icon: 'ℹ️',
            style: {
              background: '#3B82F6',
              color: '#fff',
            },
          });
          break;
      }
      
      // Log to console for development
      console.log(`[${notificationType.toUpperCase()}] ${message}`);
      
      return id;
    },
    []
  );

  const addNotification = useCallback((message: string, type: NotificationType = 'info') => {
    return showNotification(message, type);
  }, [showNotification]);

  const showSuccess = useCallback((message: string) => {
    return showNotification(message, 'success');
  }, [showNotification]);

  const showError = useCallback((message: string) => {
    return showNotification(message, 'error');
  }, [showNotification]);

  const showWarning = useCallback((message: string) => {
    return showNotification(message, 'warning');
  }, [showNotification]);

  const showInfo = useCallback((message: string) => {
    return showNotification(message, 'info');
  }, [showNotification]);

  // Loading toast utilities
  const showLoading = useCallback((message: string = 'Loading...') => {
    return toast.loading(message, {
      position: 'top-right',
      style: {
        background: '#6B7280',
        color: '#fff',
      },
    });
  }, []);

  const dismissToast = useCallback((toastId: string) => {
    toast.dismiss(toastId);
  }, []);

  const dismissAll = useCallback(() => {
    toast.dismiss();
  }, []);

  // Backward compatibility methods for old context API
  const removeNotification = useCallback((id: string) => {
    toast.dismiss(id);
  }, []);

  const updateNotification = useCallback((id: string, updates: Partial<Notification>) => {
    // Use toast.update to update existing toast
    const message = updates.title ? `${updates.title}: ${updates.message || ''}` : (updates.message || '');
    const type = updates.type || 'info';
    
    const toastOptions: any = {
      id,
      duration: type === 'error' ? 6000 : 4000,
      position: 'top-right' as const,
    };

    switch (type) {
      case 'success':
        toastOptions.style = { background: '#10B981', color: '#fff' };
        toast.success(message, toastOptions);
        break;
      case 'error':
        toastOptions.style = { background: '#EF4444', color: '#fff' };
        toast.error(message, toastOptions);
        break;
      case 'warning':
        toastOptions.style = { background: '#F59E0B', color: '#fff' };
        toast(message, { ...toastOptions, icon: '⚠️' });
        break;
      case 'loading':
        toast.loading(message, toastOptions);
        break;
      default:
        toastOptions.style = { background: '#3B82F6', color: '#fff' };
        toast(message, toastOptions);
    }
  }, []);

  const clearAll = useCallback(() => {
    toast.dismiss();
  }, []);

  return {
    showNotification,
    addNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    dismissToast,
    dismissAll,
    // Backward compatibility
    removeNotification,
    updateNotification,
    clearAll,
    notifications: [], // Empty array for compatibility
  };
}; 