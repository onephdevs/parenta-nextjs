import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';

export type AppRole = 'admin' | 'staff' | 'tenant' | 'caretaker';

/**
 * Require an authenticated session with one of the allowed roles.
 * Returns either the session or a 401 NextResponse.
 */
export async function requireRole(allowed: AppRole[] = ['admin']) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role as AppRole | undefined;

  if (!session || !role || !allowed.includes(role)) {
    return {
      session: null,
      error: NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      ),
    };
  }

  return { session, error: null };
}

export async function requireAdmin() {
  return requireRole(['admin', 'caretaker']);
}

export async function requireAdminOrStaff() {
  return requireRole(['admin', 'staff', 'caretaker']);
}

/** Same as requireAdmin — caretaker is not a separate office role. */
export async function requireAdminOrCaretaker() {
  return requireRole(['admin', 'caretaker']);
}
