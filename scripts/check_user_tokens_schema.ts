/**
 * Check user_gmail_tokens schema in both databases
 */

import { Pool } from 'pg';

const localPool = new Pool({
  connectionString: 'postgresql://parthahir@localhost:5432/chief_ai',
});

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_ilnjXht8p4zK@ep-empty-feather-adpyzdiz-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    const columnQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'user_gmail_tokens'
      ORDER BY ordinal_position
    `;

    console.log('🔍 user_gmail_tokens columns:\n');

    const localCols = await localPool.query(columnQuery);
    console.log('LOCAL:');
    localCols.rows.forEach(col => console.log(`   - ${col.column_name} (${col.data_type})`));

    console.log('\nNEON:');
    const neonCols = await neonPool.query(columnQuery);
    neonCols.rows.forEach(col => console.log(`   - ${col.column_name} (${col.data_type})`));

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await localPool.end();
    await neonPool.end();
  }
}

checkSchema().catch(console.error);
