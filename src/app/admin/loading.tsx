import { RouteLoadingFallback } from '@/components/layout/route-loader';

/** Fills the admin main pane only — sidebar stays visible. */
export default function AdminLoading() {
  return <RouteLoadingFallback />;
}
