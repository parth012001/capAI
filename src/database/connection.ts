import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,

  // NEON SERVERLESS-OPTIMIZED CONNECTION POOLING (PRODUCTION READY)
  max: 100, // Maximum concurrent connections (supports 100 concurrent users)
  min: 0, // ✅ FIXED: No warm connections (NEON serverless closes idle connections aggressively)

  // Idle timeout: Match NEON's behavior (closes after ~10-15s idle)
  idleTimeoutMillis: 10000, // ✅ FIXED: 10 seconds (was 30s) - release idle connections fast

  // Connection acquisition timeout
  connectionTimeoutMillis: 30000, // 30 seconds for NEON cold starts (serverless wake-up)

  // Query timeout: 30 seconds (prevents queries from hanging)
  query_timeout: 30000,

  // ✅ FIXED: More aggressive keep-alive to prevent NEON from closing active connections
  keepAlive: true,
  keepAliveInitialDelayMillis: 5000, // Start keep-alive after 5 seconds (was 10s)

  // ✅ NEW: Allow idle connection removal without errors
  allowExitOnIdle: false, // Don't let pool exit when all clients are idle
});

// Critical: Pool error handler to prevent server crashes
// This catches connection drops from NEON's serverless pooler
pool.on('error', (err: any, client) => {
  console.error('❌ [POOL ERROR] Unexpected database pool error:', {
    message: err.message,
    code: err.code,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });
  // Don't exit - let the pool handle reconnection automatically
  // pg-pool will remove the broken connection and create a new one when needed
});

// Log when new connections are created (helps with debugging)
pool.on('connect', (client) => {
  console.log('✅ [POOL] New database connection established');
});

// Log when connections are removed (helps track connection lifecycle)
pool.on('remove', (client) => {
  console.log('🔄 [POOL] Database connection removed from pool');
});

/**
 * Execute a query with automatic retry on connection errors
 * This helps recover from NEON connection drops without crashing
 */
export async function queryWithRetry<T = any>(
  queryText: string,
  params?: any[],
  maxRetries: number = 2
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await pool.query(queryText, params);
      return result as T;
    } catch (error: any) {
      lastError = error;

      // Only retry on connection errors, not on SQL errors
      const isConnectionError =
        error.code === 'ECONNRESET' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'EADDRNOTAVAIL' ||
        error.message?.includes('Connection terminated') ||
        error.message?.includes('Connection closed');

      if (isConnectionError && attempt < maxRetries) {
        console.warn(`⚠️  [RETRY] Database connection error, attempt ${attempt}/${maxRetries}:`, {
          code: error.code,
          message: error.message
        });
        // Wait a bit before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
        continue;
      }

      // Either not a connection error, or we've exhausted retries
      throw error;
    }
  }

  throw lastError || new Error('Query failed after retries');
}

export async function testConnection(maxRetries = 3, retryDelay = 2000) {
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔌 [DATABASE] Connection attempt ${attempt}/${maxRetries}...`);

      const startTime = Date.now();
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      const connectionTime = Date.now() - startTime;

      console.log(`✅ Database connected successfully in ${connectionTime}ms:`, result.rows[0].now);

      // Warn if connection was slow (indicates cold start)
      if (connectionTime > 5000) {
        console.warn(`⚠️  [DATABASE] Slow connection detected (${connectionTime}ms) - NEON cold start likely occurred`);
      }

      client.release();
      return true;

    } catch (error: any) {
      lastError = error;

      // Check if this is a timeout/connection error worth retrying
      const isRetryableError =
        error.message?.includes('timeout') ||
        error.message?.includes('Connection terminated') ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('ETIMEDOUT') ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === '57P03'; // NEON-specific: cannot connect now

      if (isRetryableError && attempt < maxRetries) {
        const waitTime = retryDelay * attempt; // Exponential backoff: 2s, 4s, 6s
        console.warn(`⚠️  [DATABASE] Connection attempt ${attempt}/${maxRetries} failed (NEON cold start?)`);
        console.warn(`   Error: ${error.message}`);
        console.warn(`   Retrying in ${waitTime}ms...`);

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      // Either not retryable, or we've exhausted retries
      console.error(`❌ Database connection failed (attempt ${attempt}/${maxRetries}):`, {
        message: error.message,
        code: error.code,
        stack: error.stack
      });

      if (attempt === maxRetries) {
        console.error('❌ All connection attempts exhausted. Database unavailable.');
        return false;
      }
    }
  }

  console.error('❌ Database connection failed after', maxRetries, 'attempts');
  return false;
}

/**
 * Gracefully close database connection pool
 * Call this during server shutdown to prevent connection leaks
 */
export async function closePool(): Promise<void> {
  try {
    await pool.end();
    console.log('✅ Database pool closed successfully');
  } catch (error) {
    console.error('❌ Error closing database pool:', error);
    throw error;
  }
}

export async function initializeDatabase() {
  try {
    const fs = require('fs');
    const path = require('path');

    // Use complete working schema exported from local database
    // This ensures Neon matches local exactly (39 tables, all columns)
    const completeSchemaPath = path.join(__dirname, '../../scripts/database/complete_working_schema.sql');

    if (fs.existsSync(completeSchemaPath)) {
      console.log('📥 Loading complete working schema...');
      const completeSchema = fs.readFileSync(completeSchemaPath, 'utf8');
      try {
        await pool.query(completeSchema);
        console.log('✅ Database schema initialized (Complete Working Schema - 39 tables)');
      } catch (error: any) {
        // Ignore "already exists" errors
        if (error.code === '42P07' || error.code === '42710' || error.code === '42P06') {
          console.log('✅ Database schema already initialized');
        } else {
          throw error;
        }
      }

      // Apply comprehensive constraint fixes for ALL tables
      console.log('🔧 Applying comprehensive constraint fixes for all tables...');

      const allConstraintsFixPath = path.join(__dirname, '../../scripts/database/add_all_missing_constraints.sql');
      if (fs.existsSync(allConstraintsFixPath)) {
        const allConstraintsFix = fs.readFileSync(allConstraintsFixPath, 'utf8');
        try {
          await pool.query(allConstraintsFix);
          console.log('✅ All table constraints verified/added (10 tables fixed)');
        } catch (error: any) {
          console.log('⚠️  Constraint fix warning:', error.message);
        }
      }

      // Apply timezone support migration
      console.log('🌍 Applying timezone support migration...');

      const timezoneMigrationPath = path.join(__dirname, '../../scripts/database/add_timezone_support.sql');
      if (fs.existsSync(timezoneMigrationPath)) {
        const timezoneMigration = fs.readFileSync(timezoneMigrationPath, 'utf8');
        try {
          await pool.query(timezoneMigration);
          console.log('✅ Timezone support migration applied successfully');
        } catch (error: any) {
          console.log('⚠️  Timezone migration warning:', error.message);
        }
      }

      return true;
    }

    // Fallback to old phase-based initialization if complete schema not found
    const schemaPath = path.join(__dirname, '../../scripts/database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    try {
      await pool.query(schema);
    } catch (error: any) {
      if (error.code !== '42P07') { // Not "already exists" error
        throw error;
      }
    }
    
    // Initialize Phase 1 Webhook to Draft schema
    const phase1WebhookSchemaPath = path.join(__dirname, '../../scripts/database/phase1_webhook_schema.sql');
    if (fs.existsSync(phase1WebhookSchemaPath)) {
      const phase1WebhookSchema = fs.readFileSync(phase1WebhookSchemaPath, 'utf8');
      try {
        await pool.query(phase1WebhookSchema);
      } catch (error: any) {
        if (error.code !== '42P07' && error.code !== '42710') throw error;
      }
    }
    
    // Initialize Phase 2 schema
    const phase2SchemaPath = path.join(__dirname, '../../scripts/database/phase2_schema.sql');
    if (fs.existsSync(phase2SchemaPath)) {
      const phase2Schema = fs.readFileSync(phase2SchemaPath, 'utf8');
      try {
        await pool.query(phase2Schema);
      } catch (error: any) {
        if (error.code !== '42P07' && error.code !== '42710') throw error;
      }
    }
    
    // Initialize Phase 2.2 schema
    const phase2_2SchemaPath = path.join(__dirname, '../../scripts/database/phase2_2_schema.sql');
    if (fs.existsSync(phase2_2SchemaPath)) {
      const phase2_2Schema = fs.readFileSync(phase2_2SchemaPath, 'utf8');
      try {
        await pool.query(phase2_2Schema);
      } catch (error: any) {
        if (error.code !== '42P07' && error.code !== '42710') throw error;
      }
    }
    
    // Initialize Phase 2.3 schema
    const phase2_3SchemaPath = path.join(__dirname, '../../scripts/database/phase2_3_schema.sql');
    if (fs.existsSync(phase2_3SchemaPath)) {
      const phase2_3Schema = fs.readFileSync(phase2_3SchemaPath, 'utf8');
      try {
        await pool.query(phase2_3Schema);
      } catch (error: any) {
        if (error.code !== '42P07' && error.code !== '42710') throw error;
      }
    }
    
    // Initialize Phase 2.4 schema
    const phase2_4SchemaPath = path.join(__dirname, '../../scripts/database/phase2_4_schema.sql');
    if (fs.existsSync(phase2_4SchemaPath)) {
      const phase2_4Schema = fs.readFileSync(phase2_4SchemaPath, 'utf8');
      try {
        await pool.query(phase2_4Schema);
      } catch (error: any) {
        if (error.code !== '42P07' && error.code !== '42710') throw error;
      }
    }
    
    // Initialize Phase 3 Calendar schema
    const phase3CalendarSchemaPath = path.join(__dirname, '../../scripts/database/phase3_calendar_schema.sql');
    if (fs.existsSync(phase3CalendarSchemaPath)) {
      const phase3CalendarSchema = fs.readFileSync(phase3CalendarSchemaPath, 'utf8');
      try {
        await pool.query(phase3CalendarSchema);
      } catch (error: any) {
        if (error.code !== '42P07' && error.code !== '42710') throw error;
      }
    }
    
    // Initialize Phase 3.3 Auto-Scheduling schema
    const phase3_3SchemaPath = path.join(__dirname, '../../scripts/database/phase3_3_schema.sql');
    if (fs.existsSync(phase3_3SchemaPath)) {
      const phase3_3Schema = fs.readFileSync(phase3_3SchemaPath, 'utf8');
      try {
        await pool.query(phase3_3Schema);
      } catch (error: any) {
        if (error.code !== '42P07' && error.code !== '42710') throw error;
      }
    }

    // Initialize Phase 4: Persistent Authentication (24/7 operation)
    const persistentAuthSchemaPath = path.join(__dirname, '../../scripts/database/persistent_auth_schema.sql');
    if (fs.existsSync(persistentAuthSchemaPath)) {
      const persistentAuthSchema = fs.readFileSync(persistentAuthSchemaPath, 'utf8');
      try {
        await pool.query(persistentAuthSchema);
      } catch (error: any) {
        if (error.code !== '42P07' && error.code !== '42710') throw error;
      }
      console.log('✅ Database schema initialized (Phase 1-4: Full 24/7 AI Assistant)');
    }

    // Initialize User Profile Schema (name collection)
    const userProfileSchemaPath = path.join(__dirname, '../../scripts/database/user_profile_schema.sql');
    if (fs.existsSync(userProfileSchemaPath)) {
      const userProfileSchema = fs.readFileSync(userProfileSchemaPath, 'utf8');
      try {
        await pool.query(userProfileSchema);
      } catch (error: any) {
        if (error.code !== '42P07' && error.code !== '42710') throw error;
      }
    }

    // Initialize Scheduling Link Schema
    const schedulingLinkSchemaPath = path.join(__dirname, '../../scripts/database/scheduling_link_schema.sql');
    if (fs.existsSync(schedulingLinkSchemaPath)) {
      const schedulingLinkSchema = fs.readFileSync(schedulingLinkSchemaPath, 'utf8');
      try {
        await pool.query(schedulingLinkSchema);
      } catch (error: any) {
        if (error.code !== '42P07' && error.code !== '42710') throw error;
      }
    }

    // Apply user_id column fixes (for multi-user support)
    const userIdFixPath = path.join(__dirname, '../../scripts/database/add_missing_user_id_columns.sql');
    if (fs.existsSync(userIdFixPath)) {
      const userIdFix = fs.readFileSync(userIdFixPath, 'utf8');
      try {
        await pool.query(userIdFix);
      } catch (error: any) {
        if (error.code !== '42701') throw error; // Ignore "column already exists" errors
      }
    }

    if (fs.existsSync(phase3_3SchemaPath)) {
      console.log('✅ Database schema initialized (Phase 1 + 2 + 2.2 + 2.3 + 2.4 + 3 + 3.3 Auto-Scheduling)');
    } else if (fs.existsSync(phase3CalendarSchemaPath)) {
      console.log('✅ Database schema initialized (Phase 1 + 2 + 2.2 + 2.3 + 2.4 + 3 Calendar Intelligence)');
    } else if (fs.existsSync(phase2_4SchemaPath)) {
      console.log('✅ Database schema initialized (Phase 1 + 2 + 2.2 + 2.3 + 2.4 Learning System)');
    } else if (fs.existsSync(phase2_3SchemaPath)) {
      console.log('✅ Database schema initialized (Phase 1 + 2 + 2.2 + 2.3 Smart Response)');
    } else if (fs.existsSync(phase2_2SchemaPath)) {
      console.log('✅ Database schema initialized (Phase 1 + 2 + 2.2 Context Intelligence)');
    } else {
      console.log('✅ Database schema initialized (Phase 1 + 2)');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
}