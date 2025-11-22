'use client';

import { SessionProvider } from 'next-auth/react';
import { NotificationProvider } from '@/context/NotificationContext';
import ToastContainer from '@/components/ui/ToastContainer';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NotificationProvider>
        {children}
        <ToastContainer />
      </NotificationProvider>
    </SessionProvider>
  );
}

