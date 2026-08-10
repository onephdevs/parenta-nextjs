import { Pool, types } from 'pg';
import bcrypt from 'bcryptjs';
import type { CreateUserData, User, DatabaseUser, UserRole } from '@/types/auth.types';

/**
 * TIMESTAMP WITHOUT TIME ZONE is stored in UTC (DB session TimeZone = UTC),
 * but node-pg otherwise treats values as the Node process local zone (e.g. UTC+8),
 * which makes "just now" show as "~8h ago" in the Philippines.
 */
types.setTypeParser(types.builtins.TIMESTAMP, (value: string) => {
  if (!value) return value;
  // "2026-08-04 15:43:53.514772" → treat as UTC
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  return new Date(normalized.endsWith('Z') ? normalized : `${normalized}Z`);
});

/**
 * Shared PostgreSQL pool (singleton).
 * All runtime modules must import this — never create a second Pool.
 * globalThis guard prevents duplicate pools under Next.js HMR.
 *
 * Remote Postgres (Supabase / NAT) often drops idle sockets; without keepAlive
 * and a one-shot retry, the next query hangs until `read ETIMEDOUT`.
 */
const connectionString = process.env.DATABASE_URL;
const useSsl =
  process.env.NODE_ENV === 'production' ||
  Boolean(connectionString?.includes('supabase')) ||
  Boolean(connectionString?.includes('vercel'));

function isTransientDbError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string; syscall?: string };
  const code = e.code || '';
  const message = e.message || '';
  return (
    code === 'ETIMEDOUT' ||
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'EPIPE' ||
    code === 'ENOTFOUND' ||
    code === '57P01' || // admin_shutdown
    code === '57P02' || // crash_shutdown
    code === '57P03' || // cannot_connect_now
    code === '08006' || // connection_failure
    code === '08001' ||
    code === '08003' ||
    /connection terminated/i.test(message) ||
    /Client has encountered a connection error/i.test(message) ||
    /timeout exceeded when trying to connect/i.test(message)
  );
}

function attachPoolGuards(p: Pool): Pool {
  p.on('error', (err) => {
    // Idle clients can error after the remote closes the socket; swallow so
    // the process does not crash, and let the pool discard the client.
    console.error('[db] unexpected idle client error:', err.message);
  });

  const originalQuery = p.query.bind(p) as Pool['query'];
  // One automatic retry after a dead-socket failure; the bad client is removed
  // from the pool so the retry typically opens a fresh connection.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (p as any).query = (...args: any[]) => {
    const result = (originalQuery as (...a: unknown[]) => unknown)(...args);
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      return (result as Promise<unknown>).catch(async (error: unknown) => {
        if (!isTransientDbError(error)) throw error;
        console.warn(
          '[db] transient connection error, retrying once:',
          (error as { code?: string; message?: string }).code ||
            (error as Error).message
        );
        return (originalQuery as (...a: unknown[]) => unknown)(...args);
      });
    }
    return result;
  };

  return p;
}

const POOL_GUARD_VERSION = 1;

const globalForPg = globalThis as typeof globalThis & {
  __parentaPgPool?: Pool;
  __parentaPgPoolGuardVersion?: number;
};

function createPool(): Pool {
  return attachPoolGuards(
    new Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      max: 10, // single PM2 process; keep conservative vs Supabase pooler limits
      // Recycle before remote idle killers; keepAlive detects half-open sockets.
      idleTimeoutMillis: 15_000,
      connectionTimeoutMillis: 10_000, // fail fast under exhaustion (default 0 waits forever)
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
      allowExitOnIdle: true,
    })
  );
}

if (
  !globalForPg.__parentaPgPool ||
  globalForPg.__parentaPgPoolGuardVersion !== POOL_GUARD_VERSION
) {
  const previous = globalForPg.__parentaPgPool;
  if (previous) {
    void previous.end().catch(() => undefined);
  }
  globalForPg.__parentaPgPool = createPool();
  globalForPg.__parentaPgPoolGuardVersion = POOL_GUARD_VERSION;
}

const pool = globalForPg.__parentaPgPool;

// Convert database user to app user format
function mapDatabaseUserToUser(dbUser: DatabaseUser): User {
  return {
    id: dbUser.id,
    email: dbUser.email ?? null,
    username: dbUser.username ?? null,
    role: dbUser.role,
    firstName: dbUser.first_name,
    lastName: dbUser.last_name,
    isActive: dbUser.is_active,
    emailVerified: dbUser.email_verified,
    profileCompleted: dbUser.profile_completed !== false,
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at,
  };
}

// Create a new user
export async function createUser(userData: CreateUserData): Promise<User> {
  const {
    email,
    username,
    password,
    role,
    firstName,
    lastName,
    isActive = true,
    profileCompleted = true,
  } = userData;

  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  const normalizedEmail = email ? email.toLowerCase().trim() : null;
  const normalizedUsername = username ? username.trim() : null;

  if (!normalizedEmail && !normalizedUsername) {
    throw new Error('Email or username is required');
  }

  const query = `
    INSERT INTO users (email, username, password_hash, role, first_name, last_name, is_active, profile_completed)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;

  const values = [
    normalizedEmail,
    normalizedUsername,
    passwordHash,
    role,
    firstName,
    lastName,
    isActive,
    profileCompleted,
  ];

  try {
    const result = await pool.query(query, values);
    const dbUser = result.rows[0] as DatabaseUser;
    return mapDatabaseUserToUser(dbUser);
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate key')) {
      throw new Error('User with this email or username already exists');
    }
    throw error;
  }
}

// Find user by email and role
export async function findUserByEmailAndRole(email: string, role: UserRole): Promise<User | null> {
  const query = `
    SELECT * FROM users 
    WHERE lower(email) = lower($1) AND role = $2 AND is_active = true
  `;
  
  const result = await pool.query(query, [email, role]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const dbUser = result.rows[0] as DatabaseUser;
  return mapDatabaseUserToUser(dbUser);
}

// Find user by ID
export async function findUserById(id: string): Promise<User | null> {
  const query = `
    SELECT * FROM users 
    WHERE id = $1 AND is_active = true
  `;
  
  const result = await pool.query(query, [id]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const dbUser = result.rows[0] as DatabaseUser;
  return mapDatabaseUserToUser(dbUser);
}

/**
 * Verify password using email OR username as the login identifier.
 * When role is omitted, any active account matching the identifier is accepted.
 */
export async function verifyPassword(
  loginId: string,
  role: UserRole | null | undefined,
  password: string
): Promise<User | null> {
  const identifier = String(loginId || '').trim();
  if (!identifier) return null;

  const query = role
    ? `
    SELECT * FROM users 
    WHERE role = $2
      AND is_active = true
      AND (
        (email IS NOT NULL AND lower(email) = lower($1))
        OR (username IS NOT NULL AND lower(username) = lower($1))
      )
    LIMIT 1
  `
    : `
    SELECT * FROM users 
    WHERE is_active = true
      AND (
        (email IS NOT NULL AND lower(email) = lower($1))
        OR (username IS NOT NULL AND lower(username) = lower($1))
      )
    ORDER BY CASE role
      WHEN 'admin' THEN 0
      WHEN 'caretaker' THEN 1
      WHEN 'staff' THEN 2
      WHEN 'tenant' THEN 3
      ELSE 4
    END
    LIMIT 1
  `;

  const result = role
    ? await pool.query(query, [identifier, role])
    : await pool.query(query, [identifier]);

  if (result.rows.length === 0) {
    return null;
  }

  const dbUser = result.rows[0] as DatabaseUser;
  const isValidPassword = await bcrypt.compare(password, dbUser.password_hash);

  if (!isValidPassword) {
    return null;
  }

  return mapDatabaseUserToUser(dbUser);
}

// Initialize database tables (run this once)
export async function initializeDatabase(): Promise<void> {
  try {
    // Read and execute the complete schema
    const fs = await import('fs');
    const path = await import('path');
    const schemaPath = path.join(process.cwd(), 'src/lib/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema in a transaction
    await pool.query('BEGIN');
    await pool.query(schema);
    await pool.query('COMMIT');
    
    console.log('Database tables initialized successfully with complete schema');
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

export { pool };
export default pool;
 