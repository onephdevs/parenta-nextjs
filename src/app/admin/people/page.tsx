import { redirect } from 'next/navigation';

/** Hidden — People directory is not in the office UI. Use Tenants. */
export default function PeoplePage() {
  redirect('/admin/tenants');
}
