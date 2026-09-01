import { redirect } from 'next/navigation';

/** Legacy URL — Community/People directory is hidden. Use Tenants. */
export default function CommunityRedirectPage() {
  redirect('/admin/tenants');
}
