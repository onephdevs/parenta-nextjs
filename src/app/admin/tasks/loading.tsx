import AppLoader from '@/components/ui/AppLoader';

export default function TasksLoading() {
  return (
    <AppLoader
      variant="inline"
      label="Loading pipeline…"
      className="min-h-[calc(100vh-8rem)]"
    />
  );
}
