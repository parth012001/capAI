import { pool } from '../src/database/connection';

async function checkColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'user_gmail_tokens'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 user_gmail_tokens columns:');
    console.log('Total columns:', result.rows.length);
    console.log('\n🔍 All columns:');
    result.rows.forEach((row: any) => {
      const length = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
      console.log(`  - ${row.column_name} (${row.data_type}${length})`);
    });

    console.log('\n🎯 Composio-related columns:');
    const composioColumns = result.rows.filter((row: any) => row.column_name.includes('composio'));
    if (composioColumns.length > 0) {
      console.log(`Found ${composioColumns.length} Composio columns:`);
      composioColumns.forEach((row: any) => {
        const length = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
        console.log(`  ✓ ${row.column_name} (${row.data_type}${length})`);
      });
    } else {
      console.log('  ✗ No Composio columns found');
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkColumns();
