import { getAllReservations } from '@/lib/api/reservations';
import ReservationsList from '@/components/features/reservations/ReservationsList';
import CreateReservationModal from '@/components/features/reservations/CreateReservationModal';
import ReservationsClient from '@/components/features/reservations/ReservationsClient';

export const revalidate = 0;

export default async function ReservationsPage() {
  const result = await getAllReservations({ limit: 1000 });
  const reservations = result.reservations;

  return <ReservationsClient initialReservations={reservations} />;
}

