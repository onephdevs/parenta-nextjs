'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface PreviewState {
  active: boolean;
  tenantId?: string;
  tenantLabel?: string;
  returnUrl?: string;
}

interface TenantPortalGateValue {
  /** Ready to load portal data */
  canAccess: boolean;
  isPreview: boolean;
  isLoading: boolean;
  preview: PreviewState;
  exitPreview: () => Promise<void>;
}

const TenantPortalGateContext = createContext<TenantPortalGateValue | null>(null);

export function TenantPortalGateProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [preview, setPreview] = useState<PreviewState>({ active: false });
  const [previewLoaded, setPreviewLoaded] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      setPreviewLoaded(true);
      return;
    }

    if (session?.user?.role === 'tenant') {
      setPreview({ active: false });
      setPreviewLoaded(true);
      return;
    }

    if (session?.user?.role === 'admin') {
      let cancelled = false;
      (async () => {
        try {
          const res = await fetch('/api/tenant/preview');
          const json = await res.json();
          if (cancelled) return;
          if (json.success && json.data?.active) {
            setPreview({
              active: true,
              tenantId: json.data.tenantId,
              tenantLabel: json.data.tenantLabel,
              returnUrl: json.data.returnUrl,
            });
          } else {
            setPreview({ active: false });
          }
        } catch {
          if (!cancelled) setPreview({ active: false });
        } finally {
          if (!cancelled) setPreviewLoaded(true);
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    setPreviewLoaded(true);
  }, [status, session?.user?.role]);

  const exitPreview = useCallback(async () => {
    const returnUrl = preview.returnUrl || '/admin/tenants';
    try {
      await fetch('/api/tenant/preview', { method: 'DELETE' });
    } catch {
      // still navigate back
    }
    router.push(returnUrl);
  }, [preview.returnUrl, router]);

  const isPreview = Boolean(preview.active && session?.user?.role === 'admin');
  const canAccess =
    status === 'authenticated' &&
    (session?.user?.role === 'tenant' || isPreview);

  const value = useMemo(
    () => ({
      canAccess,
      isPreview,
      isLoading: status === 'loading' || (session?.user?.role === 'admin' && !previewLoaded),
      preview,
      exitPreview,
    }),
    [canAccess, isPreview, status, session?.user?.role, previewLoaded, preview, exitPreview]
  );

  return (
    <TenantPortalGateContext.Provider value={value}>{children}</TenantPortalGateContext.Provider>
  );
}

export function useTenantPortalGate() {
  const ctx = useContext(TenantPortalGateContext);
  if (!ctx) {
    throw new Error('useTenantPortalGate must be used within TenantPortalGateProvider');
  }
  return ctx;
}
