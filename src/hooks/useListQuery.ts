'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';

/** Soft-navigate list query strings without a full reload or scroll jump. */
export function useListQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const navigateList = useCallback(
    (href: string) => {
      startTransition(() => {
        router.replace(href, { scroll: false });
      });
    },
    [router]
  );

  const replaceQuery = useCallback(
    (
      updates: Record<string, string | undefined>,
      options?: { resetPage?: boolean }
    ) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        const trimmed = (value ?? '').trim();
        if (trimmed) params.set(key, trimmed);
        else params.delete(key);
      }
      if (options?.resetPage !== false) {
        params.delete('page');
      }
      const qs = params.toString();
      navigateList(qs ? `${pathname}?${qs}` : pathname);
    },
    [navigateList, pathname, searchParams]
  );

  return { isPending, navigateList, pathname, replaceQuery, searchParams };
}
