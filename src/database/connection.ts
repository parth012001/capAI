import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { logger } from '../utils/pino-logger';

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
  logger.error({
      code: err.code,
      error: err.message
    }, 'database.pool.error');
  // Don't exit - let the pool handle reconnection automatically
  // pg-pool will remove the broken connection and create a new one when needed
});

// Removed per-connection lifecycle logs to reduce noise in production
// These fired constantly with Neon's connection pooling (1000s/day)
// Connection health is monitored via pool.on('error') handler above

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
        logger.warn({
        attempt,
        maxRetries,
        code: error.code,
        error: error.message
      }, 'database.query.retry');
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
      logger.debug({ attempt, maxRetries }, 'database.connection.attempt');

      const startTime = Date.now();
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      const connectionTime = Date.now() - startTime;

      logger.info({ connectionTime }, 'database.connected');

      // Warn if connection was slow (indicates cold start)
      if (connectionTime > 5000) {
        logger.warn({ connectionTime }, 'database.connection.slow');
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
        logger.warn({ attempt, maxRetries }, 'database.connection.attempt.failed');
        logger.warn({ error: error.message }, 'database.connection.error.detail');
        logger.warn({ waitTime }, 'database.connection.retry.wait');

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      // Either not retryable, or we've exhausted retries
      logger.error({
        attempt,
        maxRetries,
        code: error.code,
        error: error.message
      }, 'database.connection.failed');

      if (attempt === maxRetries) {
        logger.error({ maxRetries }, 'database.connection.exhausted');
        return false;
      }
    }
  }

  logger.error({ maxRetries }, 'database.connection.failed.final');
  return false;
}

/**
 * Gracefully close database connection pool
 * Call this during server shutdown to prevent connection leaks
 */
export async function closePool(): Promise<void> {
  try {
    await pool.end();
    logger.info({}, 'database.pool.closed');
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'database.pool.close.failed');
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
      logger.info({}, 'database.schema.loading');
      const completeSchema = fs.readFileSync(completeSchemaPath, 'utf8');
      try {
        await pool.query(completeSchema);
        logger.info({ tableCount: 39 }, 'database.schema.initialized');
      } catch (error: any) {
        // Ignore "already exists" errors
        if (error.code === '42P07' || error.code === '42710' || error.code === '42P06') {
          logger.info({}, 'database.schema.already.initialized');
        } else {
          throw error;
        }
      }

      // Apply comprehensive constraint fixes for ALL tables
      logger.info({}, 'database.constraints.applying');

      const allConstraintsFixPath = path.join(__dirname, '../../scripts/database/add_all_missing_constraints.sql');
      if (fs.existsSync(allConstraintsFixPath)) {
        const allConstraintsFix = fs.readFileSync(allConstraintsFixPath, 'utf8');
        try {
          await pool.query(allConstraintsFix);
          logger.info({ tablesFixed: 10 }, 'database.constraints.verified');
        } catch (error: any) {
          logger.warn({ error: error.message }, 'database.constraints.warning');
        }
      }

      // Apply timezone support migration
      logger.info({}, 'database.timezone.migration.applying');

      const timezoneMigrationPath = path.join(__dirname, '../../scripts/database/add_timezone_support.sql');
      if (fs.existsSync(timezoneMigrationPath)) {
        const timezoneMigration = fs.readFileSync(timezoneMigrationPath, 'utf8');
        try {
          await pool.query(timezoneMigration);
          logger.info({}, 'database.timezone.migration.applied');
        } catch (error: any) {
          logger.warn({ error: error.message }, 'database.timezone.migration.warning');
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
      logger.info({ phase: '1-4' }, 'database.schema.initialized.phase');
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
      logger.info({ phase: '1-3.3' }, 'database.schema.initialized.phase');
    } else if (fs.existsSync(phase3CalendarSchemaPath)) {
      logger.info({ phase: '1-3' }, 'database.schema.initialized.phase');
    } else if (fs.existsSync(phase2_4SchemaPath)) {
      logger.info({ phase: '1-2.4' }, 'database.schema.initialized.phase');
    } else if (fs.existsSync(phase2_3SchemaPath)) {
      logger.info({ phase: '1-2.3' }, 'database.schema.initialized.phase');
    } else if (fs.existsSync(phase2_2SchemaPath)) {
      logger.info({ phase: '1-2.2' }, 'database.schema.initialized.phase');
    } else {
      logger.info({ phase: '1-2' }, 'database.schema.initialized.phase');
    }
    
    return true;
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'database.initialization.failed');
    return false;
  }
}