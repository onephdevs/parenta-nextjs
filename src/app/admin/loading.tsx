import AppLoader from '@/components/ui/AppLoader';

/** Fills the admin main pane only — sidebar stays visible. */
export default function AdminLoading() {
  return <AppLoader variant="inline" className="min-h-[calc(100vh-4rem)]" />;
}
