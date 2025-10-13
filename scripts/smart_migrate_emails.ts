/**
 * Smart migration - auto-detects columns
 */

import { Pool } from 'pg';

const localPool = new Pool({
  connectionString: 'postgresql://parthahir@localhost:5432/chief_ai',
});

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_ilnjXht8p4zK@ep-empty-feather-adpyzdiz-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function getTableColumns(pool: Pool, tableName: string): Promise<string[]> {
  const result = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = $1 AND table_schema = 'public'
    ORDER BY ordinal_position
  `, [tableName]);

  return result.rows.map(r => r.column_name);
}

async function migrateTable(tableName: string, clearFirst: boolean = true) {
  console.log(`\n📦 Migrating ${tableName}...`);

  try {
    // Get columns that exist in BOTH databases
    const localCols = await getTableColumns(localPool, tableName);
    const neonCols = await getTableColumns(neonPool, tableName);

    // Only use columns that exist in both
    const commonCols = localCols.filter(col => neonCols.includes(col));

    // Exclude embedding column (only in Neon)
    const migrateColumns = commonCols.filter(col => col !== 'embedding');

    if (migrateColumns.length === 0) {
      console.log(`   ⚠️  No common columns found`);
      return;
    }

    // Fetch data from local
    const localData = await localPool.query(`SELECT * FROM ${tableName}`);

    if (localData.rows.length === 0) {
      console.log(`   ⚠️  No data to migrate`);
      return;
    }

    // Clear Neon table if requested
    if (clearFirst) {
      await neonPool.query(`TRUNCATE TABLE ${tableName} CASCADE`);
    }

    // Migrate each row
    let migrated = 0;
    for (const row of localData.rows) {
      const values = migrateColumns.map(col => row[col]);
      const placeholders = migrateColumns.map((_, i) => `$${i + 1}`).join(', ');
      const columnList = migrateColumns.join(', ');

      await neonPool.query(
        `INSERT INTO ${tableName} (${columnList}) VALUES (${placeholders})`,
        values
      );

      migrated++;
      if (migrated % 100 === 0) {
        console.log(`   📊 Progress: ${migrated}/${localData.rows.length}...`);
      }
    }

    console.log(`   ✅ Migrated ${localData.rows.length} rows`);

  } catch (error: any) {
    console.error(`   ❌ Failed: ${error.message}`);
    throw error;
  }
}

async function smartMigrate() {
  console.log('🚀 SMART DATA MIGRATION: LOCAL → NEON\n');
  console.log('='.repeat(60));

  try {
    // Migrate in order of dependencies
    await migrateTable('user_gmail_tokens');
    await migrateTable('email_threads');
    await migrateTable('sender_profiles');
    await migrateTable('emails');
    await migrateTable('promotional_emails');

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 VERIFICATION:\n');

    // Verify counts
    const tables = ['user_gmail_tokens', 'email_threads', 'emails', 'promotional_emails'];

    for (const table of tables) {
      const localCount = await localPool.query(`SELECT COUNT(*) FROM ${table}`);
      const neonCount = await neonPool.query(`SELECT COUNT(*) FROM ${table}`);

      const match = localCount.rows[0].count === neonCount.rows[0].count ? '✅' : '⚠️';
      console.log(`   ${match} ${table}: LOCAL ${localCount.rows[0].count} → NEON ${neonCount.rows[0].count}`);
    }

    console.log('\n✅✅✅ MIGRATION COMPLETE! ✅✅✅\n');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    await localPool.end();
    await neonPool.end();
  }
}

smartMigrate().catch(console.error);
