import 'next-auth';
import 'next-auth/jwt';
import type { UserRole } from '@/types/auth.types';

declare module 'next-auth' {
  interface User {
    id: string;
    role: UserRole;
    firstName: string;
    lastName: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      role: UserRole;
      firstName: string;
      lastName: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    firstName: string;
    lastName: string;
  }
}
