import { getAllReservations } from '@/lib/api/reservations';
import ReservationsClient from '@/components/features/reservations/ReservationsClient';
import CreateReservationButton from '@/components/features/reservations/CreateReservationButton';

export const revalidate = 0;

export default async function ReservationsPage() {
  const result = await getAllReservations({ limit: 1000 });
  const reservations = result.reservations;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Reservations
              </h1>
              <p className="mt-1 text-sm text-gray-900">
                Manage room reservations and convert them to assignments
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <CreateReservationButton />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <ReservationsClient initialReservations={reservations} />
      </div>
    </div>
  );
}

