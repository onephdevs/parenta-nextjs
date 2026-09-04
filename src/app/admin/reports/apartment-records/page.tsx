import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getApartmentRecords } from '@/lib/services/apartment-records-service';
import ApartmentRecordsView from '@/components/features/reports/ApartmentRecordsView';

export const metadata = {
  title: 'Apartment records | Parenta',
  description: 'Building ledger of paid and unpaid tenants, expenses, and period summary',
};

export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ApartmentRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; buildingId?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  const params = await searchParams;
  const buildingIdRaw = params.buildingId || '';
  const buildingId = UUID_RE.test(buildingIdRaw) ? buildingIdRaw : null;
  const month = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : undefined;

  const data = await getApartmentRecords({ month, buildingId });

  return (
    <div className="p-6">
      <ApartmentRecordsView data={data} />
    </div>
  );
}
