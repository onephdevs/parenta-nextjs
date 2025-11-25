'use client';

import { useState } from 'react';
import { ReservationWithDetails } from '@/types/database';
import ReservationsList from './ReservationsList';
import CreateReservationModal from './CreateReservationModal';

interface ReservationsClientProps {
  initialReservations: ReservationWithDetails[];
}

export default function ReservationsClient({ initialReservations }: ReservationsClientProps) {
  const [reservations, setReservations] = useState(initialReservations);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleRefresh = async () => {
    try {
      const response = await fetch('/api/reservations?limit=1000');
      const result = await response.json();
      
      if (result.success) {
        setReservations(result.data.reservations);
      }
    } catch (error) {
      console.error('Error refreshing reservations:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reservations</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage room reservations and convert them to assignments
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          Create Reservation
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Active Reservations</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {reservations.filter(r => r.reservationStatus === 'active').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Expired</div>
          <div className="mt-2 text-3xl font-bold text-red-600">
            {reservations.filter(r => r.isExpired && r.reservationStatus === 'active').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Expiring Soon</div>
          <div className="mt-2 text-3xl font-bold text-yellow-600">
            {reservations.filter(r => r.daysUntilExpiry <= 7 && r.daysUntilExpiry >= 0 && r.reservationStatus === 'active').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Converted</div>
          <div className="mt-2 text-3xl font-bold text-blue-600">
            {reservations.filter(r => r.reservationStatus === 'converted').length}
          </div>
        </div>
      </div>

      {/* Reservations List */}
      <ReservationsList reservations={reservations} onRefresh={handleRefresh} />

      {/* Create Modal */}
      <CreateReservationModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          handleRefresh();
        }}
      />
    </div>
  );
}

