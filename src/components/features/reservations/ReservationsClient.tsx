'use client';

import { useState, useEffect, useCallback } from 'react';
import { ReservationWithDetails } from '@/types/database';
import ReservationsList from './ReservationsList';

interface ReservationsClientProps {
  initialReservations: ReservationWithDetails[];
}

export default function ReservationsClient({ initialReservations }: ReservationsClientProps) {
  const [reservations, setReservations] = useState(initialReservations);

  const handleRefresh = useCallback(async () => {
    try {
      const response = await fetch('/api/reservations?limit=1000');
      const result = await response.json();
      
      if (result.success) {
        setReservations(result.data.reservations);
      }
    } catch (error) {
      console.error('Error refreshing reservations:', error);
    }
  }, []);

  // Listen for reservation created event to refresh the list
  useEffect(() => {
    const handleReservationCreated = () => {
      handleRefresh();
    };

    window.addEventListener('reservationCreated', handleReservationCreated);
    return () => {
      window.removeEventListener('reservationCreated', handleReservationCreated);
    };
  }, [handleRefresh]);

  return (
    <div className="space-y-6">
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
    </div>
  );
}

