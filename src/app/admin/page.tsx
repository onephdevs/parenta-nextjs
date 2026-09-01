import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { canAccessAdminPortal } from '@/lib/auth/admin-access';
import AdminHomeClient from '@/components/features/dashboard/home/AdminHomeClient';

export const revalidate = 0;

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !canAccessAdminPortal(session.user.role)) {
    redirect('/auth/signin');
  }

  return <AdminHomeClient firstName={session.user.firstName || ''} />;
}
