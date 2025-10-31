/**
 * Verify if Composio columns exist in Neon database
 */

import { pool } from '../src/database/connection';
import * as dotenv from 'dotenv';

dotenv.config();

async function verifyComposioSchema() {
  try {
    console.log('🔍 Checking if Composio columns exist in Neon database...\n');

    // Check table columns
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'user_gmail_tokens'
      ORDER BY ordinal_position;
    `;
    const columnsResult = await pool.query(columnsQuery);

    console.log('📋 Columns in user_gmail_tokens table:\n');
    columnsResult.rows.forEach(row => {
      const nullable = row.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)';
      console.log(`   ${row.column_name}: ${row.data_type} ${nullable}`);
    });

    // Check if Composio columns exist
    const hasComposioEntityId = columnsResult.rows.some(r => r.column_name === 'composio_entity_id');
    const hasAuthMethod = columnsResult.rows.some(r => r.column_name === 'auth_method');

    console.log('\n');
    if (hasComposioEntityId && hasAuthMethod) {
      console.log('✅ Composio columns exist!\n');

      // Check sample data
      const dataQuery = `
        SELECT user_id, gmail_address, auth_method, composio_entity_id
        FROM user_gmail_tokens
        LIMIT 5;
      `;
      const dataResult = await pool.query(dataQuery);

      if (dataResult.rows.length > 0) {
        console.log('📊 Sample data:\n');
        dataResult.rows.forEach((row, i) => {
          console.log(`${i + 1}. ${row.gmail_address}`);
          console.log(`   Auth: ${row.auth_method || 'NULL'}`);
          console.log(`   Entity ID: ${row.composio_entity_id || 'NULL'}\n`);
        });
      }
    } else {
      console.log('❌ Composio columns are MISSING!\n');
      console.log('Missing columns:');
      if (!hasComposioEntityId) console.log('   - composio_entity_id');
      if (!hasAuthMethod) console.log('   - auth_method');
      console.log('\nYou need to run: npx tsx scripts/database/apply-composio-migration.ts\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

verifyComposioSchema();
