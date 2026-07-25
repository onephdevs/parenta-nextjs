'use client';

import { useState, useEffect, useCallback } from 'react';
import { ReservationWithDetails } from '@/types/database';
import ReservationsList from './ReservationsList';
import { StatCard } from '@/components/ui/StatCard';
import { AlertTriangle, CheckCircle2, Clock, CalendarDays } from 'lucide-react';

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

  useEffect(() => {
    const handleReservationCreated = () => {
      handleRefresh();
    };

    window.addEventListener('reservationCreated', handleReservationCreated);
    return () => {
      window.removeEventListener('reservationCreated', handleReservationCreated);
    };
  }, [handleRefresh]);

  const activeCount = reservations.filter((r) => r.reservationStatus === 'active').length;
  const expiredCount = reservations.filter(
    (r) => r.isExpired && r.reservationStatus === 'active'
  ).length;
  const expiringSoonCount = reservations.filter(
    (r) =>
      r.daysUntilExpiry <= 7 &&
      r.daysUntilExpiry >= 0 &&
      r.reservationStatus === 'active'
  ).length;
  const convertedCount = reservations.filter((r) => r.reservationStatus === 'converted').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Active Reservations"
          value={activeCount}
          tone="default"
          icon={<CalendarDays className="h-5 w-5" />}
        />
        <StatCard
          title="Expired"
          value={expiredCount}
          tone="red"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatCard
          title="Expiring Soon"
          value={expiringSoonCount}
          tone="yellow"
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          title="Converted"
          value={convertedCount}
          tone="blue"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
      </div>

      <ReservationsList reservations={reservations} onRefresh={handleRefresh} />
    </div>
  );
}
