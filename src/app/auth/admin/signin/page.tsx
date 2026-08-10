import { redirect } from 'next/navigation';

/** Legacy admin login — use unified /auth/signin */
export default function AdminSignInRedirect() {
  redirect('/auth/signin');
}
