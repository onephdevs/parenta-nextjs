'use client';

import { SessionProvider } from 'next-auth/react';
import { NotificationProvider } from '@/context/NotificationContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { RouteLoaderProvider } from '@/components/layout/route-loader';
import ToastContainer from '@/components/ui/ToastContainer';
import { ImageLightboxProvider } from '@/components/ui/ImageLightbox';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NotificationProvider>
        <CurrencyProvider>
          <ImageLightboxProvider>
            <RouteLoaderProvider>
              {children}
              <ToastContainer />
            </RouteLoaderProvider>
          </ImageLightboxProvider>
        </CurrencyProvider>
      </NotificationProvider>
    </SessionProvider>
  );
}

