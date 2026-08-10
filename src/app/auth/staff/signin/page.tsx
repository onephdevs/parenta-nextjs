import { redirect } from 'next/navigation';

/** Legacy staff login — use unified /auth/signin */
export default function StaffSignInRedirect() {
  redirect('/auth/signin');
}
