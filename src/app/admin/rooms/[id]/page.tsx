import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getRoomPageDetail } from '@/lib/api/properties';
import RoomUnitDetailClient from '@/components/features/rooms/RoomUnitDetailClient';

interface RoomDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RoomDetailPage({ params }: RoomDetailPageProps) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session || !session.user || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  const detail = await getRoomPageDetail(id);

  if (!detail) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#E2E5F7]">
      <main className="mx-auto max-w-[960px] px-4 py-6 sm:px-6 lg:px-8">
        <RoomUnitDetailClient detail={detail} />
      </main>
    </div>
  );
}
