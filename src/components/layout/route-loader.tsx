'use client';

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useSearchParams } from 'next/navigation';
import AppLoader from '@/components/ui/AppLoader';
import { cn } from '@/lib/utils';

const SAFETY_TIMEOUT_MS = 8000;
/** Wait this long after the route commits for the page to call hold(). */
const SETTLE_MS = 160;
const MAIN_SCOPE_SELECTOR = '[data-app-main]';

interface RouteLoaderApi {
  /** House overlay is visible. */
  pending: boolean;
  /** Start overlay (internal link click / back-forward). */
  start: () => void;
  /** Destination page is still loading — keep the overlay up. */
  hold: (id: string) => void;
  /** Destination page is interactive — allow overlay to hide. */
  release: (id: string) => void;
}

const RouteLoaderContext = createContext<RouteLoaderApi | null>(null);

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

function willChangeAppRoute(url: URL): boolean {
  return (
    url.pathname !== window.location.pathname || url.search !== window.location.search
  );
}

function routeKeyFromLocation(): string {
  return `${window.location.pathname}?${window.location.search}`;
}

function useElementViewportRect(el: HTMLElement | null) {
  const [rect, setRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (!el) {
      setRect(null);
      return;
    }

    const update = () => {
      const next = el.getBoundingClientRect();
      setRect({
        top: next.top,
        left: next.left,
        width: next.width,
        height: next.height,
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [el]);

  return rect;
}

export function useRouteLoader(): RouteLoaderApi {
  const ctx = useContext(RouteLoaderContext);
  if (!ctx) {
    throw new Error('useRouteLoader must be used within RouteLoaderProvider');
  }
  return ctx;
}

/**
 * Hold the global house overlay until `ready` is true.
 * Use on any client page that fetches before it can paint.
 *
 * `covering` is true when this navigation already shows the overlay —
 * render a blank fallback instead of a second AppLoader.
 */
export function useRouteReady(ready: boolean): { covering: boolean } {
  const { pending, hold, release } = useRouteLoader();
  const id = useId();

  useLayoutEffect(() => {
    if (ready) release(id);
    else hold(id);
    return () => release(id);
  }, [ready, id, hold, release]);

  return { covering: pending && !ready };
}

/** Blank pane for `loading.tsx` — the overlay already has the house. */
export function RouteLoadingFallback({ className }: { className?: string }) {
  return (
    <div
      className={cn('h-full min-h-full w-full flex-1 bg-transparent', className)}
      aria-hidden
    />
  );
}

/**
 * Wrap a client page: keeps the global house overlay up until `ready`,
 * and avoids mounting a second house on navigations.
 *
 * Direct visits / refresh still show AppLoader.
 */
export function RouteAwareLoader({
  ready,
  label,
  className,
  children,
}: {
  ready: boolean;
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  const { covering } = useRouteReady(ready);
  if (ready) return <>{children}</>;
  if (covering) return <RouteLoadingFallback className={className} />;
  return <AppLoader variant="inline" label={label} className={className} />;
}

function queryMainPane(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector(MAIN_SCOPE_SELECTOR) as HTMLElement | null;
}

function paneBackgroundColor(el: HTMLElement | null): string | undefined {
  if (!el || typeof window === 'undefined') return undefined;
  const bg = window.getComputedStyle(el).backgroundColor;
  if (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') return undefined;
  return bg;
}

function RouteLoaderOverlay({ pending }: { pending: boolean }) {
  const [mainEl, setMainEl] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!pending) {
      setMainEl(null);
      return;
    }
    setMainEl(queryMainPane());
  }, [pending]);

  const el = pending ? mainEl ?? queryMainPane() : null;
  const paneRect = useElementViewportRect(pending ? el : null);

  if (!pending) return null;

  const overlay = (
    <AppLoader variant="inline" className="min-h-0 h-full w-full bg-transparent" />
  );

  const coverRect =
    paneRect ||
    (el
      ? (() => {
          const next = el.getBoundingClientRect();
          return {
            top: next.top,
            left: next.left,
            width: next.width,
            height: next.height,
          };
        })()
      : null);

  if (coverRect && coverRect.height > 0) {
    const backgroundColor = paneBackgroundColor(el);
    return createPortal(
      <div
        className={cn(
          'z-40 flex items-center justify-center',
          !backgroundColor && 'bg-white'
        )}
        style={{
          position: 'fixed',
          top: coverRect.top,
          left: coverRect.left,
          width: coverRect.width,
          height: coverRect.height,
          backgroundColor,
        }}
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Loading"
      >
        {overlay}
      </div>,
      document.body
    );
  }

  return <AppLoader variant="overlay" />;
}

function RouteLoaderState({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const holdsRef = useRef(new Set<string>());
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  pendingRef.current = pending;

  const clearSafetyTimer = useCallback(() => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, []);

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  const hideIfIdle = useCallback(() => {
    if (!pendingRef.current) return;
    if (holdsRef.current.size > 0) return;
    clearSafetyTimer();
    clearSettleTimer();
    setPending(false);
  }, [clearSafetyTimer, clearSettleTimer]);

  const start = useCallback(() => {
    holdsRef.current.clear();
    setPending(true);
    clearSettleTimer();
    clearSafetyTimer();
    safetyTimerRef.current = setTimeout(() => {
      holdsRef.current.clear();
      setPending(false);
      safetyTimerRef.current = null;
    }, SAFETY_TIMEOUT_MS);
  }, [clearSafetyTimer, clearSettleTimer]);

  const hold = useCallback(
    (id: string) => {
      if (!pendingRef.current) return;
      holdsRef.current.add(id);
      clearSettleTimer();
    },
    [clearSettleTimer]
  );

  const release = useCallback(
    (id: string) => {
      holdsRef.current.delete(id);
      if (!pendingRef.current) return;
      if (holdsRef.current.size === 0) hideIfIdle();
    },
    [hideIfIdle]
  );

  const onRouteCommitted = useCallback(() => {
    if (!pendingRef.current) return;
    clearSettleTimer();
    settleTimerRef.current = setTimeout(() => hideIfIdle(), SETTLE_MS);
  }, [clearSettleTimer, hideIfIdle]);

  useEffect(() => {
    return () => {
      clearSafetyTimer();
      clearSettleTimer();
    };
  }, [clearSafetyTimer, clearSettleTimer]);

  const api = useMemo<RouteLoaderApi>(
    () => ({ pending, start, hold, release }),
    [pending, start, hold, release]
  );

  return (
    <RouteLoaderContext.Provider value={api}>
      {children}
      <RouteLoaderOverlay pending={pending} />
      <Suspense fallback={null}>
        <RouteLoaderEffects onRouteCommitted={onRouteCommitted} hideIfIdle={hideIfIdle} />
      </Suspense>
    </RouteLoaderContext.Provider>
  );
}

function RouteLoaderEffects({
  onRouteCommitted,
  hideIfIdle,
}: {
  onRouteCommitted: () => void;
  hideIfIdle: () => void;
}) {
  const { start } = useRouteLoader();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKeyRef = useRef(`${pathname}?${searchParams.toString()}`);

  useEffect(() => {
    const nextKey = `${pathname}?${searchParams.toString()}`;
    if (nextKey === routeKeyRef.current) return;
    routeKeyRef.current = nextKey;
    onRouteCommitted();
  }, [pathname, searchParams, onRouteCommitted]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (isModifiedClick(event) || event.defaultPrevented) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const url = resolveInternalHref(anchor);
      if (!url || !willChangeAppRoute(url)) return;
      start();
    };

    const onPopState = () => {
      if (routeKeyFromLocation() === routeKeyRef.current) return;
      start();
    };

    const onHashChange = () => hideIfIdle();

    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState);
    window.addEventListener('hashchange', onHashChange);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [start, hideIfIdle]);

  return null;
}

export function RouteLoaderProvider({ children }: { children: ReactNode }) {
  return <RouteLoaderState>{children}</RouteLoaderState>;
}
