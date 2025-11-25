import { getReservationById } from '@/lib/api/reservations';
import { notFound } from 'next/navigation';
import ReservationDetail from '@/components/features/reservations/ReservationDetail';

export const revalidate = 0;

interface ReservationDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ convert?: string }>;
}

export default async function ReservationDetailPage({
  params,
  searchParams,
}: ReservationDetailPageProps) {
  const { id } = await params;
  const { convert } = await searchParams;
  
  const reservation = await getReservationById(id);

  if (!reservation) {
    notFound();
  }

  return <ReservationDetail reservation={reservation} showConvertModal={convert === 'true'} />;
}

