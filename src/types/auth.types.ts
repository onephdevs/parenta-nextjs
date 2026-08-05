// Authentication related types

export type UserRole = 'admin' | 'tenant';

export interface User {
  id: string;
  email: string | null;
  username: string | null;
  role: UserRole;
  firstName: string;
  lastName: string;
  isActive: boolean;
  emailVerified: boolean;
  profileCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email?: string | null;
  username?: string | null;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  /** When false, user cannot sign in until an admin activates the account */
  isActive?: boolean;
  profileCompleted?: boolean;
}

export interface LoginCredentials {
  /** Email or username */
  email: string;
  password: string;
  role: UserRole;
}

export interface AuthSession {
  user: {
    id: string;
    email: string | null;
    username?: string | null;
    role: UserRole;
    firstName: string;
    lastName: string;
    profileCompleted?: boolean;
  };
  expires: string;
}

export interface DatabaseUser {
  id: string;
  email: string | null;
  username: string | null;
  password_hash: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  is_active: boolean;
  email_verified: boolean;
  profile_completed: boolean;
  created_at: Date;
  updated_at: Date;
}
