import { getServerSession } from 'next-auth/next';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getExpenseById } from '@/lib/api/expenses';
import EditExpenseForm from '@/components/features/EditExpenseForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditExpensePage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  const expense = await getExpenseById(id);
  if (!expense) {
    notFound();
  }

  return (
    <div className="min-h-0 flex-1 bg-white">
      <EditExpenseForm expense={expense} />
    </div>
  );
}
