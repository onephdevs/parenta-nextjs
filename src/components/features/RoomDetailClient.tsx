'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';
import TenantAssignmentManager from './TenantAssignmentManager';
import RoomFinancialDashboard from './RoomFinancialDashboard';
import EditRoomForm from './EditRoomForm';
import RoomDetailWithImages from './RoomDetailWithImages';
import DeleteRoomModal from './DeleteRoomModal';

interface Room {
  id: string;
  buildingId: string;
  roomNumber: string;
  floorNumber?: number;
  roomType: string;
  squareFootage?: number;
  monthlyRate: number;
  depositAmount?: number;
  roomStatus: 'vacant' | 'occupied' | 'maintenance' | 'reserved';
  description?: string;
  amenities: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  buildingName?: string;
}

interface CurrentTenant {
  id: string;
  tenant_id: string;
  room_id: string;
  start_date: string;
  monthly_rate: number;
  deposit_paid?: number;
  notes?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  tenant_status: string;
}

interface AssignmentHistory {
  id: string;
  tenant_id: string;
  start_date: string;
  end_date?: string;
  monthly_rate: number;
  assignment_status: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface FinancialSummary {
  total_payments: number;
  overdue_amount: number;
  pending_amount: number;
  current_monthly_rate: number;
  current_assignment_start: string | null;
  deposit_received: number;
}

interface OccupancyMetrics {
  total_assignments: number;
  total_occupied_days: number;
  avg_assignment_length: number;
  occupancy_rate_percent: number;
}

interface RoomDetailClientProps {
  roomDetails: {
    room: Room;
    currentTenant: CurrentTenant | null;
    assignmentHistory: AssignmentHistory[];
    financialSummary: FinancialSummary;
    occupancyMetrics: OccupancyMetrics;
  };
}

export default function RoomDetailClient({ roomDetails: initialData }: RoomDetailClientProps) {
  const router = useRouter();
  const { showNotification } = useNotifications();
  const [roomDetails] = useState(initialData);
  const [activeTab, setActiveTab] = useState('overview');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const refreshRoomData = () => {
    // Switch back to overview tab after update
    setActiveTab('overview');
    // Refresh by reloading the page since data is fetched server-side
    window.location.reload();
  };

  const handleDeleteRoom = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomDetails.room.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete room');
      }

      showNotification({
        type: 'success',
        title: 'Room deleted',
        message: `Room ${roomDetails.room.roomNumber} has been deleted successfully.`,
      });

      // Redirect to rooms list
      router.push('/admin/rooms');
    } catch (error) {
      console.error('Error deleting room:', error);
      showNotification({
        type: 'error',
        title: 'Delete failed',
        message: error instanceof Error ? error.message : 'Failed to delete room. Please try again.',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied': return 'bg-green-100 text-green-800 border-green-200';
      case 'vacant': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'maintenance': return 'bg-red-100 text-red-800 border-red-200';
      case 'reserved': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'occupied':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'vacant':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      case 'maintenance':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '🏠' },
    { id: 'photos', name: 'Photos', icon: '📸' },
    { id: 'tenant', name: 'Tenant Management', icon: '👥' },
    { id: 'financial', name: 'Financial Dashboard', icon: '💰' }
  ];

  return (
    <div className="px-4 py-6 sm:px-0">

      {/* Room Header */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Room {roomDetails.room.roomNumber}</h1>
              <p className="text-sm text-gray-900 mt-1">{roomDetails.room.buildingName}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium border ${getStatusColor(roomDetails.room.roomStatus)}`}>
                {getStatusIcon(roomDetails.room.roomStatus)}
                <span className="ml-2 capitalize">{roomDetails.room.roomStatus}</span>
              </div>
              <button
                onClick={() => setActiveTab('edit')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Room
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Room
              </button>
              <button
                onClick={refreshRoomData}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-900 hover:text-gray-900 hover:border-gray-200'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <dl className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <dt className="text-sm font-medium text-gray-900">Room Type</dt>
                  <dd className="col-span-2 text-sm text-gray-900 capitalize">{roomDetails.room.roomType}</dd>
                </div>
                {roomDetails.room.floorNumber && (
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="text-sm font-medium text-gray-900">Floor</dt>
                    <dd className="col-span-2 text-sm text-gray-900">{roomDetails.room.floorNumber}</dd>
                  </div>
                )}
                {roomDetails.room.squareFootage && (
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="text-sm font-medium text-gray-900">Size</dt>
                    <dd className="col-span-2 text-sm text-gray-900">{roomDetails.room.squareFootage} sq ft</dd>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4">
                  <dt className="text-sm font-medium text-gray-900">Monthly Rate</dt>
                  <dd className="col-span-2 text-lg font-semibold text-gray-900">₱{parseFloat(roomDetails.room.monthlyRate.toString()).toLocaleString()}/mo</dd>
                </div>
                {roomDetails.room.depositAmount && (
                  <div className="grid grid-cols-3 gap-4">
                    <dt className="text-sm font-medium text-gray-900">Security Deposit</dt>
                    <dd className="col-span-2 text-sm text-gray-900">₱{parseFloat(roomDetails.room.depositAmount.toString()).toLocaleString()}</dd>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4">
                  <dt className="text-sm font-medium text-gray-900">Status</dt>
                  <dd className="col-span-2 text-sm text-gray-900 capitalize">{roomDetails.room.roomStatus}</dd>
                </div>
              </dl>
            </div>

            {/* Vacancy Overview */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Vacancy Overview</h3>
              <dl className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <dt className="text-sm font-medium text-gray-900">Total Assignments</dt>
                  <dd className="col-span-2 text-lg font-semibold text-purple-600">{roomDetails.occupancyMetrics.total_assignments}</dd>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <dt className="text-sm font-medium text-gray-900">Occupancy Rate</dt>
                  <dd className="col-span-2 text-lg font-semibold text-blue-600">{Math.round(roomDetails.occupancyMetrics.occupancy_rate_percent)}%</dd>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <dt className="text-sm font-medium text-gray-900">Created</dt>
                  <dd className="col-span-2 text-sm text-gray-900">{new Date(roomDetails.room.createdAt).toLocaleDateString()}</dd>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <dt className="text-sm font-medium text-gray-900">Last Updated</dt>
                  <dd className="col-span-2 text-sm text-gray-900">{new Date(roomDetails.room.updatedAt).toLocaleDateString()}</dd>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <dt className="text-sm font-medium text-gray-900">Active</dt>
                  <dd className={`col-span-2 text-sm font-medium ${roomDetails.room.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {roomDetails.room.isActive ? 'Yes' : 'No'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Description */}
            {roomDetails.room.description && (
              <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Description</h3>
                <p className="text-sm text-gray-900">{String(roomDetails.room.description || '')}</p>
              </div>
            )}

            {/* Amenities */}
            {roomDetails.room.amenities && (
              <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Amenities</h3>
                <div className="text-gray-900 bg-gray-50 p-4 rounded-md">
                  {String(roomDetails.room.amenities || '')}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'photos' && (
          <RoomDetailWithImages roomDetails={roomDetails} />
        )}

        {activeTab === 'tenant' && (
          <TenantAssignmentManager
            roomId={roomDetails.room.id}
            currentTenant={roomDetails.currentTenant}
            assignmentHistory={roomDetails.assignmentHistory}
            roomMonthlyRate={roomDetails.room.monthlyRate}
            room={{
              depositRequired: roomDetails.room.depositRequired,
              depositType: roomDetails.room.depositType,
              depositFixedAmount: roomDetails.room.depositFixedAmount,
              depositPercentage: roomDetails.room.depositPercentage,
            }}
            onAssignmentChange={refreshRoomData}
          />
        )}

        {activeTab === 'financial' && (
          <RoomFinancialDashboard
            financialSummary={roomDetails.financialSummary}
            occupancyMetrics={roomDetails.occupancyMetrics}
            roomId={roomDetails.room.id}
          />
        )}

        {activeTab === 'edit' && (
          <EditRoomForm 
            room={roomDetails.room}
            onRoomUpdated={refreshRoomData}
            startInEditMode={true}
          />
        )}
      </div>

      {/* Delete Room Modal */}
      <DeleteRoomModal
        room={roomDetails.room}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={handleDeleteRoom}
      />
    </div>
  );
} 