import { pool, closePool } from '../../src/database/connection';

async function checkAllColumns() {
  try {
    console.log('🔍 Listing ALL columns in user_gmail_tokens table (Neon DB)...\n');

    const result = await pool.query(`
      SELECT
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'user_gmail_tokens'
      ORDER BY ordinal_position
    `);

    if (result.rows.length === 0) {
      console.log('❌ Table not found or has no columns\n');
    } else {
      console.log(`✅ Found ${result.rows.length} columns:\n`);

      result.rows.forEach((col, i) => {
        console.log(`${i + 1}. ${col.column_name}`);
        console.log(`   Type: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}`);
        console.log(`   Nullable: ${col.is_nullable}`);
        console.log(`   Default: ${col.column_default || 'NULL'}`);
        console.log('');
      });

      // Check for Composio-related columns
      const composioRelated = result.rows.filter(col =>
        col.column_name.toLowerCase().includes('composio') ||
        col.column_name.toLowerCase().includes('auth') ||
        col.column_name.toLowerCase().includes('migration') ||
        col.column_name.toLowerCase().includes('entity')
      );

      if (composioRelated.length > 0) {
        console.log('\n🔎 Composio-related columns found:');
        composioRelated.forEach(col => console.log(`   - ${col.column_name}`));
      } else {
        console.log('\n❌ NO Composio-related columns found (composio, auth, migration, entity)');
      }
    }

    await closePool();
  } catch (error) {
    console.error('❌ Error:', error);
    await closePool();
    process.exit(1);
  }
}

checkAllColumns();
