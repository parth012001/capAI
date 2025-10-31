/**
 * Check database connections and locks
 */

import { pool } from '../src/database/connection';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkConnections() {
  try {
    console.log('🔍 Checking database connections and activity...\n');

    // Check active connections
    const connectionsQuery = `
      SELECT
        pid,
        usename,
        application_name,
        client_addr,
        state,
        query_start,
        state_change,
        left(query, 60) as current_query
      FROM pg_stat_activity
      WHERE datname = current_database()
      ORDER BY query_start DESC
      LIMIT 10;
    `;

    const connections = await pool.query(connectionsQuery);

    console.log(`📊 Active database connections: ${connections.rows.length}\n`);
    connections.rows.forEach((conn, i) => {
      console.log(`${i + 1}. PID: ${conn.pid}`);
      console.log(`   User: ${conn.usename}`);
      console.log(`   App: ${conn.application_name || 'N/A'}`);
      console.log(`   State: ${conn.state}`);
      if (conn.current_query && !conn.current_query.includes('pg_stat_activity')) {
        console.log(`   Query: ${conn.current_query}...`);
      }
      console.log('');
    });

    // Check for locks on emails table
    console.log('🔒 Checking for locks on emails table...\n');
    const locksQuery = `
      SELECT
        pg_locks.pid,
        pg_stat_activity.usename,
        pg_locks.mode,
        pg_locks.granted,
        pg_class.relname
      FROM pg_locks
      JOIN pg_class ON pg_locks.relation = pg_class.oid
      LEFT JOIN pg_stat_activity ON pg_locks.pid = pg_stat_activity.pid
      WHERE pg_class.relname = 'emails';
    `;

    const locks = await pool.query(locksQuery);

    if (locks.rows.length > 0) {
      console.log(`⚠️  Found ${locks.rows.length} lock(s) on emails table:\n`);
      locks.rows.forEach(lock => {
        console.log(`   PID: ${lock.pid}`);
        console.log(`   User: ${lock.usename}`);
        console.log(`   Mode: ${lock.mode}`);
        console.log(`   Granted: ${lock.granted}`);
        console.log('');
      });
    } else {
      console.log('✅ No locks on emails table\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkConnections();
