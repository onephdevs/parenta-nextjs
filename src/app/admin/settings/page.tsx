import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import SettingsClient from '@/components/features/settings/SettingsClient';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'admin') {
    redirect('/auth/signin?role=admin');
  }

  return <SettingsClient session={session} />;
}

