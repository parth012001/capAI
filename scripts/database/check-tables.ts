import { pool } from '../../src/database/connection';

async function checkTables() {
  console.log('🔍 Checking database tables...\n');

  try {
    // List all tables in the public schema
    const result = await pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    console.log(`Found ${result.rows.length} tables:\n`);
    result.rows.forEach(row => {
      console.log(`  - ${row.tablename}`);
    });

    // Check if users table exists specifically
    const usersCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'users'
      );
    `);

    console.log(`\nUsers table exists: ${usersCheck.rows[0].exists}`);

    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTables();
