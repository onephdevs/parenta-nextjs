import { redirect } from 'next/navigation';

interface SignInPageProps {
  searchParams: Promise<{ role?: string }>;
}

/**
 * Legacy generic sign-in route.
 * Role-specific portals own the real UIs — this only redirects.
 */
export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const role = params.role?.toLowerCase();

  if (role === 'admin') {
    redirect('/auth/admin/signin');
  }

  if (role === 'tenant') {
    redirect('/auth/tenant/signin');
  }

  // NextAuth default signIn (no role) — send to tenant portal
  redirect('/auth/tenant/signin');
}
