import { pool } from '../../src/database/connection';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigration() {
  console.log('🔄 Applying Composio columns migration...\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'add_composio_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    await pool.query(migrationSQL);

    console.log('✅ Migration applied successfully!\n');

    // Verify columns were added
    const verifyResult = await pool.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
        AND column_name IN ('composio_entity_id', 'gmail_connected', 'calendar_connected', 'gmail_connected_at', 'calendar_connected_at')
      ORDER BY column_name;
    `);

    console.log('📊 Verification - New columns in users table:');
    console.table(verifyResult.rows);

    // Check if index was created
    const indexResult = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'users'
        AND indexname = 'idx_users_composio_entity';
    `);

    if (indexResult.rows.length > 0) {
      console.log('\n✅ Index created successfully:');
      console.log(indexResult.rows[0].indexdef);
    } else {
      console.log('\n⚠️  Index not found - may need manual creation');
    }

    console.log('\n✅ Migration complete!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

applyMigration();
