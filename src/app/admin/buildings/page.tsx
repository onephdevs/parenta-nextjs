import { redirect } from 'next/navigation';

interface BuildingsPageProps {
  searchParams: Promise<{ buildingId?: string; page?: string }>;
}

/** Legacy URL — properties list now lives at /admin/properties */
export default async function BuildingsPage({ searchParams }: BuildingsPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.buildingId) query.set('buildingId', params.buildingId);
  if (params.page) query.set('page', params.page);
  const qs = query.toString();
  redirect(qs ? `/admin/properties?${qs}` : '/admin/properties');
}
