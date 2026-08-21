'use client';

export {
  RouteLoaderProvider,
  RouteLoadingFallback,
  useRouteLoader,
  useRouteReady,
} from '@/components/layout/route-loader';

/** Overlay + click intercept live in RouteLoaderProvider. */
export default function NavigationLoader() {
  return null;
}
