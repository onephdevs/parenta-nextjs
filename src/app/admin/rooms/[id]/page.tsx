import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import RoomDetailClient from '@/components/features/RoomDetailClient';
import { 
  getRoomById, 
  getCurrentTenantAssignment, 
  getRoomAssignmentHistory, 
  getRoomFinancialSummary,
  getRoomOccupancyMetrics 
} from '@/lib/api/rooms';

interface RoomDetailPageProps {
  params: Promise<{ id: string }>;
}

async function getRoomDetails(id: string) {
  try {
    // Get comprehensive room data directly from API functions
    const [
      room,
      currentTenant,
      assignmentHistory,
      financialSummary,
      occupancyMetrics
    ] = await Promise.all([
      getRoomById(id),
      getCurrentTenantAssignment(id),
      getRoomAssignmentHistory(id),
      getRoomFinancialSummary(id),
      getRoomOccupancyMetrics(id)
    ]);

    if (!room) {
      return null;
    }

    return {
      room,
      currentTenant,
      assignmentHistory,
      financialSummary,
      occupancyMetrics
    };
  } catch (error) {
    console.error('Error fetching room details:', error);
    return null;
  }
}

export default async function RoomDetailPage({ params }: RoomDetailPageProps) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  // Redirect if not authenticated or not admin
  if (!session || !session.user || session.user.role !== 'admin') {
    redirect('/auth/admin/signin');
  }

  const roomDetails = await getRoomDetails(id);

  if (!roomDetails) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              {/* Breadcrumb */}
              <nav className="flex items-center space-x-2 text-sm text-gray-900">
                <Link href="/admin" className="hover:text-purple-600 transition-colors">
                  Dashboard
                </Link>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <Link href="/admin/rooms" className="hover:text-purple-600 transition-colors">
                  Rooms
                </Link>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-gray-900 font-medium">Room {roomDetails.room.roomNumber}</span>
              </nav>
            </div>
            
            <div className="flex items-center space-x-3">
              <Link
                href="/admin/rooms"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Rooms
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <RoomDetailClient 
          roomDetails={roomDetails}
        />
      </main>
    </div>
  );
} 