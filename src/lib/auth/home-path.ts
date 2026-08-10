import type { UserRole } from '@/types/auth.types';

/** Post-login home path for a user role. Safe for client and server. */
export function homePathForRole(role: UserRole | string | undefined | null): string {
  switch (role) {
    case 'tenant':
      return '/tenant';
    case 'staff':
      return '/staff';
    case 'admin':
    case 'caretaker':
      return '/admin';
    default:
      return '/';
  }
}
