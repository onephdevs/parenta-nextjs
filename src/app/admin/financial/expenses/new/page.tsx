import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import ExpenseForm from '@/components/features/ExpenseForm';

export default async function NewExpensePage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/auth/admin/signin');
  }

  return (
    <div className="min-h-0 flex-1 bg-white">
      <ExpenseForm />
    </div>
  );
}
