'use client';

import React from 'react';
import { useNotifications } from '@/context/NotificationContext';
import Toast from './Toast';

const ToastContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-[140] space-y-2 pointer-events-none">
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <Toast 
            notification={notification} 
            onRemove={removeNotification} 
          />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer; 