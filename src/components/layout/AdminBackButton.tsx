'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { sanitizeReturnTo } from '@/lib/navigation';

export { sanitizeReturnTo, withReturnTo } from '@/lib/navigation';

const PREV_PATH_KEY = 'parenta:admin-prev-path';
const CURR_PATH_KEY = 'parenta:admin-curr-path';

function isInternalAdminPath(path: string | null | undefined): path is string {
  return Boolean(path && path.startsWith('/admin'));
}

/** Keep a one-step trail of admin paths for a reliable Back control. */
export function useAdminNavigationHistory(pathname: string) {
  const [previousPath, setPreviousPath] = useState<string | null>(null);

  useEffect(() => {
    if (!pathname.startsWith('/admin')) return;

    try {
      const storedCurrent = sessionStorage.getItem(CURR_PATH_KEY);
      if (storedCurrent && storedCurrent !== pathname && isInternalAdminPath(storedCurrent)) {
        sessionStorage.setItem(PREV_PATH_KEY, storedCurrent);
        setPreviousPath(storedCurrent);
      } else {
        const storedPrev = sessionStorage.getItem(PREV_PATH_KEY);
        setPreviousPath(
          storedPrev && storedPrev !== pathname && isInternalAdminPath(storedPrev)
            ? storedPrev
            : null
        );
      }
      sessionStorage.setItem(CURR_PATH_KEY, pathname);
    } catch {
      setPreviousPath(null);
    }
  }, [pathname]);

  return previousPath;
}

interface AdminBackButtonProps {
  /** Explicit destination (e.g. ?returnTo=...); wins over history. */
  returnTo?: string | null;
  fallbackHref?: string;
  className?: string;
}

export function AdminBackButton({
  returnTo,
  fallbackHref = '/admin',
  className,
}: AdminBackButtonProps) {
  const pathname = usePathname();
  const router = useRouter();
  const previousPath = useAdminNavigationHistory(pathname);

  const target = useMemo(() => {
    const explicit = sanitizeReturnTo(returnTo);
    if (explicit && explicit !== pathname) {
      return explicit;
    }
    if (previousPath && previousPath !== pathname) {
      return previousPath;
    }
    return null;
  }, [returnTo, previousPath, pathname]);

  const handleBack = useCallback(() => {
    if (target) {
      router.push(target);
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  }, [target, router, fallbackHref]);

  const label = target
    ? target.includes('/lease-management/')
      ? 'Back to lease'
      : target.includes('/lease-management')
        ? 'Back to leases'
        : target.includes('/tenants/')
          ? 'Back to tenant'
          : 'Back'
    : 'Back';

  return (
    <button
      type="button"
      onClick={handleBack}
      className={
        className ||
        'inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      }
      title={target ? `Go to ${target}` : 'Go back'}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
