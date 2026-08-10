import type { NextAuthOptions, Session } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { verifyPassword, findUserById } from './db';
import type { LoginCredentials, UserRole } from '@/types/auth.types';
import { homePathForRole } from '@/lib/auth/home-path';

export { homePathForRole };

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { 
          label: 'Email or username', 
          type: 'text',
          placeholder: 'Enter your email or username' 
        },
        password: { 
          label: 'Password', 
          type: 'password',
          placeholder: 'Enter your password' 
        },
        role: {
          label: 'Role',
          type: 'text'
        }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing credentials');
        }

        const { email, password, role } = credentials as LoginCredentials;
        const roleHint =
          role && role !== 'auto' && ['admin', 'tenant', 'staff', 'caretaker'].includes(role)
            ? (role as UserRole)
            : null;

        try {
          // Prefer role hint when provided (legacy portals); otherwise detect from account.
          let user = await verifyPassword(email, roleHint, password);

          // Admin portal historically also accepted caretaker when role=admin
          if (!user && roleHint === 'admin') {
            user = await verifyPassword(email, 'caretaker', password);
          }

          if (!user) {
            throw new Error('Invalid credentials or user not found');
          }

          return {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            profileCompleted: user.profileCompleted,
          };
        } catch (error) {
          console.error('Authentication error:', error);
          throw new Error('Authentication failed');
        }
      },
    }),
  ],
  
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },

  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Store user info in JWT when user signs in
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.email = user.email;
        token.username = user.username;
        token.profileCompleted = user.profileCompleted;
      }

      // Support session.update() after profile edits
      if (trigger === 'update' && session) {
        if (session.firstName !== undefined) token.firstName = session.firstName;
        if (session.lastName !== undefined) token.lastName = session.lastName;
        if (session.email !== undefined) token.email = session.email;
        if (session.username !== undefined) token.username = session.username;
        if (session.profileCompleted !== undefined) {
          token.profileCompleted = session.profileCompleted;
        }
      }

      return token;
    },

    async session({ session, token }) {
      // Send properties to the client
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.email = (token.email as string | null | undefined) ?? null;
        session.user.username = (token.username as string | null | undefined) ?? null;
        session.user.profileCompleted = token.profileCompleted !== false;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // Handle redirects after sign in
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      // Allow callback URLs on the same origin
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    },
  },

  events: {
    async signIn({ user }) {
      console.log(`User ${user.email} signed in with role: ${user.role}`);
    },
    async signOut({ token }) {
      console.log(`User signed out: ${token?.email || 'unknown'}`);
    },
  },

  debug: process.env.NODE_ENV === 'development',
};

// Helper function to get user session with proper typing
export async function getCurrentUser(session: Session | null) {
  if (!session?.user?.id) {
    return null;
  }

  try {
    const user = await findUserById(session.user.id);
    return user;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
} 