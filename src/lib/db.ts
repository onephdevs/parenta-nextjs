import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import type { CreateUserData, User, DatabaseUser, UserRole } from '@/types/auth.types';

/**
 * Shared PostgreSQL pool (singleton).
 * All runtime modules must import this — never create a second Pool.
 * globalThis guard prevents duplicate pools under Next.js HMR.
 */
const connectionString = process.env.DATABASE_URL;
const useSsl =
  process.env.NODE_ENV === 'production' ||
  Boolean(connectionString?.includes('supabase')) ||
  Boolean(connectionString?.includes('vercel'));

const globalForPg = globalThis as typeof globalThis & { __parentaPgPool?: Pool };

const pool =
  globalForPg.__parentaPgPool ??
  new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    max: 10, // single PM2 process; keep conservative vs Supabase pooler limits
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000, // fail fast under exhaustion (default 0 waits forever)
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPg.__parentaPgPool = pool;
}

// Convert database user to app user format
function mapDatabaseUserToUser(dbUser: DatabaseUser): User {
  return {
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role,
    firstName: dbUser.first_name,
    lastName: dbUser.last_name,
    isActive: dbUser.is_active,
    emailVerified: dbUser.email_verified,
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at,
  };
}

// Create a new user
export async function createUser(userData: CreateUserData): Promise<User> {
  const { email, password, role, firstName, lastName, isActive = true } = userData;
  
  // Hash password
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  
  const query = `
    INSERT INTO users (email, password_hash, role, first_name, last_name, is_active)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  
  const values = [email, passwordHash, role, firstName, lastName, isActive];
  
  try {
    const result = await pool.query(query, values);
    const dbUser = result.rows[0] as DatabaseUser;
    return mapDatabaseUserToUser(dbUser);
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate key')) {
      throw new Error('User with this email already exists');
    }
    throw error;
  }
}

// Find user by email and role
export async function findUserByEmailAndRole(email: string, role: UserRole): Promise<User | null> {
  const query = `
    SELECT * FROM users 
    WHERE email = $1 AND role = $2 AND is_active = true
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

// Verify user password
export async function verifyPassword(email: string, role: UserRole, password: string): Promise<User | null> {
  const query = `
    SELECT * FROM users 
    WHERE email = $1 AND role = $2 AND is_active = true
  `;
  
  const result = await pool.query(query, [email, role]);
  
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
 