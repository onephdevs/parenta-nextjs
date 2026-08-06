'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useSearchParams } from 'next/navigation';
import AppLoader from '@/components/ui/AppLoader';

const SAFETY_TIMEOUT_MS = 8000;
const MAIN_SCOPE_SELECTOR = '[data-app-main]';

function isModifiedClick(event: MouseEvent): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function resolveInternalHref(anchor: HTMLAnchorElement): URL | null {
  const raw = anchor.getAttribute('href');
  if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:')) {
    return null;
  }

  if (anchor.target === '_blank' || anchor.hasAttribute('download')) {
    return null;
  }

  try {
    const url = new URL(raw, window.location.href);
    if (url.origin !== window.location.origin) return null;
    return url;
  } catch {
    return null;
  }
}

function sameDestination(url: URL): boolean {
  return (
    url.pathname === window.location.pathname &&
    url.search === window.location.search &&
    url.hash === window.location.hash
  );
}

function NavigationLoaderInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [mainEl, setMainEl] = useState<HTMLElement | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeKeyRef = useRef(`${pathname}?${searchParams.toString()}`);

  const clearSafetyTimer = useCallback(() => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, []);

  const startPending = useCallback(() => {
    setPending(true);
    clearSafetyTimer();
    safetyTimerRef.current = setTimeout(() => {
      setPending(false);
      safetyTimerRef.current = null;
    }, SAFETY_TIMEOUT_MS);
  }, [clearSafetyTimer]);

  const stopPending = useCallback(() => {
    clearSafetyTimer();
    setPending(false);
  }, [clearSafetyTimer]);

  useEffect(() => {
    const nextKey = `${pathname}?${searchParams.toString()}`;
    if (nextKey !== routeKeyRef.current) {
      routeKeyRef.current = nextKey;
      stopPending();
    }
  }, [pathname, searchParams, stopPending]);

  useEffect(() => {
    if (!pending) {
      setMainEl(null);
      return;
    }
    setMainEl(document.querySelector(MAIN_SCOPE_SELECTOR) as HTMLElement | null);
  }, [pending, pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (isModifiedClick(event) || event.defaultPrevented) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest('a');
      if (!(anchor instanceof HTMLAnchorElement)) return;

      const url = resolveInternalHref(anchor);
      if (!url || sameDestination(url)) return;

      startPending();
    };

    const onPopState = () => {
      startPending();
    };

    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState);

    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState);
      clearSafetyTimer();
    };
  }, [startPending, clearSafetyTimer]);

  if (!pending) return null;

  // Prefer main-content scope (admin shell) so the sidebar stays visible
  if (mainEl) {
    return createPortal(
      <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <AppLoader variant="inline" className="min-h-0 bg-transparent" />
      </div>,
      mainEl
    );
  }

  return <AppLoader variant="overlay" />;
}

export default function NavigationLoader() {
  return (
    <Suspense fallback={null}>
      <NavigationLoaderInner />
    </Suspense>
  );
}
