import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './migrations/schema';
import * as relations from './migrations/relations';

/**
 * PostgreSQL connection pool configuration
 * Using connection pooling for better performance and resource management
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/chief_ai',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return error after 10 seconds if connection cannot be established
});

/**
 * Drizzle ORM database client
 * Configured with:
 * - Full schema definitions for type safety
 * - Relations for join operations
 * - Connection pooling for performance
 */
export const db = drizzle(pool, {
  schema: { ...schema, ...relations },
});

/**
 * Direct access to the connection pool for advanced queries
 * Use this sparingly - prefer using the `db` client
 */
export { pool };

/**
 * Graceful shutdown handler
 * Call this when your application is shutting down
 */
export const closeDatabase = async () => {
  await pool.end();
  console.log('Database connection pool closed');
};

// Export all schema tables for easy access
export * from './migrations/schema';
export * from './migrations/relations';
