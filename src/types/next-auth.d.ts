import 'next-auth';
import 'next-auth/jwt';
import type { UserRole } from '@/types/auth.types';

declare module 'next-auth' {
  interface User {
    id: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    username?: string | null;
    profileCompleted?: boolean;
    email?: string | null;
  }

  interface Session {
    user: {
      id: string;
      email?: string | null;
      username?: string | null;
      role: UserRole;
      firstName: string;
      lastName: string;
      profileCompleted?: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    username?: string | null;
    profileCompleted?: boolean;
    email?: string | null;
  }
}
