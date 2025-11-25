import { getServerSession } from 'next-auth/next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getBuildingById } from '@/lib/api/buildings';
import AddRoomForm from '@/components/features/AddRoomForm';

interface AddRoomPageProps {
  params: Promise<{ id: string }>;
}

export default async function AddRoomPage({ params }: AddRoomPageProps) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  // Redirect if not authenticated or not admin
  if (!session || !session.user || session.user.role !== 'admin') {
    redirect('/auth/signin?role=admin');
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center space-x-2 py-3 border-b border-gray-200">
            <Link 
              href="/admin" 
              className="text-sm text-gray-900 hover:text-gray-900 flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </Link>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link 
              href="/admin/buildings" 
              className="text-sm text-gray-900 hover:text-gray-900"
            >
              Buildings
            </Link>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link 
              href={`/admin/buildings/${building.id}`}
              className="text-sm text-gray-900 hover:text-gray-900"
            >
              {building.name}
            </Link>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link 
              href={`/admin/buildings/${building.id}/rooms`}
              className="text-sm text-gray-900 hover:text-gray-900"
            >
              Rooms
            </Link>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-sm text-gray-900 font-medium">Add Room</span>
          </div>
          
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link
                href={`/admin/buildings/${building.id}`}
                className="mr-4 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="Back to Building Details"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Add Room</h1>
                <p className="text-sm text-gray-900 mt-1">
                  Add a new room to {building.name}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AddRoomForm buildingId={building.id} building={building} />
      </main>
    </div>
  );
} 