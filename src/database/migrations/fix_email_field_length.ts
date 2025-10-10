import { pool } from '../connection';

/**
 * Migration: Fix email field length issues
 *
 * Problem: from_email and to_email fields are VARCHAR(255), which is too short when:
 * - Multiple recipients are included (comma-separated list)
 * - Display names are included with email addresses
 * - Very long email addresses or domain names
 *
 * Solution: Change VARCHAR(255) to TEXT for email-related fields in:
 * - emails table
 * - promotional_emails table
 */

export async function up() {
  const client = await pool.connect();
  try {
    console.log('🔧 Starting migration: Fix email field length...');

    await client.query('BEGIN');

    // Step 1: Drop the view that depends on from_email column
    console.log('  📝 Dropping meeting_pipeline_detailed view...');
    await client.query(`
      DROP VIEW IF EXISTS meeting_pipeline_detailed;
    `);

    // Step 2: Fix emails table
    console.log('  📝 Altering emails table...');
    await client.query(`
      ALTER TABLE emails
        ALTER COLUMN from_email TYPE TEXT,
        ALTER COLUMN to_email TYPE TEXT;
    `);

    // Step 3: Fix promotional_emails table
    console.log('  📝 Altering promotional_emails table...');
    await client.query(`
      ALTER TABLE promotional_emails
        ALTER COLUMN from_email TYPE TEXT,
        ALTER COLUMN to_email TYPE TEXT;
    `);

    // Step 4: Recreate the view with the updated column types
    console.log('  📝 Recreating meeting_pipeline_detailed view...');
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

    // Verify the changes
    console.log('  ✅ Verifying changes...');
    const result = await client.query(`
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

    console.log('  📊 Column types after migration:');
    result.rows.forEach(row => {
      console.log(`    - ${row.table_name}.${row.column_name}: ${row.data_type}`);
    });

    console.log('✅ Migration completed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function down() {
  const client = await pool.connect();
  try {
    console.log('🔧 Rolling back migration: Fix email field length...');

    await client.query('BEGIN');

    // Rollback emails table (WARNING: This will fail if any data exceeds 255 chars)
    console.log('  📝 Rolling back emails table...');
    await client.query(`
      ALTER TABLE emails
        ALTER COLUMN from_email TYPE VARCHAR(255),
        ALTER COLUMN to_email TYPE VARCHAR(255);
    `);

    // Rollback promotional_emails table
    console.log('  📝 Rolling back promotional_emails table...');
    await client.query(`
      ALTER TABLE promotional_emails
        ALTER COLUMN from_email TYPE VARCHAR(255),
        ALTER COLUMN to_email TYPE VARCHAR(255);
    `);

    await client.query('COMMIT');
    console.log('✅ Rollback completed!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Rollback failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  up()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
