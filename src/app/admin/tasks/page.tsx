import { TasksBoard } from '@/components/features/tasks/TasksBoard';
import type { PipelineBoardSlug } from '@/types/database';

interface AdminTasksPageProps {
  searchParams: Promise<{ board?: string }>;
}

export default async function AdminTasksPage({ searchParams }: AdminTasksPageProps) {
  const query = await searchParams;
  const board = (query.board?.trim() || 'onboarding') as PipelineBoardSlug;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <TasksBoard initialSlug={board} />
    </div>
  );
}
