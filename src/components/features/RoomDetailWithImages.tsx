'use client';

import { useState, useEffect } from 'react';
import { Image } from '@/lib/api/images';
import ImageUpload from '@/components/features/ImageUpload';
import ImageGallery from '@/components/features/ImageGallery';
import { useNotifications } from '@/hooks/useNotifications';

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
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  assignmentId: string;
  startDate: Date;
  monthlyRate: number;
  tenantStatus: string;
}

interface AssignmentHistory {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  startDate: Date;
  endDate?: Date;
  monthlyRate: number;
  assignmentStatus: string;
}

interface FinancialSummary {
  totalRevenue: number;
  totalPayments: number;
  outstandingBalance: number;
  averageMonthlyRevenue: number;
  lastPaymentDate?: Date;
  lastPaymentAmount?: number;
}

interface OccupancyMetrics {
  total_assignments: number;
  occupancy_rate_percent: number;
  average_stay_duration_days: number;
  total_revenue: number;
}

interface RoomDetailWithImagesProps {
  roomDetails: {
    room: Room;
    currentTenant: CurrentTenant | null;
    assignmentHistory: AssignmentHistory[];
    financialSummary: FinancialSummary;
    occupancyMetrics: OccupancyMetrics;
  };
}

export default function RoomDetailWithImages({ roomDetails }: RoomDetailWithImagesProps) {
  const { addNotification } = useNotifications();
  const [images, setImages] = useState<Image[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  // Fetch room images
  const fetchImages = async () => {
    try {
      const response = await fetch(`/api/images?entityType=room&entityId=${roomDetails.room.id}`);
      const result = await response.json();

      if (result.success) {
        setImages(result.data);
      } else {
        console.error('Failed to fetch images:', result.error);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [roomDetails.room.id]);

  const handleUploadComplete = () => {
    fetchImages(); // Refresh images after upload
    setShowUpload(false); // Close upload interface
  };

  const handleImageUpdate = () => {
    fetchImages(); // Refresh images after any update
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
      case 'occupied': return '👤';
      case 'vacant': return '🏠';
      case 'maintenance': return '🔧';
      case 'reserved': return '📅';
      default: return '❓';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Room Photos Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Room Photos</h3>
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Photos
            </button>
          </div>

          {/* Upload Interface */}
          {showUpload && (
            <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
              <ImageUpload
                entityType="room"
                entityId={roomDetails.room.id}
                onUploadComplete={handleUploadComplete}
                maxImages={15}
              />
            </div>
          )}

          {/* Images Gallery */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-2 text-gray-900">Loading images...</span>
            </div>
          ) : (
            <ImageGallery
              images={images}
              entityType="room"
              entityId={roomDetails.room.id}
              onImageUpdate={handleImageUpdate}
              showUpload={!showUpload}
            />
          )}
        </div>
      </div>

      {/* Room Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Room Information</h3>
              <div className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium border ${getStatusColor(roomDetails.room.roomStatus)}`}>
                {getStatusIcon(roomDetails.room.roomStatus)}
                <span className="ml-2 capitalize">{roomDetails.room.roomStatus}</span>
              </div>
            </div>
            <dl className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <dt className="text-sm font-medium text-gray-900">Room Number</dt>
                <dd className="col-span-2 text-sm font-semibold text-gray-900">{roomDetails.room.roomNumber}</dd>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <dt className="text-sm font-medium text-gray-900">Building</dt>
                <dd className="col-span-2 text-sm text-gray-900">{roomDetails.room.buildingName}</dd>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <dt className="text-sm font-medium text-gray-900">Floor</dt>
                <dd className="col-span-2 text-sm text-gray-900">{roomDetails.room.floorNumber || 'Not specified'}</dd>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <dt className="text-sm font-medium text-gray-900">Type</dt>
                <dd className="col-span-2 text-sm text-gray-900 capitalize">{roomDetails.room.roomType}</dd>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <dt className="text-sm font-medium text-gray-900">Square Footage</dt>
                <dd className="col-span-2 text-sm text-gray-900">{roomDetails.room.squareFootage ? `${roomDetails.room.squareFootage} sq ft` : 'Not specified'}</dd>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <dt className="text-sm font-medium text-gray-900">Monthly Rate</dt>
                <dd className="col-span-2 text-sm font-semibold text-purple-600">{formatCurrency(roomDetails.room.monthlyRate)}</dd>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <dt className="text-sm font-medium text-gray-900">Deposit</dt>
                <dd className="col-span-2 text-sm text-gray-900">{roomDetails.room.depositAmount ? formatCurrency(roomDetails.room.depositAmount) : 'Not specified'}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Room Statistics */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Room Statistics</h3>
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
                <dt className="text-sm font-medium text-gray-900">Avg Stay Duration</dt>
                <dd className="col-span-2 text-sm text-gray-900">{Math.round(roomDetails.occupancyMetrics.average_stay_duration_days)} days</dd>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <dt className="text-sm font-medium text-gray-900">Total Revenue</dt>
                <dd className="col-span-2 text-lg font-semibold text-green-600">{formatCurrency(roomDetails.occupancyMetrics.total_revenue)}</dd>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <dt className="text-sm font-medium text-gray-900">Created</dt>
                <dd className="col-span-2 text-sm text-gray-900">{new Date(roomDetails.room.createdAt).toLocaleDateString()}</dd>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <dt className="text-sm font-medium text-gray-900">Active</dt>
                <dd className={`col-span-2 text-sm font-medium ${roomDetails.room.isActive ? 'text-green-600' : 'text-red-600'}`}>
                  {roomDetails.room.isActive ? 'Yes' : 'No'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Current Tenant */}
      {roomDetails.currentTenant && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Current Tenant</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-medium text-gray-900">
                    {roomDetails.currentTenant.firstName} {roomDetails.currentTenant.lastName}
                  </h4>
                  <p className="text-sm text-gray-900">{roomDetails.currentTenant.email}</p>
                  {roomDetails.currentTenant.phone && (
                    <p className="text-sm text-gray-900">{roomDetails.currentTenant.phone}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(roomDetails.currentTenant.monthlyRate)}/month
                  </p>
                  <p className="text-sm text-gray-900">
                    Since {new Date(roomDetails.currentTenant.startDate).toLocaleDateString()}
                  </p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {roomDetails.currentTenant.tenantStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      {roomDetails.room.description && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-3">Description</h3>
            <p className="text-sm text-gray-900">{roomDetails.room.description}</p>
          </div>
        </div>
      )}

      {/* Amenities */}
      {roomDetails.room.amenities && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-3">Amenities</h3>
            <div className="text-gray-900 bg-gray-50 p-4 rounded-md">
              {Array.isArray(roomDetails.room.amenities) 
                ? roomDetails.room.amenities.join(', ') 
                : (typeof roomDetails.room.amenities === 'string' 
                    ? roomDetails.room.amenities 
                    : String(roomDetails.room.amenities || ''))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 