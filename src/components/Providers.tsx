'use client';

import { SessionProvider } from 'next-auth/react';
import { NotificationProvider } from '@/context/NotificationContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import NavigationLoader from '@/components/layout/NavigationLoader';
import ToastContainer from '@/components/ui/ToastContainer';
import { ImageLightboxProvider } from '@/components/ui/ImageLightbox';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NotificationProvider>
        <CurrencyProvider>
          <ImageLightboxProvider>
            {children}
            <ToastContainer />
            <NavigationLoader />
          </ImageLightboxProvider>
        </CurrencyProvider>
      </NotificationProvider>
    </SessionProvider>
  );
}

