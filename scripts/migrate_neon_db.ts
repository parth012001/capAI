import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

/**
 * Safe migration script for Neon production database
 * This script will ONLY alter column types - no data will be deleted
 * It's safe to run multiple times (idempotent)
 */

async function migrateNeonDatabase() {
  // Use command line argument or environment variable
  const NEON_URL = process.argv[2] || process.env.NEON_DATABASE_URL;

  if (!NEON_URL) {
    console.error('❌ Error: Neon database URL not provided');
    console.log('💡 Usage: npx tsx scripts/migrate_neon_db.ts "postgresql://..."');
    console.log('💡 Or set NEON_DATABASE_URL in your .env.local file');
    process.exit(1);
  }

  const DATABASE_URL = NEON_URL;

  console.log('🔗 Connecting to database...');
  console.log(`📍 Host: ${new URL(DATABASE_URL).host}`);

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Test connection
    console.log('🧪 Testing database connection...');
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Connected successfully at:', testResult.rows[0].now);

    // Check current column types
    console.log('\n📊 Checking current column types...');
    const currentTypes = await pool.query(`
      SELECT
        table_name,
        column_name,
        data_type,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name IN ('emails', 'promotional_emails')
        AND column_name IN ('from_email', 'to_email')
      ORDER BY table_name, column_name;
    `);

    console.log('Current column types:');
    currentTypes.rows.forEach(row => {
      const typeInfo = row.character_maximum_length
        ? `${row.data_type}(${row.character_maximum_length})`
        : row.data_type;
      console.log(`  - ${row.table_name}.${row.column_name}: ${typeInfo}`);
    });

    // Check if migration is needed
    const needsMigration = currentTypes.rows.some(row =>
      row.data_type === 'character varying' && row.character_maximum_length === 255
    );

    if (!needsMigration) {
      console.log('\n✅ Migration not needed - columns are already TEXT type!');
      await pool.end();
      return;
    }

    console.log('\n🔧 Starting migration...');
    console.log('⚠️  This will take a few seconds. DO NOT INTERRUPT.');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Step 1: Drop dependent view
      console.log('  📝 Step 1/4: Dropping meeting_pipeline_detailed view (if exists)...');
      await client.query(`DROP VIEW IF EXISTS meeting_pipeline_detailed;`);

      // Step 2: Alter emails table
      console.log('  📝 Step 2/4: Altering emails table columns...');
      await client.query(`
        ALTER TABLE emails
          ALTER COLUMN from_email TYPE TEXT,
          ALTER COLUMN to_email TYPE TEXT;
      `);

      // Step 3: Alter promotional_emails table
      console.log('  📝 Step 3/4: Altering promotional_emails table columns...');
      await client.query(`
        ALTER TABLE promotional_emails
          ALTER COLUMN from_email TYPE TEXT,
          ALTER COLUMN to_email TYPE TEXT;
      `);

      // Step 4: Recreate view
      console.log('  📝 Step 4/4: Recreating meeting_pipeline_detailed view...');
      await client.query(`
        CREATE OR REPLACE VIEW meeting_pipeline_detailed AS
        SELECT
          mpr.id,
          mpr.gmail_id,
          mpr.user_id,
          mpr.is_meeting_request,
          mpr.confidence,
          mpr.processing_time_ms,
          mpr.status,
          mpr.reason,
          mpr.processed_at,
          e.subject,
          e.from_email,
          e.received_at,
          mr.meeting_type,
          mr.urgency_level,
          mr.requested_duration,
          mr.status as meeting_status
        FROM meeting_processing_results mpr
        JOIN emails e ON mpr.email_db_id = e.id
        LEFT JOIN meeting_requests mr ON mr.email_id = e.id AND mr.user_id = mpr.user_id
        ORDER BY mpr.processed_at DESC;
      `);

      await client.query('COMMIT');
      console.log('✅ Transaction committed successfully');

      // Verify the changes
      console.log('\n📊 Verifying migration...');
      const verifyResult = await pool.query(`
        SELECT
          table_name,
          column_name,
          data_type,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_name IN ('emails', 'promotional_emails')
          AND column_name IN ('from_email', 'to_email')
        ORDER BY table_name, column_name;
      `);

      console.log('Updated column types:');
      verifyResult.rows.forEach(row => {
        console.log(`  ✅ ${row.table_name}.${row.column_name}: ${row.data_type}`);
      });

      console.log('\n🎉 Migration completed successfully!');
      console.log('✅ Your production database is now updated.');

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Migration failed - transaction rolled back');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('\n❌ Error during migration:', error);
    console.error('\n⚠️  Your database was NOT modified. The error occurred before any changes were made.');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
console.log('🚀 Neon Database Migration Tool');
console.log('================================\n');

migrateNeonDatabase()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  });
