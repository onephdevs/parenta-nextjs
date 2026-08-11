import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import AdminHomeClient from '@/components/features/dashboard/home/AdminHomeClient';

export const revalidate = 0;

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  return <AdminHomeClient firstName={session.user.firstName || ''} />;
}
