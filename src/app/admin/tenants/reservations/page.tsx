import { getAllReservations } from '@/lib/api/reservations';
import ReservationsClient from '@/components/features/reservations/ReservationsClient';
import CreateReservationButton from '@/components/features/reservations/CreateReservationButton';
import { PageHeader } from '@/components/ui/PageHeader';

export const revalidate = 0;

export default async function ReservationsPage() {
  const result = await getAllReservations({ limit: 1000 });
  const reservations = result.reservations;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Reservations"
        description="Manage room reservations and convert them to assignments"
        actions={<CreateReservationButton />}
      />

      <ReservationsClient initialReservations={reservations} />
    </div>
  );
}
