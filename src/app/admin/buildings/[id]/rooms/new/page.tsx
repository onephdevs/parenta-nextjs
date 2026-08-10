import { getServerSession } from 'next-auth/next';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getBuildingById } from '@/lib/api/buildings';
import AddRoomForm from '@/components/features/AddRoomForm';

interface AddRoomPageProps {
  params: Promise<{ id: string }>;
}

export default async function AddRoomPage({ params }: AddRoomPageProps) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session || !session.user || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  let building = null;
  try {
    building = await getBuildingById(id);
    if (!building) {
      notFound();
    }
  } catch (error) {
    console.error('Error fetching building:', error);
    notFound();
  }

  return (
    <div className="min-h-0 flex-1 bg-white">
      <AddRoomForm buildingId={building.id} building={building} />
    </div>
  );
}
