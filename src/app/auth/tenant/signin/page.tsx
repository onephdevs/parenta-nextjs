import { redirect } from 'next/navigation';

/** Legacy tenant login — use unified /auth/signin */
export default function TenantSignInRedirect() {
  redirect('/auth/signin');
}
