import { redirect } from 'next/navigation';

/** Legacy URL — People directory replaced Community. */
export default function CommunityRedirectPage() {
  redirect('/admin/people');
}
