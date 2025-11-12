import { pool } from '../../src/database/connection';

async function checkUserTables() {
  console.log('🔍 Checking user-related tables structure...\n');

  try {
    // Check user_profiles table
    const userProfilesResult = await pool.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'user_profiles'
      ORDER BY ordinal_position;
    `);

    console.log('📊 user_profiles table structure:');
    console.table(userProfilesResult.rows);

    // Check user_gmail_tokens table
    const gmailTokensResult = await pool.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'user_gmail_tokens'
      ORDER BY ordinal_position;
    `);

    console.log('\n📊 user_gmail_tokens table structure:');
    console.table(gmailTokensResult.rows);

    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUserTables();
