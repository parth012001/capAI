#!/usr/bin/env tsx
/**
 * Database Migration Utility
 * Runs SQL migration files against the database
 */

import { readFileSync } from 'fs';
import path from 'path';
import { pool } from './connection';

async function runMigration(filename: string): Promise<void> {
  try {
    const migrationPath = path.join(__dirname, '../../scripts/database', filename);
    const sql = readFileSync(migrationPath, 'utf8');

    console.log(`🔄 Running migration: ${filename}`);
    await pool.query(sql);
    console.log(`✅ Migration completed: ${filename}`);
  } catch (error) {
    console.error(`❌ Migration failed: ${filename}`, error);
    throw error;
  }
}

async function main() {
  try {
    // Get migration file from command line argument or use default
    const migrationFile = process.argv[2] || 'meeting_draft_enhancement.sql';

    console.log(`🚀 Starting database migration...`);
    console.log(`📁 Migration file: ${migrationFile}`);

    await runMigration(migrationFile);

    console.log(`🎉 All migrations completed successfully!`);
  } catch (error) {
    console.error('❌ Migration process failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { runMigration };